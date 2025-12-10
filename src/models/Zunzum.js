const mongoose = require("mongoose");

const zunzumSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  text: String,
  isAnonymous: Boolean,
  likes: Number,
}, { timestamps: true });

module.exports = mongoose.model("Zunzum", zunzumSchema);
