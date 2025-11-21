import React, { useEffect, useState } from "react";
import { clearToken } from "../utils/auth.js";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

type Habit = {
  id: string;
  name: string;
  frequency: "Daily" | "Weekly" | "Monthly";
  timesPerDay: number;       // NEW
  description?: string;
  createdAt: string;
  recent: number[];          // NOW STORING intensity (0–4)
};

const STORAGE_KEY = "habitflow_habits_v2";

export default function Dashboard() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Modal fields
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [description, setDescription] = useState("");

  // Load habits
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setHabits(JSON.parse(raw));
      } catch {
        setHabits([]);
      }
    }
  }, []);

  // Save habits
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  function openModal() {
    setName("");
    setFrequency("Daily");
    setTimesPerDay(1);
    setDescription("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  function createHabit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) return alert("Please enter a habit name");

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: name.trim(),
      frequency,
      timesPerDay,
      description: description.trim(),
      createdAt: new Date().toISOString(),
      recent: Array(21).fill(0),        // 0 = not done
    };

    setHabits((s) => [newHabit, ...s]);
    setShowModal(false);
  }

  function markToday(id: string) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;

        const newArr = [...h.recent];
        let todayCount = newArr[0] ?? 0;

        todayCount = Math.min(todayCount + 1, 4); // cap at 4 (exceeded)

        newArr[0] = todayCount;
        return { ...h, recent: newArr };
      })
    );
  }

  function deleteHabit(id: string) {
    if (!confirm("Delete this habit?")) return;
    setHabits((p) => p.filter((h) => h.id !== id));
  }

  const isEmpty = habits.length === 0;

  return (
    
    <div className="dash-root">
      <header className="dash-topbar">
        <div className="brand">
          <div className="brand-icon" />
          <div className="brand-text">HabitFlow</div>
        </div>
        <div className="top-actions">
          <div className="username">John Doe</div>
        </div>
      </header>

      <main className="dash-content">
        <div className="controls-row">
          <button className="btn add-btn" onClick={openModal}>+ Add Habit</button>
          <div className="spacer" />
          <div className="sort-placeholder">Sort by ▾</div>
        </div>

        {isEmpty ? (
          <div className="empty-state">
            <h2>Welcome to HabitFlow</h2>
            <p className="quote">
              Start small. Stay consistent. Build a better you.
            </p>
            <p className="muted">
              This message disappears when you add your first habit.
            </p>
          </div>
        ) : (
          <div className="habit-list">
            {habits.map((h) => (
              <div key={h.id} className="habit-card">
                <div className="habit-left">
                  <div className="habit-title">{h.name}</div>
                  <div className="habit-sub">
                    Current Streak: {
                      (() => {
                        let cnt = 0;
                        for (let i = 0; i < h.recent.length; i++) {
                          const v = h.recent[i] ?? 0;
                          if (v > 0) cnt++;
                          else break;
                        }
                        return cnt;
                      })()
                    } 🔥
                  </div>
                  <div className="habit-sub">
                    Goal: {h.timesPerDay} times/day
                  </div>
                </div>

                {/* HEATMAP */}
                <div className="habit-heatmap">
                  {h.recent.map((v, i) => (
                    <div key={i} className={`square shade-${v}`} />
                  ))}
                </div>

                <div className="habit-actions">
                  <button className="btn small" onClick={() => markToday(h.id)}>
                    Mark Today
                  </button>
                  <button className="btn ghost small" onClick={() => deleteHabit(h.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Create a new habit.</h3>

            <form className="modal-form" onSubmit={createHabit}>
              <div className="form-row two">
                <label>
                  Habit Name
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </label>

                <label>
                  Frequency
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </label>
              </div>

              <label>
                Times Per Day (required)
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={timesPerDay}
                  onChange={(e) => setTimesPerDay(Number(e.target.value))}
                />
              </label>

              <label>
                Description / Goal (optional)
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn primary">Create Habit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
