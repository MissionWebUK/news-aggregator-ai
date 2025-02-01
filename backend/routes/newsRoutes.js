const express = require("express");
const newsController = require("../controllers/newsController"); // Import controller

const router = express.Router();

// Define the route using the controller
router.get("/news", newsController.getNews);

module.exports = router;