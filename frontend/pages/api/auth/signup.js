// File: frontend/pages/api/auth/signup.js

import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import validator from "validator";

const MAX_REQUESTS = 5;      // Each IP can make 5 signup attempts
const WINDOW_MS = 15 * 60 * 1000; // ...per 15 minutes

// Simple in-memory store of IP-based attempts
// NOT recommended for production at scale - use Redis or a more robust solution
let signupAttempts = {};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  // 1. Simple Rate Limiting
  const currentTime = Date.now();
  const attemptInfo = signupAttempts[ip] || { count: 0, expires: 0 };

  // If window expired, reset
  if (attemptInfo.expires < currentTime) {
    signupAttempts[ip] = {
      count: 0,
      expires: currentTime + WINDOW_MS,
    };
  }

  // Increment attempt count
  signupAttempts[ip].count += 1;

  // Check limit
  if (signupAttempts[ip].count > MAX_REQUESTS) {
    return res.status(429).json({
      message: "Too many signup attempts, please try again later.",
    });
  }

  try {
    const { email, password, name } = req.body;

    // 2. Basic Validation
    if (!email || !password || !name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Normalize and validate email
    const normalizedEmail = email.toLowerCase().trim();
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // 3. Check Password Complexity
    // For example: minimum 8 chars, at least one digit
    if (
      password.length < 8 ||
      !/\d/.test(password) // no digit found
    ) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include a digit.",
      });
    }

    // 4. Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // NOTE: For privacy, some apps prefer a generic error: "Cannot create account"
      return res.status(400).json({ message: "User already exists" });
    }

    // 5. Hash the password
    // 10 rounds is standard, but you can increase to 12 for extra security
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 6. Create the user
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        password: hashedPassword,
        // Optionally set default roles or preferences here...
      },
    });

    return res.status(201).json({
      message: "User created successfully",
      userId: newUser.id, // Return user ID if you need it on the client
    });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}