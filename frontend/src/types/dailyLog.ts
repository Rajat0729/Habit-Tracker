export interface DailyLog {
  date: string;

  workSummary: string;
  keyLearnings: string[];
  issuesFaced: string;
  hoursWorked: number;

  // 🔹 MERGE SUPPORT (BACKWARD SAFE)
  isMerged?: boolean;
  mergedDates?: string[];
  mergeTitle?: string;
}
