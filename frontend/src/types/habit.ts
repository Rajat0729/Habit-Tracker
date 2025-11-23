export type Frequency = "Daily" | "Weekly" | "Monthly";

export type Habit = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  timesPerDay: number;
  frequency: Frequency;
  recent: number[]; // index 0 = today, 1 = yesterday, ...
  currentStreak?: number;
  longestStreak?: number;
};
