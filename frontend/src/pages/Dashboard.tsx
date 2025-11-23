import React, { useEffect, useMemo, useState } from "react";
import { clearToken } from "../utils/auth.js";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, fetchWithAuth } from "../services/api.js";
import { type Habit } from "../types/habit.js";
import { normalizeServerHabit, calcCurrentStreak, calcLongestStreak } from "../utils/habitUtils.js";
import HeaderControls from "../components/HeaderControls.js";
import CreateHabitModal from "../components/CreateHabitModal.js";
import HabitCard from "../components/HabitCard.js";

/**
 * Dashboard (refactored)
 * - small page file that orchestrates subcomponents
 * - keeps API and local fallback logic intact
 */

const STORAGE_KEY = "habitflow_habits_v2";

export default function Dashboard() {
  const navigate = useNavigate();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [width, setWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1200);
  const isMobile = width < 720;
  const isTablet = width >= 720 && width < 1024;

  // controls
  const [viewDaysMode, setViewDaysMode] = useState<"weekly" | "monthly">("weekly");
  const [viewDays, setViewDays] = useState<number>(7);
  const [sortMode, setSortMode] = useState<"name" | "current" | "longest">("name");
  const [search, setSearch] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<"all" | Habit["frequency"]>("all");

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
    function onResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function loadHabits() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/habits`);
      if (!res.ok) throw new Error("server error");
      const data = await res.json();
      const list = (data?.habits ?? []).map((r: any) => normalizeServerHabit(r));
      setHabits(list);
      setLoading(false);
      return;
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
      setLoading(false);
    }
  }

  async function handleCreate(payload: { name: string; frequency: Habit["frequency"]; timesPerDay: number; description: string }) {
    // call API then reload or fallback to optimistic
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
      // optimistic fallback
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

  // 1. Try server update FIRST
  const res = await fetchWithAuth(`${API_BASE_URL}/habits/${id}/complete`, {
    method: "POST",
  });

  if (res.ok) {
    const j = await res.json().catch(() => null);
    if (j?.habit) {
      const updated = normalizeServerHabit(j.habit);
      setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
      updatedFromServer = true;
    }
  }
  if (updatedFromServer) return;

  // 2. Local fallback (ALWAYS works)
  setHabits((prev) =>
    prev.map((h) => {
      if (h.id !== id) return h;

      // Fix: ensure recent always has 28 entries
      const recent = [...(h.recent ?? Array(28).fill(0))];
      while (recent.length < 28) recent.push(0);

      // Toggle today
      if (recent.length > 0) {
        recent[0] = (recent[0] ?? 0) > 0 ? 0 : 1;
      }

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
        const res = await fetchWithAuth(`${API_BASE_URL}/habits/${id}`, { method: "DELETE" });
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

    if (frequencyFilter !== "all") list = list.filter((h) => h.frequency === frequencyFilter);
    if (q) list = list.filter((h) => h.name.toLowerCase().includes(q));

    list = list.map((h) => ({ ...h, currentStreak: calcCurrentStreak(h.recent), longestStreak: calcLongestStreak(h.recent) }));

    if (sortMode === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "current") {
      list.sort((a, b) => (b.currentStreak ?? 0) - (a.currentStreak ?? 0));
    } else if (sortMode === "longest") {
      list.sort((a, b) => (b.longestStreak ?? 0) - (a.longestStreak ?? 0));
    }
    return list;
  }, [habits, search, frequencyFilter, sortMode]);

  // styling tokens (kept small)
  const base = {
    pageBg: "#0b0d0f",
    text: "#e8eef0",
    subtle: "#9fb3b7",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "flex-start" : "center",
    gap: 12,
    padding: isMobile ? 12 : 16,
    borderBottom: "1px solid rgba(255,255,255,0.03)",
    position: "sticky",
    top: 0,
    background: base.pageBg,
    zIndex: 20,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 1100,
    margin: "18px auto",
    padding: "0 14px",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: base.pageBg, color: base.text, fontFamily: "Inter, system-ui, sans-serif", paddingBottom: 40 }}>
      <header style={headerStyle}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", width: isMobile ? "100%" : "auto" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(180deg,#0af575,#0f8f4b)" }} />
          <div style={{ fontWeight: 700, fontSize: 18 }}>HabitFlow</div>
        </div>

        <HeaderControls isMobile={isMobile} search={search} setSearch={setSearch} frequencyFilter={frequencyFilter} setFrequencyFilter={setFrequencyFilter} viewDaysMode={viewDaysMode} setViewDaysMode={setViewDaysMode} sortMode={sortMode} setSortMode={setSortMode} logout={logout} />
      </header>

      <main style={containerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <button onClick={() => setShowCreate(true)} style={{ background: "#22c55e", color: "#04150d", padding: "10px 14px", borderRadius: 8, fontWeight: 700, border: "none" }}>
              + Add Habit
            </button>
          </div>
          <div style={{ color: base.subtle, fontSize: 13 }}>{filtered.length} habit{filtered.length !== 1 ? "s" : ""}</div>
        </div>

        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {habits.length === 0 && !loading && (
            <div style={{ textAlign: "center", marginTop: 60, color: base.subtle }}>
              <h2 style={{ margin: 0 }}>Welcome to HabitFlow</h2>
              <p>Start small. Add a habit to see progress and heatmaps.</p>
            </div>
          )}

          {loading && <div style={{ color: base.subtle, padding: 20, textAlign: "center" }}>Loading...</div>}

          {filtered.map((h) => (
            <HabitCard key={h.id} h={h} isMobile={isMobile} viewDaysMode={viewDaysMode} viewDays={viewDays} onToggleToday={toggleToday} onDelete={handleDelete} />
          ))}
        </section>
      </main>

      <CreateHabitModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
    </div>
  );
}
