import mongoose from "mongoose";

const dailyLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    workSummary: {
      type: String,
      default: "",
    },
    keyLearnings: {
      type: [String],
      default: [],
    },
    issuesFaced: {
      type: String,
      default: "",
    },
    hoursWorked: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// one log per user per date
dailyLogSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("DailyLog", dailyLogSchema);
