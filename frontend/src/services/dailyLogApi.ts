import { fetchWithAuth, API_BASE_URL } from "./api.js";
import type { DailyLog } from "../types/dailyLog.js";

export const saveDailyLog = async (
  data: DailyLog
): Promise<DailyLog> => {
  const res = await fetchWithAuth(`${API_BASE_URL}/daily-log`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to save daily log");
  }

  return res.json();
};

export const getWeeklyLogs = async (): Promise<DailyLog[]> => {
  const res = await fetchWithAuth(`${API_BASE_URL}/daily-log/week`);
  if (!res.ok) return [];

  const data = await res.json();

  // 🔒 SANITIZE
  if (!Array.isArray(data)) return [];

  return data.filter(
    (log): log is DailyLog =>
      log &&
      typeof log === "object" &&
      typeof log.date === "string"
  );
};

export const getDailyLogByDate = async (
  date: string
): Promise<DailyLog | null> => {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/daily-log/${date}`
  );
  if (!res.ok) return null;

  const log = await res.json();
  if (!log || typeof log.date !== "string") return null;

  return log;
};
