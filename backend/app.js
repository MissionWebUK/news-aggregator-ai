// File: backend/app.js

// -------------------- IMPORTS -------------------- //

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import compression from "compression";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

// Load environment variables
dotenv.config({ path: "./config/.env" });

console.log("✅ Environment variables loaded");

// Create the express app

const app = express();

// -------------------- MIDDLEWARE -------------------- //

// Not Needed at the moment. If the front end sits on a different 
// server to the backend, or there are multiple front ends, this will be necessary

// Optional: If you need multiple origins, specify them in .env like:
// CORS_ORIGINS=https://mydomain.com,https://anotherdomain.com
// Otherwise, it falls back to FRONTEND_URL or localhost:3000
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : [process.env.FRONTEND_URL || "http://localhost:3000"];

// Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(compression());
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 500,
  message: "Too many requests, try again later.",
});
app.use(limiter);

// -------------------- DATABASE -------------------- //
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/userdb?replicaSet=rs0", {
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Log disconnects
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// -------------------- ROUTES -------------------- //

// All api calls via /api will be processed by the newsRoutes.js file

import { newsRoutes } from "./routes/newsRoutes.js";
app.use("/api", newsRoutes);

// -------------------- ERROR HANDLING -------------------- //
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);

  // Hide sensitive error info unless in development
  const response = {
    message: "Internal Server Error",
  };
  if (process.env.NODE_ENV === "development") {
    response.error = err.message; // or stack if you prefer
  }

  res.status(500).json(response);
});

// -------------------- START SERVER -------------------- //

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// -------------------- GRACEFUL SHUTDOWN -------------------- //

// This function gracefully shuts down the server and MongoDB connection
const handleShutdown = async (signal) => {
  console.log(`\n${signal} received: closing server gracefully...`);
  await mongoose.connection.close();
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

// Listen for termination signals
process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

// NOTE: The previous SIGINT handler that attempted to kill a Python process
// via `pythonProcess.kill("SIGINT")` has been removed to avoid the ReferenceError.
// If you later decide that you need to manage a Python process from here,
// consider declaring and managing a global variable (e.g., `let pythonProcess = null;`)
// and updating it when the process is spawned.