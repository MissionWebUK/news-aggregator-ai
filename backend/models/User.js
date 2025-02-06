
// Importing mongoose
const mongoose = require("mongoose");

// Defining the User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, index: true }, // ✅ Index for faster lookup
  preferences: [{ type: String, index: true }] // ✅ Index for searches
});

// Exporting the User model
module.exports = mongoose.model("User", UserSchema);