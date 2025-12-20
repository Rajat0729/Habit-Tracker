import type { DailyLog } from "../types/dailyLog.js";

export function exportLogsToCSV(logs: DailyLog[]) {
  if (!logs.length) return;

  const headers = [
    "Date",
    "Work Summary",
    "Key Learnings",
    "Issues Faced",
    "Hours Worked",
  ];

  const rows = logs.map((log) => [
    log.date,
    `"${(log.workSummary ?? "").replace(/"/g, '""')}"`,
    `"${(log.keyLearnings ?? []).join(" | ").replace(/"/g, '""')}"`,
    `"${(log.issuesFaced ?? "").replace(/"/g, '""')}"`,
    log.hoursWorked ?? 0,
  ]);

  const csv =
    [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `daily-logs-${Date.now()}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}
