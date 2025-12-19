import express from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  saveDailyLog,
  getLogByDate,
  getAllLogs,
} from "../controllers/dailyLogController.js";

const router = express.Router();

router.post("/daily-log", auth, saveDailyLog);
router.get("/daily-log/week", auth, getAllLogs);
router.get("/daily-log/:date", auth, getLogByDate);

export default router;
