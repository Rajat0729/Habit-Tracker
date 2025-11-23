import { type Habit } from "../types/habit.js";

/**
 * Utility functions for habits:
 * - normalization from server
 * - streak calculations
 * - month builder
 * - mini bars
 * - color mapping
 * - progress calculations
 */

// small date helpers
export function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0).getDate();
}

export function dateToYMD(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export function dateDiffDays(a: Date, b: Date) {
  const ad = new Date(a);
  ad.setHours(0, 0, 0, 0);
  const bd = new Date(b);
  bd.setHours(0, 0, 0, 0);
  const diff = Math.round((ad.getTime() - bd.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// Normalizer - ensures fields exist locally
export function normalizeServerHabit(raw: any): Habit {
  const id = raw.id ?? raw._id ?? String(Date.now());
  const recent = Array.isArray(raw.recent) ? raw.recent.map((v: any) => Number(v) || 0) : Array(28).fill(0);
  return {
    id,
    name: raw.name ?? "Untitled",
    description: raw.description ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    timesPerDay: raw.timesPerDay ?? 1,
    frequency: raw.frequency ?? "Daily",
    recent: recent.slice(0, 28),
    currentStreak: raw.currentStreak ?? 0,
    longestStreak: raw.longestStreak ?? 0,
  };
}

// streaks
export function calcCurrentStreak(recent: number[]) {
  let cnt = 0;
  for (let i = 0; i < recent.length; i++) {
    if ((recent[i] ?? 0) > 0) cnt++;
    else break;
  }
  return cnt;
}

export function calcLongestStreak(recent: number[]) {
  let max = 0;
  let cur = 0;
  for (let i = 0; i < recent.length; i++) {
    if ((recent[i] ?? 0) > 0) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

// build month view for a habit
export function buildMonthDataForHabit(h: Habit, year: number, month0: number) {
  const days = daysInMonth(year, month0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const created = new Date(h.createdAt);
  created.setHours(0, 0, 0, 0);

  const recent = h.recent ?? Array(28).fill(0);

  const arr: Array<{ dateISO: string; count: number; active: boolean; ratio: number; date: Date }> = [];
  for (let day = 1; day <= days; day++) {
    const d = new Date(year, month0, day);
    d.setHours(0, 0, 0, 0);
    const iso = dateToYMD(d);

    const daysAgo = dateDiffDays(today, d);
    let count = 0;
    if (daysAgo >= 0 && daysAgo < recent.length) {
      count = recent[daysAgo] ?? 0;
    } else {
      count = 0;
    }

    const active = d <= today && d >= created;
    const ratio = h.timesPerDay > 0 ? Math.min(count / h.timesPerDay, 2) : count > 0 ? 1 : 0;

    arr.push({ dateISO: iso, count, active, ratio, date: d });
  }
  return arr;
}

// color mapping based on ratio
export function colorForRatio(ratio: number) {
  if (ratio <= 0) return "#1a1d21";
  if (ratio < 0.5) return "#a7f3d0";
  if (ratio < 1) return "#4ade80";
  if (ratio < 1.5) return "#16a34a";
  return "#0b6b36";
}

// mini-bars: 4 week buckets -> percentage done
export function miniBarData(h: Habit) {
  const now = new Date();
  const year = now.getFullYear();
  const month0 = now.getMonth();
  const monthData = buildMonthDataForHabit(h, year, month0);

  const weeks: number[] = [];
  for (let i = 0; i < 4; i++) {
    const start = Math.floor((i * monthData.length) / 4);
    const end = Math.floor(((i + 1) * monthData.length) / 4);
    const segment = monthData.slice(start, end);
    if (segment.length === 0) {
      weeks.push(0);
      continue;
    }
    const done = segment.filter((s) => s.ratio >= 1).length;
    weeks.push(Math.round((done / segment.length) * 100));
  }
  return weeks;
}

/* ----------------------------
   Progress calculations
   - todayPct: (todayCount / timesPerDay) * 100 (clamped to 200% cap like ratio)
   - weeklyPct: average of daily (count/timesPerDay) across last 7 days
   - monthlyAvgPct: average across current month days (active days)
---------------------------- */

export function progressTodayPercent(h: Habit) {
  const today = (h.recent?.[0] ?? 0);
  const pct = h.timesPerDay > 0 ? Math.min((today / h.timesPerDay) * 100, 200) : today > 0 ? 100 : 0;
  return Math.round(pct);
}

export function weeklyProgressPercent(h: Habit) {
  const slice = (h.recent ?? []).slice(0, 7);
  if (slice.length === 0) return 0;
  const sums = slice.map((c) => (h.timesPerDay > 0 ? Math.min(c / h.timesPerDay, 2) : (c > 0 ? 1 : 0)));
  const avg = (sums.reduce((a, b) => a + b, 0) / slice.length) * 100;
  return Math.round(avg);
}

export function monthlyProgressPercent(h: Habit) {
  // compute percent for current month using buildMonthDataForHabit
  const now = new Date();
  const monthData = buildMonthDataForHabit(h, now.getFullYear(), now.getMonth());
  if (!monthData.length) return 0;
  const sums = monthData.map((d) => (h.timesPerDay > 0 ? Math.min(d.count / h.timesPerDay, 2) : (d.count > 0 ? 1 : 0)));
  const avg = (sums.reduce((a, b) => a + b, 0) / monthData.length) * 100;
  return Math.round(avg);
}
