import type { DailyLog } from "../types/dailyLog.ts";

/**
 * Export all logs as JSON backup
 */
export function exportLogsToJSON(logs: DailyLog[]) {
  const payload = {
    meta: {
      app: "DailyLog Pro",
      version: "1.0",
      exportedAt: new Date().toISOString(),
    },
    logs,
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dailylog-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import logs from JSON backup
 */
export async function importLogsFromJSON(
  file: File
): Promise<DailyLog[]> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data?.logs || !Array.isArray(data.logs)) {
    throw new Error("Invalid backup file");
  }

  return data.logs;
}
