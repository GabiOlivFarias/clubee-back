const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  displayName: { type: String },
  email: { type: String },
  photo: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
