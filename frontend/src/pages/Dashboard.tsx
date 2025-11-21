// frontend/src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { clearToken } from "../utils/auth.js";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, fetchWithAuth } from "../services/api.js";

// Type for habit
type Habit = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  timesPerDay: number;
  frequency: "Daily" | "Weekly" | "Monthly";
  recent: number[];
  currentStreak: number;
  longestStreak: number;
};

const STORAGE_KEY = "habitflow_habits_v2";

export default function Dashboard() {
  const navigate = useNavigate();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);

  // Create habit modal fields
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [description, setDescription] = useState("");

  // UI State
  const [viewDays, setViewDays] = useState<7 | 28>(7);
  const [sortMode, setSortMode] = useState<"name" | "current" | "longest">("name");

  // Attempts to load backend habits first, fallback → localStorage
  useEffect(() => {
    loadHabits();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  // Normalize habit object from server
  const normalizeHabit = (raw: any): Habit => ({
    id: raw.id || raw._id,
    name: raw.name,
    description: raw.description || "",
    createdAt: raw.createdAt,
    timesPerDay: raw.timesPerDay || 1,
    frequency: raw.frequency || "Daily",
    recent: raw.recent || Array(28).fill(0),
    currentStreak: raw.currentStreak || 0,
    longestStreak: raw.longestStreak || 0,
  });

  async function loadHabits() {
    setLoading(true);

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/habits`);
      if (!res.ok) throw new Error();

      const data = await res.json();
      const list = data.habits.map(normalizeHabit);
      setHabits(list);
      setLoading(false);
      return;
    } catch (err) {
      // fallback: local storage
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setHabits(JSON.parse(raw));
        } catch {
          setHabits([]);
        }
      }
      setLoading(false);
    }
  }

  // Create habit
  async function createHabit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) return alert("Enter a habit name");

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        await loadHabits();
        closeCreateModal();
        return;
      }
    } catch {}

    // local fallback
    const newHabit: Habit = {
      id: Date.now().toString(),
      name,
      description,
      timesPerDay,
      frequency,
      createdAt: new Date().toISOString(),
      recent: Array(28).fill(0),
      currentStreak: 0,
      longestStreak: 0,
    };

    setHabits((prev) => [newHabit, ...prev]);
    closeCreateModal();
  }

  function closeCreateModal() {
    setShowCreate(false);
    setName("");
    setDescription("");
    setTimesPerDay(1);
    setFrequency("Daily");
  }

  // Toggle Today
  async function toggleToday(id: string) {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/habits/${id}/complete`, {
        method: "POST",
      });

      if (res.ok) {
        const j = await res.json();
        const updated = normalizeHabit(j.habit);
        setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
        return;
      }
    } catch (err) {}

    // Local fallback toggle
    setHabits((prev) =>
    prev.map((h) => {
    if (h.id !== id) return h;

    const next = [...(h.recent ?? Array(28).fill(0))];
    const todayVal = next[0] ?? 0;
    next[0] = todayVal > 0 ? 0 : 1;

    return { ...h, recent: next };
    })
  );
  }

  // Delete habit
  async function deleteHabit(id: string) {
    if (!confirm("Delete this habit?")) return;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/habits/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadHabits();
        return;
      }
    } catch {}

    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  // Sorting
  const displayedHabits = useMemo(() => {
    let arr = [...habits];

    if (sortMode === "name") {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "current") {
      arr.sort((a, b) => b.currentStreak - a.currentStreak);
    } else {
      arr.sort((a, b) => b.longestStreak - a.longestStreak);
    }

    return arr;
  }, [habits, sortMode]);

  // Progress calculation
  const progress = (habit: Habit, days: number) => {
    const slice = habit.recent.slice(0, days);
    const done = slice.filter((x) => x > 0).length;
    return Math.round((done / days) * 100);
  };

  function logout() {
    clearToken();
    navigate("/login");
  }

  // UI ──────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0c0e10", color: "#fff" }}>
      {/* Header */}
      <header
        style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>HabitFlow</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
          <select
            value={viewDays}
            onChange={(e) => setViewDays(Number(e.target.value) as 7 | 28)}
            style={{ padding: 6, borderRadius: 6 }}
          >
            <option value={7}>Weekly</option>
            <option value={28}>Monthly</option>
          </select>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as any)}
            style={{ padding: 6, borderRadius: 6 }}
          >
            <option value="name">Name (A–Z)</option>
            <option value="current">Current Streak</option>
            <option value="longest">Longest Streak</option>
          </select>

          <button
            onClick={logout}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              background: "transparent",
              border: "1px solid #333",
              color: "#ccc",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            fontWeight: 700,
            background: "#22c55e",
            color: "#04150d",
            marginBottom: 20,
          }}
        >
          + Add Habit
        </button>

        {loading ? (
          <p>Loading...</p>
        ) : displayedHabits.length === 0 ? (
          <p style={{ marginTop: 60, textAlign: "center", color: "#9fb3b7" }}>
            No habits yet — add your first one!
          </p>
        ) : (
          displayedHabits.map((h) => (
            <div
              key={h.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: 16,
                borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                marginBottom: 14,
              }}
            >
              {/* Details */}
              <div style={{ width: 260 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{h.name}</div>
                <div style={{ marginTop: 6, color: "#9fb3b7" }}>
                  Current Streak: {h.currentStreak} 🔥
                </div>
                <div style={{ marginTop: 6, color: "#9fb3b7" }}>
                  Progress: <strong>{progress(h, viewDays)}%</strong>
                </div>
              </div>

              {/* Heatmap */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  width: viewDays === 7 ? 200 : 330,
                }}
              >
                {h.recent.slice(0, viewDays).map((v, i) => {
                  const bg =
                    v === 0
                      ? "#1a1d21"
                      : v === 1
                      ? "#4ade80"
                      : v === 2
                      ? "#22c55e"
                      : v === 3
                      ? "#16a34a"
                      : "#0d8c3d";

                  return (
                    <div
                      key={i}
                      style={{
                        width: viewDays === 7 ? 24 : 12,
                        height: viewDays === 7 ? 24 : 12,
                        borderRadius: 4,
                        background: bg,
                      }}
                    />
                  );
                })}
              </div>

              {/* Buttons */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                <button
                  onClick={() => toggleToday(h.id)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    color: "#e8eef0",
                  }}
                >
                  {(h.recent[0] ?? 0) > 0 ? "Undo Today" : "Mark Today"}
                </button>

                <button
                  onClick={() => deleteHabit(h.id)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid #444",
                    color: "#bbb",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* CREATE HABIT MODAL */}
      {showCreate && (
        <div
          onMouseDown={() => setShowCreate(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: 600,
              background: "#1b2024",
              borderRadius: 12,
              padding: 24,
              color: "#e8eef0",
            }}
          >
            <h3>Create Habit</h3>

            <form
              onSubmit={createHabit}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <label>
                Habit Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 8,
                    background: "#0f1114",
                    border: "1px solid #333",
                    color: "#fff",
                  }}
                />
              </label>

              <label>
                Description (optional)
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 8,
                    background: "#0f1114",
                    border: "1px solid #333",
                    color: "#fff",
                  }}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid #444",
                    color: "#bbb",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: "#22c55e",
                    fontWeight: 700,
                    color: "#04150d",
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
