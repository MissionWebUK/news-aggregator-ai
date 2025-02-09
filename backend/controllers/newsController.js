// File: newsController.js

// ✅ Import required environment variables
import dotenv from "dotenv";
dotenv.config({ path: "./config/.env" });

// ✅ Import required modules
import axios from "axios";
import axiosRetry from "axios-retry";
import NodeCache from "node-cache";
import path from "path"; // Potentially unused now, but left here in case you need it
import sanitizeHtml from "sanitize-html"; // Potentially unused now, but left here in case you sanitize in the future
import { MongoClient } from "mongodb";
import cron from "node-cron";
import fetch from "node-fetch";
import { spawn } from "child_process";
import { summarizeBatch } from "../services/summarization/summarizer.js";

// ✅ Environment variables
const NEWS_API_URL = process.env.NEWS_API_URL;   // Used by cron job
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "userdb";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "NewsArticle";

// Blocked sources to filter out - Do we need a separate table for this? 
const BLOCKED_SOURCES = ["dealcatcher.com"];

// ✅ Initialize MongoDB Client
const client = new MongoClient(MONGO_URI, {});
await client.connect();
const db = client.db(DB_NAME);
const collection = db.collection(COLLECTION_NAME);

// ✅ Initialize cache (TTL = 10 minutes)

// The cache is used to store the results of the getNews function for a certain period of time to avoid making the same request multiple times.
const cache = new NodeCache({ stdTTL: 600 });

// Add retry logic to Axios
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

/**
 * Checks if a given article URL already exists in MongoDB.
 */
async function articleExists(url) {
  return !!(await collection.findOne({ url }, { projection: { _id: 1 } }));
}

/* -----------------------------------------------------------------------------
    1. CRON JOBs to fetch NewsAPI & RSS articles in the background
    - Summarizes them
    - Inserts new articles into MongoDB
   ----------------------------------------------------------------------------- */

  //Should we move the CRON job in app.js here?

// Fetch NewsAPI articles
async function fetchNewsAPI() {
  console.log("🔄 [CRON] Fetching latest news from API...");

  // If NEWS_API_URL is missing, abort
  if (!NEWS_API_URL || NEWS_API_URL.trim() === "") {
    console.error("❌ ERROR: Missing NEWS_API_URL in environment variables!");
    return;
  }

  try {
    // 1. Fetch from NewsAPI
    const response = await fetch(NEWS_API_URL.trim());
    if (!response.ok) {
      throw new Error(`NewsAPI responded with HTTP ${response.status}`);
    }

    const data = await response.json();

    // 2. Validate articles
    if (!data.articles || !Array.isArray(data.articles)) {
      console.warn("⚠️ No articles array found or format error in API response");
      return;
    }

    // Filter out blocked sources
    const rawArticles = data.articles.filter((article) => {
      const sourceName = article.source?.name?.toLowerCase() ?? "";
      return !BLOCKED_SOURCES.includes(sourceName);
    });

    if (!rawArticles.length) {
      console.log("⚠️ No articles after filtering blocked sources.");
      return;
    }

    // 3. Summarize each article
    const summaries = await summarizeBatch(
      rawArticles.map((article) => article.title + " " + (article.description || ""))
    );

    rawArticles.forEach((article, i) => {
      article.summary = summaries[i] || article.description || "No summary available.";
    });

    // 4. Check duplicates and build a list of new articles
    const newArticles = [];
    for (const article of rawArticles) {
      const exists = await articleExists(article.url);
      if (!exists) {
        newArticles.push({
          title: article.title ?? "No Title",
          url: article.url,
          source: article.source?.name ?? "Unknown",
          publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
          summary: article.summary || article.description || "No summary available.",
          urlToImage: article.urlToImage || null,
        });
      }
    }

    // 5. Insert only new articles
    if (newArticles.length > 0) {
      await collection.insertMany(newArticles, { ordered: false });
      console.log(`✅ Inserted ${newArticles.length} new articles from NewsAPI into MongoDB`);
    } else {
      console.log("⚠️ No new articles to insert from NewsAPI.");
    }
  } catch (error) {
    console.error("❌ Error fetching or inserting NewsAPI articles:", error);
  }
}

// Fetch RSS articles
async function fetchNewsRSS() {
  console.log("🔄 Running RSS Fetcher...");

  // Spawn a child process to run the Python script
  const pythonProcess = spawn("python3", ["services/rss_fetcher.py"]);

  // Log output from the Python script
  //pythonProcess.stdout.on("data", (data) => {
    //console.log(`✅ RSS Fetch Output:\n${data}`);
  //});

  // Log errors from the Python script
  pythonProcess.stderr.on("data", (data) => {
    console.error(`❌ RSS Fetch Error:\n${data}`);
  });

  // Log when the Python script exits
  pythonProcess.on("close", (code) => {
    if (code !== 0) {
      console.error(`❌ RSS Fetch process exited with code ${code}`);
      return;
    }
    console.log(`RSS Fetch process completed successfully`);
  });
}

// ✅ Schedule the cron job to fetch NewsAPI articles every 30 minutes
cron.schedule("*/30 * * * *", fetchNewsAPI);
cron.schedule("*/30 * * * *", fetchNewsRSS)

/* -----------------------------------------------------------------------------
    2. getDbNews()
    - Fetch the 50 most recent articles from the DB
    - We can also apply filtering or summarizing if needed
 ----------------------------------------------------------------------------- */
export async function getDbNews() {
  try {
    // Sort by publishedAt descending, limit 50
    const articles = await collection
      .find({})
      .sort({ publishedAt: -1 })
      .toArray();
    return articles;
  } catch (error) {
    console.error("❌ Error in getDbNews:", error);
    throw error; // Let the caller handle the error
  }
}

/* -----------------------------------------------------------------------------
    3. getRankedNews()
    - Returns articles with a 'relevance' field, sorted descending
 ----------------------------------------------------------------------------- */
export async function getRankedNews(req, res) {
  try {
    const rankedArticles = await collection
      .find({ relevance: { $exists: true } })
      .sort({ relevance: -1 })
      .limit(50)
      .toArray();

    res.json({ articles: rankedArticles });
  } catch (error) {
    console.error("❌ Error fetching ranked news:", error);
    res.status(500).json({
      message: "Error fetching ranked news",
      error: error.toString(),
    });
  }
}