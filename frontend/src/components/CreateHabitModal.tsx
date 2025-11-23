import React from "react";
import { type Habit } from "../types/habit.js";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; frequency: Habit["frequency"]; timesPerDay: number; description: string }) => void;
  defaultName?: string;
};

export default function CreateHabitModal({ isOpen, onClose, onCreate }: Props) {
  const [name, setName] = React.useState("");
  const [frequency, setFrequency] = React.useState<Habit["frequency"]>("Daily");
  const [timesPerDay, setTimesPerDay] = React.useState<number>(1);
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) {
      setName("");
      setFrequency("Daily");
      setTimesPerDay(1);
      setDescription("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={onClose}
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
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 640, background: "#121417", padding: 20, borderRadius: 12, color: "#e8eef0", maxHeight: "90vh", overflow: "auto", boxSizing: "border-box" }}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Create a new habit</h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return alert("Please enter habit name");
            onCreate({ name: name.trim(), frequency, timesPerDay, description });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <label style={{ fontSize: 14 }}>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8, background: "#0f1114", border: "1px solid #222", color: "#fff", boxSizing: "border-box" }} />
          </label>

          <div style={{ display: "flex", gap: 10, flexDirection: "row" }}>
            <label style={{ flex: 1 }}>
              Frequency
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)} style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8, background: "#0f1114", border: "1px solid #222", color: "#fff", boxSizing: "border-box" }}>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </label>

            <label style={{ width: 140 }}>
              Target / day
              <input type="number" min={1} max={100} value={timesPerDay} onChange={(e) => setTimesPerDay(Math.max(1, Number(e.target.value || 1)))} style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8, background: "#0f1114", border: "1px solid #222", color: "#fff", boxSizing: "border-box" }} />
            </label>
          </div>

          <label>
            Description (optional)
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8, background: "#0f1114", border: "1px solid #222", color: "#fff", minHeight: 80, boxSizing: "border-box" }} />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 12px", borderRadius: 8, background: "transparent", border: "1px solid #333", color: "#ccc" }}>
              Cancel
            </button>
            <button type="submit" style={{ padding: "8px 12px", borderRadius: 8, background: "#22c55e", color: "#04150d", fontWeight: 700 }}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
