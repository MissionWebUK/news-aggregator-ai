require("dotenv").config({ path: "./config/.env" });
const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const NodeCache = require("node-cache");
const path = require("path");
const sanitizeHtml = require("sanitize-html");
const summarizer = require("../services/summarization/summarizer"); // Import summarization module
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// ✅ Initialize cache (TTL = 10 minutes)
const cache = new NodeCache({ stdTTL: 600 });

// Retry request up to 3 times if it fails
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// ✅ Blocked sources list (you can add more here)
const BLOCKED_SOURCES = ["dealcatcher.com"];

// ✅ Fetch news articles from NewsAPI and summarize them
exports.getNews = async (req, res) => {
  try {
    const { query } = req.query || "technology";
    const cacheKey = `news_${query}`;

    // Return cached response if available
    if (cache.has(cacheKey)) {
      console.log("✅ Returning cached data");
      return res.json({ articles: cache.get(cacheKey) });
    } else {
      console.log("⚠️ No cache found, fetching fresh news...");
    }
    
    //console.log("Fetching news for query:", query); // ✅ Debugging output

    // Fetch news articles from NewsAPI
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: { q: query, 
                apiKey: NEWS_API_KEY,
                pageSize: 20,  // ✅ Limit to 20 most recent articles
                sortBy: "publishedAt", // ✅ Ensure most recent articles
                language: "en" } // ✅ Ensure English articles
    });

    //console.log("Raw API Response from NewsAPI:", response.data); // ✅ Debugging output

    if (!response.data.articles || !Array.isArray(response.data.articles)) {
      console.log("No articles found or incorrect format.");
      return res.status(404).json({ message: "No articles found", articles: [] });
    }

    let articles = response.data.articles;

    // ✅ Filter out unwanted sources
    articles = articles.filter(article => {
      return !BLOCKED_SOURCES.includes(article.source?.name?.toLowerCase());
    });

    let newsApiArticles = articles;

    const { spawn } = require("child_process");

    const getRSSArticles = () => {
      return new Promise((resolve, reject) => {
        console.log("🚀 Fetching RSS articles from Python script...");
        const scriptPath = path.join(__dirname, "../services/rss_fetcher.py");
        const pythonProcess = spawn("python3", [scriptPath]);
        let data = "";
        let errorMsg = "";
        pythonProcess.stdout.on("data", (chunk) => (data += chunk));
        pythonProcess.stderr.on("data", (chunk) => (errorMsg += chunk));

        pythonProcess.on("close", (code) => {
          if (code !== 0) {
            console.error(`❌ Python script exited with code ${code}`);
            console.error(`🐍 Python Error: ${errorMsg}`);
            return reject(new Error(`RSS fetcher exited with code ${code}`));
          } try {
            const parsedData = JSON.parse(data);
            // console.log("✅ RSS Articles Fetched:", parsedData);
            resolve(parsedData);
          } catch (error) {
            console.error("❌ JSON Parsing Error:", error);
            reject(error);
          }
        });
      });
    };

    const rssArticles = await getRSSArticles();

    // ✅ Combine NewsAPI + RSS articles
    let combinedArticles = [...newsApiArticles, ...rssArticles];
    //console.log("Articles before summarization:", articles); // ✅ Debugging output
    
    // Generate summaries for all articles
    // ✅ Extract content to summarize
    let contentToSummarize = combinedArticles
      .map(article => {
        let rawText = article.summary || article.description || "No content available.";
        return sanitizeHtml(rawText, { allowedTags: [], allowedAttributes: {} }).trim(); // ✅ Remove HTML
      })
      .filter(text => typeof text === "string" && text.length > 5); // ✅ Remove empty/invalid entries

    // ✅ Debug: Print extracted text before sending to summarizer
    // console.log("📝 Texts Sent to Summarizer:", JSON.stringify(contentToSummarize, null, 2));

    // ✅ Ensure all items have "content"
    const formattedArticles = contentToSummarize.map(article => ({
      content: article,
    }));

    const summaries = await Promise.race([
      summarizer.summarizeBatch(formattedArticles),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Summarization Timeout")), 40000)) // ✅ 15 sec timeout
  ]);

    //console.log("Raw summaries response:", summaries); // ✅ Debugging output
    
    // If articles is a string, parse it into an array
    if (typeof summaries === "string") {
      try {
        summaries = JSON.parse(summaries);
      } catch (error) {
        console.error("Error parsing summaries JSON:", error);
        return res.status(500).json({ message: "Error parsing summaries", error: error.toString(), articles: [] });
      }
    }

    const getDomainFromUrl = (url) => {
      try {
        return new URL(url).hostname.replace("www.", "");
      } catch (error) {
        return "Unknown Source";
      }
    };

    let enrichedArticles = combinedArticles.map((article, index) => ({
      title: article.title,
      source: article.source?.name || getDomainFromUrl(article.url) || "Unknown Source",
      publishedAt: article.publishedAt,
      urlToImage: article.urlToImage || "https://media.istockphoto.com/id/1452662817/vector/no-picture-available-placeholder-thumbnail-icon-illustration-design.jpg?s=612x612&w=0&k=20&c=bGI_FngX0iexE3EBANPw9nbXkrJJA4-dcEJhCrP8qMw=",  // ✅ Fix for missing images
      url: article.url,
      summary: summaries[index] || "Summary unavailable",
    }));

    // ✅ Store enriched articles in cache
    cache.set(cacheKey, enrichedArticles);
    console.log("✅ Cached new enriched articles");

    // console.log("Formatted Summaries:", summaries); // ✅ Log final summaries
    res.json({ articles: enrichedArticles }); // ✅ Send properly formatted JSON
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ message: "Error fetching news", error: error.toString(), articles: [] });
  }
};