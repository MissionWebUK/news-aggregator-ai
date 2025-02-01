const mongoose = require("mongoose");

// User DB Schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, index: true }, // ✅ Index for faster lookup
  preferences: [{ type: String, index: true }] // ✅ Index for searches
});

module.exports = mongoose.model("User", UserSchema);