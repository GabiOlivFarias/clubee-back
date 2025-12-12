const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProgressSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  trail: { type: String, required: true },     
  activityId: { type: String, required: true }, 
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null }
}, {
  timestamps: true
});

ProgressSchema.index({ userId: 1, trail: 1, activityId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', ProgressSchema);
