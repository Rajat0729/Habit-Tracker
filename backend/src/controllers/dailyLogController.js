import DailyLog from "../models/DailyLog.js";

/**
 * CREATE / UPDATE (UPSERT) DAILY LOG
 * POST /daily-log
 */
export const saveDailyLog = async (req, res) => {
  try {
    const userId = req.user;
    const { date, workSummary, keyLearnings, issuesFaced, hoursWorked } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const log = await DailyLog.findOneAndUpdate(
      { user: userId, date },
      {
        workSummary,
        keyLearnings,
        issuesFaced,
        hoursWorked,
      },
      { new: true, upsert: true }
    );

    res.json(log);
  } catch (err) {
    console.error("saveDailyLog error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET LOG BY DATE
 * GET /daily-log/:date
 */
export const getLogByDate = async (req, res) => {
  try {
    const userId = req.user;
    const { date } = req.params;

    const log = await DailyLog.findOne({ user: userId, date });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET ALL LOGS (LATEST FIRST)
 * GET /daily-log/week
 */
export const getAllLogs = async (req, res) => {
  try {
    const userId = req.user;

    const logs = await DailyLog.find({ user: userId }).sort({
      date: -1,
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
