import type { DailyLog } from "../types/dailyLog.js";

function unique(lines: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const l of lines) {
    const clean = l.trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }

  return result;
}

export function mergeLogs(logs: DailyLog[]): DailyLog {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dates = sorted.map((l) => l.date);
  const start = dates[0];
  const end = dates[dates.length - 1];

  return {
    // 🔑 synthetic key (prevents overwrite everywhere)
    date: `merge-${start}_${end}`,

    isMerged: true,
    mergedDates: dates,
    mergeTitle: `Merged Log (${start} → ${end})`,

    workSummary: unique(
      sorted.flatMap((l) => l.workSummary.split("\n"))
    ).join("\n"),

    keyLearnings: unique(
      sorted.flatMap((l) => l.keyLearnings || [])
    ),

    issuesFaced: unique(
      sorted.flatMap((l) => l.issuesFaced.split("\n"))
    ).join("\n"),

    hoursWorked: sorted.reduce(
      (sum, l) => sum + (l.hoursWorked || 0),
      0
    ),
  };
}
