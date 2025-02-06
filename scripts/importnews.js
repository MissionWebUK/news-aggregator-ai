import { prisma } from "../frontend/lib/prisma.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

async function fetchNews() {
  console.log("🚀 Fetching news articles...");

  try {
    const response = await fetch("https://newsapi.org/v2/top-headlines?category=technology&apiKey=" + process.env.NEWS_API_KEY);
    const data = await response.json();

    if (!data.articles || data.articles.length === 0) {
      console.error("❌ No articles found.");
      return;
    }

    console.log(`✅ Retrieved ${data.articles.length} articles.`);

    for (const article of data.articles) {
      try {
        // ✅ Use `findFirst()` instead of `findUnique()`
        const existingArticle = await prisma.newsArticle.findFirst({
          where: { url: article.url },
        });

        if (existingArticle) {
          console.log(`⚠️ Skipping duplicate: ${article.title}`);
          continue;
        }

        // ✅ Insert article into database
        await prisma.newsArticle.create({
          data: {
            title: article.title,
            url: article.url,
            source: article.source.name || "Unknown",
            publishedAt: new Date(article.publishedAt),
            content: article.content || null,
            keywords: article.keywords || [],
            category: article.category || "general",
          },
        });

        console.log(`✅ Inserted: ${article.title}`);
      } catch (insertError) {
        console.error(`❌ Error inserting article: ${insertError.message}`);
      }
    }
  } catch (error) {
    console.error("❌ Error fetching news:", error);
  }
}

fetchNews().then(() => {
  console.log("✅ News import completed.");
  process.exit(0);
});