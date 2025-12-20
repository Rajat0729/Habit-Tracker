import * as XLSX from "xlsx";
import type { DailyLog } from "../types/dailyLog.js";

export function exportLogsToExcel(logs: DailyLog[]) {
  if (!logs.length) return;

  const rows = logs.map((log) => ({
    Date: log.date,
    "Work Summary": log.workSummary ?? "",
    "Key Learnings": (log.keyLearnings ?? []).join(" | "),
    "Issues Faced": log.issuesFaced ?? "",
    "Hours Worked": log.hoursWorked ?? 0,
  }));

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
