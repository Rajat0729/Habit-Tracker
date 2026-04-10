import * as XLSX from "xlsx";
import type { DailyLog } from "../types/dailyLog.js";

export function exportLogsToExcel(logs: DailyLog[]) {
  if (!logs.length) return;

  const hasLearnings = logs.some((l) => l.keyLearnings && l.keyLearnings.some((k) => k.trim() !== ""));
  const hasIssues = logs.some((l) => l.issuesFaced && l.issuesFaced.trim() !== "");
  const hasHours = logs.some((l) => l.hoursWorked && l.hoursWorked > 0);

  const rows = logs.map((log) => {
    const row: any = {
      Date: log.date,
      "Work Summary": log.workSummary ?? "",
    };
    if (hasLearnings) row["Key Learnings"] = (log.keyLearnings ?? []).join(" | ");
    if (hasIssues) row["Issues Faced"] = log.issuesFaced ?? "";
    if (hasHours) row["Hours Worked"] = log.hoursWorked ?? 0;
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Daily Logs"
  );

  XLSX.writeFile(
    workbook,
    `daily-logs-${Date.now()}.xlsx`
  );
}
