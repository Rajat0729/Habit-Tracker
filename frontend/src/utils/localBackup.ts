import type { DailyLog } from "../types/dailyLog.ts";

/**
 * Save logs to localStorage (offline safe)
 */
export function saveLogsToLocal(logs: DailyLog[]) {
  logs.forEach((log) => {
    localStorage.setItem(
      `daily-log-${log.date}`,
      JSON.stringify(log)
    );
  });
}

/**
 * Load all local logs (fallback)
 */
export function loadLogsFromLocal(): DailyLog[] {
  const logs: DailyLog[] = [];

  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith("daily-log-")) return;
    try {
      const parsed = JSON.parse(localStorage.getItem(key)!);
      if (parsed?.date) logs.push(parsed);
    } catch {}
  });

  return logs.sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
  );
}
