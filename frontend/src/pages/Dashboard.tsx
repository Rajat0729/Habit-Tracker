import React, { useEffect, useMemo, useState } from "react";
import { clearToken } from "../utils/auth.js";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, fetchWithAuth } from "../services/api.js";

type Habit = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  timesPerDay: number;
  frequency: "Daily" | "Weekly" | "Monthly";
  recent: number[];
  currentStreak?: number;
  longestStreak?: number;
};

const STORAGE_KEY = "habitflow_habits_v2";


export default function Dashboard() {
  const navigate = useNavigate();

 
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<Habit["frequency"]>("Daily");
  const [timesPerDay, setTimesPerDay] = useState<number>(1);
  const [description, setDescription] = useState("");

  const [viewDaysMode, setViewDaysMode] = useState<"weekly" | "monthly">("weekly");
  const [viewDays, setViewDays] = useState<number>(7);
  const [sortMode, setSortMode] = useState<"name" | "current" | "longest">("name");
  const [search, setSearch] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<"all" | Habit["frequency"]>("all");

  
  const [width, setWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1200);
  const isMobile = width < 720;
  const isTablet = width >= 720 && width < 1024;

  useEffect(() => {
    setViewDays(viewDaysMode === "weekly" ? 7 : 28);
  }, [viewDaysMode]);

  
  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  
  useEffect(() => {
    loadHabits();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch {}
  }, [habits]);

  
  function normalizeServerHabit(raw: any): Habit {
    const id = raw.id ?? raw._id ?? String(Date.now());
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
      currentStreak: raw.currentStreak ?? 0,
      longestStreak: raw.longestStreak ?? 0,
    };
  }

  function isObjectId(id: string) {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

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

  
  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) return alert("Please enter habit name");
    const payload = { name: name.trim(), frequency, timesPerDay, description };

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await loadHabits();
        closeCreate();
        return;
      }
    } catch (err) {
      console.error(err);
      
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
      closeCreate();
    }
  }

  function closeCreate() {
    setShowCreate(false);
    setName("");
    setDescription("");
    setTimesPerDay(1);
    setFrequency("Daily");
  }

  
  async function toggleToday(id: string) {
    if (isObjectId(id)) {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/habits/${id}/complete`, { method: "POST" });
        if (res.ok) {
          const j = await res.json().catch(() => null);
          if (j?.habit) {
            const updated = normalizeServerHabit(j.habit);
            setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
            return;
          }
          await loadHabits();
          return;
        }
      } catch {}
    }

    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const next = [...(h.recent ?? Array(28).fill(0))];
        const todayVal = next[0] ?? 0;
        next[0] = todayVal > 0 ? 0 : 1;
        return { ...h, recent: next, currentStreak: calcCurrentStreak(next), longestStreak: calcLongestStreak(next) };
      })
    );
  }

  
  async function handleDelete(id: string) {
    if (!confirm("Delete this habit?")) return;
    if (isObjectId(id)) {
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

  
  function calcCurrentStreak(recent: number[]) {
    let cnt = 0;
    for (let i = 0; i < recent.length; i++) {
      if ((recent[i] ?? 0) > 0) cnt++;
      else break;
    }
    return cnt;
  }

  function calcLongestStreak(recent: number[]) {
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

  
  function daysInMonth(year: number, month0: number) {
    return new Date(year, month0 + 1, 0).getDate();
  }

  function dateToYMD(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString().slice(0, 10);
  }

  function dateDiffDays(a: Date, b: Date) {
    const ad = new Date(a);
    ad.setHours(0, 0, 0, 0);
    const bd = new Date(b);
    bd.setHours(0, 0, 0, 0);
    const diff = Math.round((ad.getTime() - bd.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function buildMonthDataForHabit(h: Habit, year: number, month0: number) {
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

  function colorForRatio(ratio: number) {
    if (ratio <= 0) return "#1a1d21";
    if (ratio < 0.5) return "#a7f3d0";
    if (ratio < 1) return "#4ade80";
    if (ratio < 1.5) return "#16a34a";
    return "#0b6b36";
  }

  function miniBarData(h: Habit) {
    const now = new Date();
    const year = now.getFullYear(),
      month0 = now.getMonth();
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

  function logout() {
    clearToken();
    navigate("/login");
  }

  
  const base = {
    pageBg: "#0b0d0f",
    panelBg: "rgba(255,255,255,0.02)",
    accent: "#22c55e",
    subtle: "#9fb3b7",
    text: "#e8eef0",
    mutedInputBg: "#0e1113",
    cardRadius: 12,
  };

  
  const cellSize = isMobile ? 24 : isTablet ? 26 : 28; 
  const monthCellSize = isMobile ? 10 : 12;

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

  const controlInputStyle = (w = 160): React.CSSProperties => ({
    padding: 8,
    borderRadius: 8,
    border: "1px solid #222",
    background: base.mutedInputBg,
    color: "#ddd",
    width: isMobile ? "auto" : w,
    minWidth: isMobile ? undefined : 80,
    boxSizing: "border-box",
  });

  const addButtonStyle: React.CSSProperties = {
    background: base.accent,
    color: "#04150d",
    padding: "10px 14px",
    borderRadius: 8,
    fontWeight: 700,
    border: "none",
  };

  
  return (
    <div style={{ minHeight: "100vh", background: base.pageBg, color: base.text, fontFamily: "Inter, system-ui, sans-serif", paddingBottom: 40 }}>
      <header style={headerStyle}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", width: isMobile ? "100%" : "auto" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(180deg,#0af575,#0f8f4b)" }} />
          <div style={{ fontWeight: 700, fontSize: 18 }}>HabitFlow</div>
        </div>

        {}
        <div
          style={{
            marginLeft: isMobile ? 0 : "auto",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
            justifyContent: isMobile ? "flex-start" : "flex-end",
          }}
        >
          <input
            placeholder="Search habits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid #222",
              background: base.mutedInputBg,
              color: "#ddd",
              width: isMobile ? "100%" : 220,
              boxSizing: "border-box",
            }}
          />

          <select value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value as any)} style={controlInputStyle()}>
            <option value="all">All frequencies</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>

          <select value={viewDaysMode} onChange={(e) => setViewDaysMode(e.target.value as any)} style={controlInputStyle(isMobile ? 140 : 140)}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} style={controlInputStyle(isMobile ? 140 : 160)}>
            <option value="name">Name (A–Z)</option>
            <option value="current">Current streak</option>
            <option value="longest">Longest streak</option>
          </select>

          <button onClick={logout} style={{ padding: "8px 12px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#cbd6d9" }}>
            Logout
          </button>
        </div>
      </header>

      <main style={containerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowCreate(true)} style={addButtonStyle}>
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

          {loading && (
            <div style={{ color: base.subtle, padding: 20, textAlign: "center" }}>
              Loading...
            </div>
          )}

          {filtered.map((h) => {
            const now = new Date();
            const month0 = now.getMonth();
            const year = now.getFullYear();
            const monthData = buildMonthDataForHabit(h, year, month0);
            const weeks = miniBarData(h);

            
            const rowStyleMobile: React.CSSProperties = {
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "stretch",
              padding: 12,
              borderRadius: base.cardRadius,
              background: base.panelBg,
              width: "100%",
              boxSizing: "border-box",
            };

            const rowStyleDesktop: React.CSSProperties = {
              display: "flex",
              gap: 16,
              alignItems: "center",
              padding: 14,
              borderRadius: base.cardRadius,
              background: base.panelBg,
              width: "100%",
              boxSizing: "border-box",
            };

            const leftColStyle: React.CSSProperties = {
              width: isMobile ? "100%" : 260,
              flexShrink: 0,
              boxSizing: "border-box",
            };

            const heatmapWrapperStyle: React.CSSProperties = {
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              width: "100%",
            };

            const miniBarsStyle: React.CSSProperties = {
              width: isMobile ? "100%" : 120,
              display: "flex",
              gap: 6,
              alignItems: "flex-end",
              justifyContent: isMobile ? "flex-start" : "center",
              flexWrap: isMobile ? "wrap" : "nowrap",
            };

            const actionsStyleMobile: React.CSSProperties = {
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              width: "100%",
            };

            const actionsStyleDesktop: React.CSSProperties = {
              display: "flex",
              gap: 8,
              marginLeft: "auto",
            };

            return (
              <div key={h.id} style={isMobile ? rowStyleMobile : rowStyleDesktop}>
                <div style={leftColStyle}>
                  <div style={{ fontSize: 18, fontWeight: 700, wordBreak: "break-word" }}>{h.name}</div>
                  <div style={{ marginTop: 6, color: base.subtle, fontSize: 13 }}>
                    {h.timesPerDay} target / day · {h.frequency}
                  </div>
                  <div style={{ marginTop: 8, color: base.subtle, fontSize: 13 }}>
                    Current streak: {h.currentStreak ?? calcCurrentStreak(h.recent)} 🔥
                  </div>
                  {isMobile && h.description ? (
                    <div style={{ marginTop: 8, color: "#cbd6d9", fontSize: 13 }}>{h.description}</div>
                  ) : null}
                </div>

                <div style={{ flex: 1, display: "flex", alignItems: isMobile ? "stretch" : "center", gap: 12, flexDirection: isMobile ? "column" : "row", boxSizing: "border-box" }}>
                  {}
                  {viewDaysMode === "weekly" ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        overflowX: isMobile ? "auto" : "visible",
                        paddingBottom: isMobile ? 6 : 0,
                        alignItems: "center",
                        flexWrap: isMobile ? "nowrap" : "nowrap",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      {}
                      {h.recent.slice(0, viewDays).map((count, i) => {
                        const ratio = h.timesPerDay > 0 ? Math.min((count ?? 0) / h.timesPerDay, 2) : (count ? 1 : 0);
                        const bg = colorForRatio(ratio);
                        const size = cellSize;
                        return (
                          <div
                            key={i}
                            title={`${i === 0 ? "Today" : `${i} day(s) ago`} • ${count ?? 0}/${h.timesPerDay}`}
                            style={{
                              width: size,
                              height: size,
                              borderRadius: 6,
                              background: bg,
                              display: "inline-block",
                              border: "1px solid rgba(0,0,0,0.25)",
                              flex: "0 0 auto",
                            }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: isMobile ? "100%" : 340, alignItems: "center" }}>
                      {monthData.map((cell) => {
                        const bg = cell.active ? colorForRatio(cell.ratio) : "#15171a";
                        const opacity = cell.active ? 1 : 0.35;
                        return (
                          <div
                            key={cell.dateISO}
                            title={`${cell.dateISO} • ${cell.count}/${h.timesPerDay}`}
                            style={{
                              width: monthCellSize,
                              height: monthCellSize,
                              borderRadius: 3,
                              background: bg,
                              opacity,
                              flex: "0 0 auto",
                            }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {}
                  <div style={miniBarsStyle}>
                    {weeks.map((w, i) => (
                      <div
                        key={i}
                        style={{
                          width: 18,
                          height: `${Math.max(6, (w / 100) * 72)}px`,
                          background: w >= 75 ? "#0d8c3d" : "#22c55e",
                          borderRadius: 6,
                          flex: "0 0 auto",
                        }}
                        title={`${w}%`}
                      />
                    ))}
                  </div>
                </div>

                {}
                <div style={isMobile ? actionsStyleMobile : actionsStyleDesktop}>
                  <button
                    onClick={() => toggleToday(h.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                      color: "#e8eef0",
                      border: "none",
                      flex: isMobile ? 1 : undefined,
                      minWidth: 0,
                    }}
                  >
                    {(h.recent?.[0] ?? 0) > 0 ? "Undo Today" : "Mark Today"}
                  </button>

                  <button
                    onClick={() => handleDelete(h.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#9fb3b7",
                      flex: isMobile ? 1 : undefined,
                      minWidth: 0,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {}
      {showCreate && (
        <div
          onMouseDown={() => setShowCreate(false)}
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: isMobile ? "100%" : 640,
              background: "#121417",
              padding: 20,
              borderRadius: 12,
              color: "#e8eef0",
              maxHeight: "90vh",
              overflow: "auto",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 12 }}>Create a new habit</h3>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 14 }}>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8, background: "#0f1114", border: "1px solid #222", color: "#fff", boxSizing: "border-box" }} />
              </label>

              <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                <label style={{ flex: 1 }}>
                  Frequency
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)} style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8, background: "#0f1114", border: "1px solid #222", color: "#fff", boxSizing: "border-box" }}>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </label>

                <label style={{ width: isMobile ? "100%" : 140 }}>
                  Target / day
                  <input type="number" min={1} max={100} value={timesPerDay} onChange={(e) => setTimesPerDay(Math.max(1, Number(e.target.value || 1)))} style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8, background: "#0f1114", border: "1px solid #222", color: "#fff", boxSizing: "border-box" }} />
                </label>
              </div>

              <label>
                Description (optional)
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8, background: "#0f1114", border: "1px solid #222", color: "#fff", minHeight: 80, boxSizing: "border-box" }} />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={closeCreate} style={{ padding: "8px 12px", borderRadius: 8, background: "transparent", border: "1px solid #333", color: "#ccc" }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: "8px 12px", borderRadius: 8, background: "#22c55e", color: "#04150d", fontWeight: 700 }}>
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
