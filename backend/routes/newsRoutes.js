// File: backend/routes/newsRoutes.js

// Import the express module
import express from "express";
// Import the getDbNews and getRankedNews functions from the newsController.js file
import { getDbNews, getRankedNews } from "../controllers/newsController.js";
// Import the ensureAuthenticated function from the authMiddleware.js file
import { ensureAuthenticated } from "../middleware/authMiddleware.js";

// Create a new express router
const router = express.Router();

// -------------------- SIMPLE IN-MEMORY CACHE -------------------- //

// Cache object to store the latest news data
let newsCache = {
  data: null,
  timestamp: 0,
};

// Cache for 1 minute
const CACHE_DURATION_MS = 60 * 1000; 

// -------------------- PUBLIC ROUTE: GET /news -------------------- //

// Define a GET route for /news
router.get("/news", async (req, res, next) => {
  try {
    //console.info("📡 [GET /news] Checking cache...");

    // Is this cache setup necessary? And is it tuned correctly?

    const now = Date.now();
    // If cached data is valid and not stale, return it
    if (newsCache.data && now - newsCache.timestamp < CACHE_DURATION_MS) {
      // console.info("🗂 [GET /news] Returning cached data");
      return res.json(newsCache.data);
    }

    console.info("📡 [GET /news] Fetching articles from the DB...");
    const articles = await getDbNews(); // <-- Our new DB fetch function

    // Update the cache
    newsCache = {
      data: { articles }, // store the object with "articles" key
      timestamp: now,
    };

    return res.json({ articles });
  } catch (error) {
    console.error("❌ [GET /news] Error:", error);
    next(error);
  }
});

// -------------------- PROTECTED ROUTE: GET /news-rank -------------------- //

// Define a GET route for /news-rank
router.get("/news-rank", ensureAuthenticated, async (req, res, next) => {

  // Do we need to implement the cache here same as the route above?
  
  try {
    // console.info("📡 [GET /news-rank] Fetching AI-ranked news...");
    // getRankedNews() presumably reads from DB where relevance is set
    await getRankedNews(req, res);
  
  } catch (error) {
    console.error("❌ [GET /news-rank] Error:", error);
    next(error);
  }
});

export const newsRoutes = router;