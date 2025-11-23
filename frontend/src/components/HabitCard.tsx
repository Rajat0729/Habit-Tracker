import React from "react";
import { type Habit } from "../types/habit.js";
import { buildMonthDataForHabit, colorForRatio, miniBarData, progressTodayPercent, weeklyProgressPercent, monthlyProgressPercent, calcCurrentStreak, calcLongestStreak } from "../utils/habitUtils.js";

type Props = {
  h: Habit;
  isMobile: boolean;
  viewDaysMode: "weekly" | "monthly";
  viewDays: number;
  onToggleToday: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function HabitCard({ h, isMobile, viewDaysMode, viewDays, onToggleToday, onDelete }: Props) {
  const now = new Date();
  const month0 = now.getMonth();
  const year = now.getFullYear();
  const monthData = buildMonthDataForHabit(h, year, month0);
  const weeks = miniBarData(h);

  const todayPct = progressTodayPercent(h);
  const weeklyPct = weeklyProgressPercent(h);
  const monthlyPct = monthlyProgressPercent(h);

  const cellSize = isMobile ? 24 : 28;
  const monthCellSize = isMobile ? 10 : 12;

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, alignItems: "center", padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", width: "100%", boxSizing: "border-box" }}>
      {/* Left info */}
      <div style={{ width: isMobile ? "100%" : 260, flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, wordBreak: "break-word" }}>{h.name}</div>
        <div style={{ marginTop: 6, color: "#9fb3b7", fontSize: 13 }}>
          {h.timesPerDay} target / day · {h.frequency}
        </div>

        <div style={{ marginTop: 8, color: "#9fb3b7", fontSize: 13 }}>
          Current streak: {h.currentStreak ?? calcCurrentStreak(h.recent)} 🔥
        </div>

        {/* NEW: progress percentages */}
        <div style={{ marginTop: 6, color: "#9fb3b7", fontSize: 13 }}>
          Progress — Today: <strong style={{ color: "#e8eef0" }}>{todayPct}%</strong> · Weekly: <strong style={{ color: "#e8eef0" }}>{weeklyPct}%</strong> · Month: <strong style={{ color: "#e8eef0" }}>{monthlyPct}%</strong>
        </div>

        {isMobile && h.description ? (
          <div style={{ marginTop: 8, color: "#cbd6d9", fontSize: 13 }}>{h.description}</div>
        ) : null}
      </div>

      {/* heatmap & mini bars */}
      <div style={{ flex: 1, display: "flex", alignItems: isMobile ? "stretch" : "center", gap: 12, flexDirection: isMobile ? "column" : "row", boxSizing: "border-box" }}>
        {viewDaysMode === "weekly" ? (
          <div style={{ display: "flex", gap: 8, overflowX: isMobile ? "auto" : "visible", paddingBottom: isMobile ? 6 : 0, alignItems: "center", width: isMobile ? "100%" : "auto" }}>
            {h.recent.slice(0, viewDays).map((count, i) => {
              const ratio = h.timesPerDay > 0 ? Math.min((count ?? 0) / h.timesPerDay, 2) : (count ? 1 : 0);
              const bg = colorForRatio(ratio);
              const size = cellSize;
              return (
                <div key={i} title={`${i === 0 ? "Today" : `${i} day(s) ago`} • ${count ?? 0}/${h.timesPerDay}`} style={{ width: size, height: size, borderRadius: 6, background: bg, display: "inline-block", border: "1px solid rgba(0,0,0,0.25)", flex: "0 0 auto" }} />
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: isMobile ? "100%" : 340, alignItems: "center" }}>
            {monthData.map((cell) => {
              const bg = cell.active ? colorForRatio(cell.ratio) : "#15171a";
              const opacity = cell.active ? 1 : 0.35;
              return (
                <div key={cell.dateISO} title={`${cell.dateISO} • ${cell.count}/${h.timesPerDay}`} style={{ width: monthCellSize, height: monthCellSize, borderRadius: 3, background: bg, opacity, flex: "0 0 auto" }} />
              );
            })}
          </div>
        )}

        <div style={{ width: isMobile ? "100%" : 120, display: "flex", gap: 6, alignItems: "flex-end", justifyContent: isMobile ? "flex-start" : "center", flexWrap: isMobile ? "wrap" : "nowrap" }}>
          {weeks.map((w, i) => (
            <div key={i} title={`${w}%`} style={{ width: 18, height: `${Math.max(6, (w / 100) * 72)}px`, background: w >= 75 ? "#0d8c3d" : "#22c55e", borderRadius: 6, flex: "0 0 auto" }} />
          ))}
        </div>
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: 8, marginLeft: isMobile ? 0 : "auto", width: isMobile ? "100%" : "auto", boxSizing: "border-box" }}>
        <button onClick={() => onToggleToday(h.id)} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", color: "#e8eef0", border: "none", flex: isMobile ? 1 : undefined, minWidth: 0 }}>
          {(h.recent?.[0] ?? 0) > 0 ? "Undo Today" : "Mark Today"}
        </button>

        <button onClick={() => onDelete(h.id)} style={{ padding: "8px 10px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#9fb3b7", flex: isMobile ? 1 : undefined, minWidth: 0 }}>
          Delete
        </button>
      </div>
    </div>
  );
}
