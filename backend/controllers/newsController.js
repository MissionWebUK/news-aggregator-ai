require("dotenv").config({ path: "./config/.env" });
const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const NodeCache = require("node-cache");
const summarizer = require("../services/summarization/summarizer"); // Import summarization module
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// ✅ Initialize cache (TTL = 10 minutes)
const cache = new NodeCache({ stdTTL: 600 });

// Retry request up to 3 times if it fails
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// ✅ Fetch news articles from NewsAPI and summarize them
exports.getNews = async (req, res) => {
  try {
    const { query } = req.query || "technology";
    const cacheKey = `news_${query}`;

    // Return cached response if available
    if (cache.has(cacheKey)) {
      return res.json({ articles: cache.get(cacheKey) });
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

    //console.log("Articles before summarization:", articles); // ✅ Debugging output
    
    // Generate summaries for all articles
    let summaries = await summarizer.summarizeBatch(articles);

    //console.log("Raw summaries response:", summaries); // ✅ Debugging output

    // ✅ Store in cache
    cache.set(cacheKey, summaries);
    
    // If articles is a string, parse it into an array
    if (typeof summaries === "string") {
      try {
        summaries = JSON.parse(summaries);
      } catch (error) {
        console.error("Error parsing summaries JSON:", error);
        return res.status(500).json({ message: "Error parsing summaries", error: error.toString(), articles: [] });
      }
    }

    // console.log("Formatted Summaries:", summaries); // ✅ Log final summaries
    res.json({ articles: summaries }); // ✅ Send properly formatted JSON
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ message: "Error fetching news", error: error.toString(), articles: [] });
  }
};