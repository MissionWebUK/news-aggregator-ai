// File: frontend/pages/api/news.js

import { getSession } from "next-auth/react";
import { prisma } from "../../lib/prisma";

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Attempt to retrieve the session, but do NOT require it
    const session = await getSession({ req });

    // If the user is logged in, optionally check if they have AI ranking enabled
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { preferences: true },
      });

      // Uncomment this if you'd like to redirect users who have AI ranking enabled
      // if (user?.preferences?.aiRankingEnabled) {
      //   return res.redirect("/api/news-rank");
      // }
    }

    // Fetch up to 50 articles published in the last 3 days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const articles = await prisma.newsArticle.findMany({
      where: {
        publishedAt: {
          gte: threeDaysAgo,
        },
      },
      orderBy: { publishedAt: "desc" }, // Ensure most recent articles first
      take: 50,
    });

    console.log(`🔍 [news.js] Returning ${articles.length} articles to client.`);

    return res.status(200).json({ articles });
  } catch (error) {
    console.error("❌ [news.js] Internal Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}