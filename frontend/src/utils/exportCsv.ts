import type { DailyLog } from "../types/dailyLog.js";

export function exportLogsToCSV(logs: DailyLog[]) {
  if (!logs.length) return;

  const hasLearnings = logs.some((l) => l.keyLearnings && l.keyLearnings.some((k) => k.trim() !== ""));
  const hasIssues = logs.some((l) => l.issuesFaced && l.issuesFaced.trim() !== "");
  const hasHours = logs.some((l) => l.hoursWorked && l.hoursWorked > 0);

  const headers = ["Date", "Work Summary"];
  if (hasLearnings) headers.push("Key Learnings");
  if (hasIssues) headers.push("Issues Faced");
  if (hasHours) headers.push("Hours Worked");

  const rows = logs.map((log) => {
    const row: any[] = [
      log.date,
      `"${(log.workSummary ?? "").replace(/"/g, '""')}"`,
    ];
    if (hasLearnings) row.push(`"${(log.keyLearnings ?? []).join(" | ").replace(/"/g, '""')}"`);
    if (hasIssues) row.push(`"${(log.issuesFaced ?? "").replace(/"/g, '""')}"`);
    if (hasHours) row.push(log.hoursWorked ?? 0);
    return row;
  });

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
