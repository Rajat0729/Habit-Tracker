import { fetchWithAuth, API_BASE_URL } from "./api.js";
import { type Habit } from "../types/habit.js";
import {
  calcCurrentStreak,
  calcLongestStreak,
} from "../utils/habitUtils.js";

export function normalizeServerHabit(raw: any): Habit {
  const id = raw._id || raw.id; // << FIXED

  const recent = Array.isArray(raw.recent)
    ? raw.recent.map((v: any) => Number(v) || 0)
    : Array(28).fill(0);

  return {
    id,
    name: raw.name ?? "Untitled",
    description: raw.description ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    timesPerDay: raw.timesPerDay ?? 1,
    frequency: raw.frequency ?? "Daily",
    recent: recent.slice(0, 28),
    currentStreak: calcCurrentStreak(recent),
    longestStreak: calcLongestStreak(recent),
  };
}

export async function apiToggleToday(id: string) {
  const res = await fetchWithAuth(`${API_BASE_URL}/habits/${id}/complete`, {
    method: "POST",
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.habit ? normalizeServerHabit(json.habit) : null;
}
