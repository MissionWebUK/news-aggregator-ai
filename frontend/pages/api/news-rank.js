// File: frontend/pages/api/news-rank.js

import { getSession } from "next-auth/react";
import { prisma } from "../../lib/prisma";
import axios from "axios";
import Redis from "ioredis";

// Initialize Redis for caching + rate limiting
const redis = new Redis(process.env.REDIS_URL);

// Hugging Face API Config
const HF_API_URL = process.env.HF_API_URL;
const HF_API_KEY = process.env.HF_API_KEY;

// ---------------------------------------------------------------------
// 1. Simple per-user rate limiting with Redis
// ---------------------------------------------------------------------
async function isRateLimited(email) {
  // Each user gets up to 10 requests per 5 minutes
  const key = `rl:${email}`;
  
  // Increment usage count
  const usage = await redis.incr(key);
  // If it's the first request in this window, set expiry for 5 minutes (300 seconds)
  if (usage === 1) {
    await redis.expire(key, 300);
  }
  
  // If usage exceeds 10 in 5 minutes, block
  return usage > 10;
}

// ---------------------------------------------------------------------
// 2. Hugging Face Ranking with Fewer Retries (maxRetries = 3)
// ---------------------------------------------------------------------
async function fetchHuggingFaceRanking(texts, prompt, maxRetries = 3, delay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      //console.log(`🔍 [HuggingFace] Attempt ${attempt}/${maxRetries}`);
      
      const hfResponse = await axios.post(
        HF_API_URL,
        {
          // Use categories + keywords in the source_sentence
          source_sentence: prompt,
          sentences: texts,
        },
        {
          headers: { Authorization: `Bearer ${HF_API_KEY}` },
          timeout: 15000,
        }
      );

      // Check for valid response format
      if (!hfResponse.data || !Array.isArray(hfResponse.data)) {
        throw new Error("Invalid response format from Hugging Face API");
      }

      // console.log(hfResponse.data);
      // Data format: [ [score], [score], ... ] – we map to extract the numeric value
      //console.log(hfResponse.data.map((result) => result[0]));
      
      return hfResponse.data;

    } catch (error) {
      // Decide whether to retry
      const shouldRetry =
        error.code === "ENOTFOUND" ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.response?.status === 503 ||
        (error.response?.status === 429 && attempt < maxRetries);

      if (shouldRetry) {
        const waitTime = Math.min(delay * attempt, 15000); // Cap max delay to 15s
        console.warn(`⏳ Retrying in ${waitTime / 1000}s due to: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        console.error("❌ Fatal Hugging Face API Error:", error.response?.data || error);
        throw error; // Give up permanently
      }
    }
  }
  throw new Error("Hugging Face API failed after multiple attempts");
}

// ---------------------------------------------------------------------
// 3. The Main Handler
// ---------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Check user session
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Per-user rate limiting
    const isLimited = await isRateLimited(session.user.email);
    if (isLimited) {
      return res
        .status(429)
        .json({ error: "Too many requests, please try again later." });
    }

    // Fetch user + preferences
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { preferences: true },
    });

    //if (!user || !user.preferences) {
     //return res.status(404).json({ error: "User preferences not found" });
    //}

    // Combine categories + keywords into one string for ranking
    const categories = user.preferences.categories || [];
    const keywords = user.preferences.keywords || [];
    // Example: "categories: tech finance, keywords: blockchain AI"
    const combinedPrefs = `Categories: ${categories.join(" ")}; Keywords: ${keywords.join(" ")}`;

    // Check Redis cache
    const cacheKey = `ranked-news:${session.user.email}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      // Return cached data if it exists
      return res.status(200).json(JSON.parse(cachedData));
    }

    // Fetch recent articles
    const articles = await prisma.newsArticle.findMany({
      where: {
        // Only consider articles from the last 3 days (72 hours)
        publishedAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      },
      // Sort by most recent
      orderBy: { publishedAt: "desc" },
    });

    // If no articles found, return empty array
    if (!articles.length) {
      return res.status(200).json({ articles: [] });
    }

    // Prepare the text array for ranking
    const texts = articles.map(
      (article) => `${article.title} ${article.summary || ""}`
    );

    // Call the Hugging Face API
    const scores = await fetchHuggingFaceRanking(texts, combinedPrefs, 3);

    // console.log(scores);

    // Attach relevance & sort
    const rankedArticles = articles
      .map((article, i) => ({
        ...article,
        relevance: scores[i],
      }))
      .sort((a, b) => b.relevance - a.relevance);

      // console.log(rankedArticles);

    // Cache in Redis for 10 minutes
    await redis.set(
      cacheKey,
      JSON.stringify({ articles: rankedArticles }),
      "EX",
      600
    );

    return res.status(200).json({ articles: rankedArticles });
  } catch (error) {
    console.error("❌ Error in news-rank handler:", error.response?.data || error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}