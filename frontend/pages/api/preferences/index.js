import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

export default async function handler(req, res) {
  // Use getServerSession to properly retrieve the session from the request.
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const userId = session.user.id;

  if (req.method === "GET") {
    try {
      const pref = await prisma.preference.findUnique({
        where: { userId },
      });
      if (pref) {
        return res.status(200).json(pref);
      } else {
        // If no preferences exist, return defaults with a current timestamp.
        const defaultPrefs = {
          categories: [],
          keywords: [],
          updatedAt: new Date().toISOString(),
        };
        return res.status(200).json(defaultPrefs);
      }
    } catch (error) {
      console.error("Error fetching preferences", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } else if (req.method === "POST") {
    const { categories, keywords, updatedAt } = req.body;
    try {
      const pref = await prisma.preference.upsert({
        where: { userId },
        update: { categories, keywords, updatedAt: new Date(updatedAt) },
        create: { userId, categories, keywords },
      });
      return res.status(200).json(pref);
    } catch (error) {
      console.error("Error saving preferences", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}