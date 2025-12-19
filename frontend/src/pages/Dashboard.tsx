import React, { useEffect, useMemo, useState } from "react";
import { clearToken } from "../utils/auth.js";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, fetchWithAuth } from "../services/api.js";
import { type Habit } from "../types/habit.js";
import {
  normalizeServerHabit,
  calcCurrentStreak,
  calcLongestStreak,
} from "../utils/habitUtils.js";
import HeaderControls from "../components/HeaderControls.js";
import CreateHabitModal from "../components/CreateHabitModal.js";
import HabitCard from "../components/HabitCard.js";

const STORAGE_KEY = "habitflow_habits_v2";

export default function Dashboard() {
  const navigate = useNavigate();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [width, setWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  const isMobile = width < 720;

  const [viewDaysMode, setViewDaysMode] =
    useState<"weekly" | "monthly">("weekly");
  const [viewDays, setViewDays] = useState<number>(7);
  const [sortMode, setSortMode] =
    useState<"name" | "current" | "longest">("name");
  const [search, setSearch] = useState("");
  const [frequencyFilter, setFrequencyFilter] =
    useState<"all" | Habit["frequency"]>("all");

  useEffect(() => {
    setViewDays(viewDaysMode === "weekly" ? 7 : 28);
  }, [viewDaysMode]);

  useEffect(() => {
    loadHabits();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch {}
  }, [habits]);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function loadHabits() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/habits`);
      if (!res.ok) throw new Error("server error");
      const data = await res.json();
      const list = (data?.habits ?? []).map((r: any) =>
        normalizeServerHabit(r)
      );
      setHabits(list);
    } catch {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setHabits(JSON.parse(raw));
        } catch {
          setHabits([]);
        }
      } else {
        setHabits([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: {
    name: string;
    frequency: Habit["frequency"];
    timesPerDay: number;
    description: string;
  }) {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await loadHabits();
        setShowCreate(false);
        return;
      }
    } catch {
      const newHabit: Habit = {
        id: Date.now().toString(),
        name: payload.name,
        description: payload.description,
        createdAt: new Date().toISOString(),
        timesPerDay: payload.timesPerDay,
        frequency: payload.frequency,
        recent: Array(28).fill(0),
        currentStreak: 0,
        longestStreak: 0,
      };
      setHabits((p) => [newHabit, ...p]);
      setShowCreate(false);
    }
  }

  async function toggleToday(id: string) {
    let updatedFromServer = false;

    const res = await fetchWithAuth(
      `${API_BASE_URL}/habits/${id}/complete`,
      { method: "POST" }
    );

    if (res.ok) {
      const j = await res.json().catch(() => null);
      if (j?.habit) {
        const updated = normalizeServerHabit(j.habit);
        setHabits((prev) =>
          prev.map((h) => (h.id === id ? updated : h))
        );
        updatedFromServer = true;
      }
    }

    if (updatedFromServer) return;

    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;

        const recent = [...(h.recent ?? Array(28).fill(0))];
        while (recent.length < 28) recent.push(0);

        if (recent.length > 0) { recent[0] = (recent[0] ?? 0) > 0 ? 0 : 1; }

        return {
          ...h,
          recent,
          currentStreak: calcCurrentStreak(recent),
          longestStreak: calcLongestStreak(recent),
        };
      })
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this habit?")) return;

    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      try {
        const res = await fetchWithAuth(
          `${API_BASE_URL}/habits/${id}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          await loadHabits();
          return;
        }
      } catch {}
    }

    setHabits((p) => p.filter((h) => h.id !== id));
  }

  function logout() {
    clearToken();
    navigate("/login");
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = habits.slice();

    if (frequencyFilter !== "all")
      list = list.filter((h) => h.frequency === frequencyFilter);
    if (q) list = list.filter((h) => h.name.toLowerCase().includes(q));

    list = list.map((h) => ({
      ...h,
      currentStreak: calcCurrentStreak(h.recent),
      longestStreak: calcLongestStreak(h.recent),
    }));

    if (sortMode === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "current") {
      list.sort(
        (a, b) => (b.currentStreak ?? 0) - (a.currentStreak ?? 0)
      );
    } else {
      list.sort(
        (a, b) => (b.longestStreak ?? 0) - (a.longestStreak ?? 0)
      );
    }

    return list;
  }, [habits, search, frequencyFilter, sortMode]);

  const base = {
    pageBg: "#0b0d0f",
    text: "#e8eef0",
    subtle: "#9fb3b7",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: base.pageBg,
        color: base.text,
        paddingBottom: 40,
      }}
    >
      <header
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
          padding: 16,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18 }}>HabitFlow</div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => navigate("/daily-log")}
            style={{
              background: "#1e293b",
              color: "#e5e7eb",
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            Daily Log
          </button>

          <HeaderControls
            isMobile={isMobile}
            search={search}
            setSearch={setSearch}
            frequencyFilter={frequencyFilter}
            setFrequencyFilter={setFrequencyFilter}
            viewDaysMode={viewDaysMode}
            setViewDaysMode={setViewDaysMode}
            sortMode={sortMode}
            setSortMode={setSortMode}
            logout={logout}
          />
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "20px auto", padding: "0 14px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background: "#22c55e",
              color: "#04150d",
              padding: "10px 14px",
              borderRadius: 8,
              fontWeight: 700,
              border: "none",
            }}
          >
            + Add Habit
          </button>

          <div style={{ color: base.subtle, fontSize: 13 }}>
            {filtered.length} habit
            {filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: base.subtle }}>
            Loading...
          </div>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((h) => (
            <HabitCard
              key={h.id}
              h={h}
              isMobile={isMobile}
              viewDaysMode={viewDaysMode}
              viewDays={viewDays}
              onToggleToday={toggleToday}
              onDelete={handleDelete}
            />
          ))}
        </section>
      </main>

      <CreateHabitModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
