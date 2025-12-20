import { saveDailyLog } from "./dailyLogApi.js";
import type { DailyLog } from "../types/dailyLog.js";

/**
 * Sync imported logs to backend (best effort)
 */
export async function syncImportedLogs(logs: DailyLog[]) {
  for (const log of logs) {
    try {
      await saveDailyLog(log);
    } catch {
      // silent fail → local backup still safe
    }
  }
}
