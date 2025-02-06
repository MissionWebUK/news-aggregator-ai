
// Middleware to ensure that the user is authenticated
// before accessing protected routes

// ✅ Import required modules
import dotenv from "dotenv";
dotenv.config({ path: "./config/.env" });

import jwt from "jsonwebtoken";

export function ensureAuthenticated(req, res, next) {

  // Extract token from Authorization header 
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Verify token and attach user to request object
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    // console.log(`✅ User authenticated: ${decoded.email}`);
    next();
  } catch (error) {
    console.error("❌ Authentication error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}