// File: backend/routes/preferencesRoutes.js

import express from "express";
import { ensureAuthenticated } from "../middleware/authMiddleware.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// For testing purposes, add a simple GET endpoint that returns a message.
// This route will be reachable at GET /api/preferences/
//router.get("/", ensureAuthenticated, async (req, res, next) => {
    console.log(req.user);
    /* try {
      // Assuming req.user.id contains a valid user id
      const userId = req.user.id;
      const preference = await prisma.preference.findUnique({
        where: { userId },
      });
      // If there’s no preference record, you might want to send a default response
      res.json({ preference: preference || null });
    } catch (error) {
      console.error("Error fetching preferences:", error);
      next(error); // Forward the error to your error-handling middleware
    } */
  //});

/**
 * PUT /api/preferences/
 * Updates (or creates, if not present) the preferences for the authenticated user.
 */
router.put("/", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { categories, keywords } = req.body;

    // (Optional) Validate that userId is in valid format here if needed

    // Check if a preference record already exists for the user
    let preference = await prisma.preference.findUnique({
      where: { userId },
    });

    if (preference) {
      // Update the existing record
      preference = await prisma.preference.update({
        where: { userId },
        data: { categories, keywords },
      });
    } else {
      // Create a new record if one doesn't exist
      preference = await prisma.preference.create({
        data: { userId, categories, keywords },
      });
    }
    res.json({ preference });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({
      message: "Error updating preferences",
      error: error.toString(),
    });
  }
});

export const preferencesRoutes = router;