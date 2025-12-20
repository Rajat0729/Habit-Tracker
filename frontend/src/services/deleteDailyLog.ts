import { API_BASE_URL, fetchWithAuth } from "./api.js";
import type { DailyLog } from "../types/dailyLog.js";

/**
 * Delete a daily log by date (best effort)
 */
export async function deleteDailyLog(date: string) {
  try {
    await fetchWithAuth(`${API_BASE_URL}/daily-logs/${date}`, {
      method: "DELETE",
    });
  } catch {
    // silent fail – offline safe
  }
}
