import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveDailyLog, getWeeklyLogs } from "../services/dailyLogApi.js";
import type { DailyLog } from "../types/dailyLog.js";
import {
  exportLogsToJSON,
  importLogsFromJSON,
} from "../utils/backupUtils.js";
import { saveLogsToLocal } from "../utils/localBackup.js";
import { syncImportedLogs } from "../services/restoreService.js";

/* =======================
   THEME
======================= */
const theme = {
  bg: "#0b1220",
  sidebar: "#0b1020",
  panelGlass:
    "linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))",
  border: "rgba(255,255,255,0.12)",
  text: "#e5e7eb",
  muted: "#9ca3af",
  accent: "#22c55e",
  accentSoft: "rgba(34,197,94,0.15)",
  danger: "#ef4444",
};

/* =======================
   HELPERS
======================= */
const todayKey = () => new Date().toISOString().slice(0, 10);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const firstLine = (t?: string) =>
  t?.split("\n")[0]?.trim() || "No summary";

/* =======================
   TYPES
======================= */
type EditorForm = {
  date: string;
  workSummary: string;
  keyLearnings: string;
  issuesFaced: string;
  hoursWorked: number;
};

type SyncStatus =
  | "idle"
  | "typing"
  | "autosaving"
  | "synced"
  | "offline";

/* =======================
   UI COMPONENTS
======================= */
const GlassCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      background: theme.panelGlass,
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      border: `1px solid ${theme.border}`,
      boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
      borderRadius: 18,
    }}
  >
    {children}
  </div>
);

const StatusPill = ({
  text,
  green,
}: {
  text: string;
  green?: boolean;
}) => (
  <span
    style={{
      padding: "6px 12px",
      borderRadius: 999,
      fontSize: 12,
      background: green
        ? theme.accentSoft
        : "rgba(255,255,255,0.08)",
      color: green ? theme.accent : theme.muted,
      border: `1px solid ${theme.border}`,
      backdropFilter: "blur(8px)",
    }}
  >
    {text}
  </span>
);

const ActionBtn = ({
  text,
  danger,
  onClick,
}: {
  text: string;
  danger?: boolean;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 12px",
      borderRadius: 10,
      fontSize: 12,
      background: danger
        ? "rgba(239,68,68,0.15)"
        : "rgba(255,255,255,0.08)",
      color: danger ? theme.danger : theme.text,
      border: `1px solid ${theme.border}`,
      backdropFilter: "blur(8px)",
      cursor: "pointer",
    }}
  >
    {text}
  </button>
);

/* =======================
   COMPONENT
======================= */
export default function DailyLogPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimer = useRef<number | null>(null);

  const [weeklyLogs, setWeeklyLogs] = useState<DailyLog[]>([]);
  const [activeLog, setActiveLog] = useState<DailyLog | null>(null);
  const [form, setForm] = useState<EditorForm | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");

  /* =======================
     LOAD WEEKLY LOGS
  ======================= */
  useEffect(() => {
    getWeeklyLogs()
      .then((logs) =>
        setWeeklyLogs(
          logs
            .filter(Boolean)
            .sort(
              (a, b) =>
                new Date(b.date).getTime() -
                new Date(a.date).getTime()
            )
        )
      )
      .catch(() => setWeeklyLogs([]));
  }, []);

  /* =======================
     ADD / OPEN LOG
  ======================= */
  function addTodayLog() {
    setActiveLog(null);
    setForm({
      date: todayKey(),
      workSummary: "",
      keyLearnings: "",
      issuesFaced: "",
      hoursWorked: 0,
    });
  }

  function openLog(log: DailyLog) {
    setActiveLog(log);
    setForm({
      date: log.date,
      workSummary: log.workSummary ?? "",
      keyLearnings: log.keyLearnings?.join("\n") ?? "",
      issuesFaced: log.issuesFaced ?? "",
      hoursWorked: log.hoursWorked ?? 0,
    });
    setStatus("synced");
  }

  /* =======================
     AUTOSAVE (SERVER + LOCAL)
  ======================= */
  useEffect(() => {
    if (!form) return;
    setStatus("typing");

    if (autosaveTimer.current)
      clearTimeout(autosaveTimer.current);

    autosaveTimer.current = window.setTimeout(() => {
      setStatus("autosaving");

      const payload: DailyLog = {
        date: form.date,
        workSummary: form.workSummary,
        keyLearnings: form.keyLearnings.split("\n").filter(Boolean),
        issuesFaced: form.issuesFaced,
        hoursWorked: form.hoursWorked,
      };

      saveLogsToLocal([payload]);

      saveDailyLog(payload)
        .then(() => setStatus("synced"))
        .catch(() => setStatus("offline"));
    }, 5000);
  }, [form]);

  /* =======================
     MANUAL SAVE
  ======================= */
  async function manualSave() {
    if (!form) return;

    const payload: DailyLog = {
      date: form.date,
      workSummary: form.workSummary,
      keyLearnings: form.keyLearnings.split("\n").filter(Boolean),
      issuesFaced: form.issuesFaced,
      hoursWorked: form.hoursWorked,
    };

    saveLogsToLocal([payload]);
    await saveDailyLog(payload);
    setStatus("synced");
  }

  /* =======================
     RESTORE FROM BACKUP
  ======================= */
  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const logs = await importLogsFromJSON(file);
      saveLogsToLocal(logs);
      await syncImportedLogs(logs);
      setWeeklyLogs(logs);
      alert("Backup restored successfully");
    } catch {
      alert("Invalid backup file");
    }
  }

  /* =======================
     RENDER
  ======================= */
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 340px 1fr",
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          background: "linear-gradient(180deg,#0b1020,#0f172a)",
          padding: 20,
          boxShadow: "inset -1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <h3 style={{ marginBottom: 24 }}>📘 DailyLog Pro</h3>
        <button onClick={() => navigate("/dashboard")}>Dashboard</button>
        <button disabled>Weekly Summary</button>

        <button
          onClick={addTodayLog}
          style={{
            marginTop: 24,
            background: theme.accent,
            padding: 12,
            borderRadius: 12,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          + Add Today’s Log
        </button>
      </aside>

      {/* WEEKLY OVERVIEW */}
      <section style={{ padding: 20 }}>
        <GlassCard>
          <div style={{ padding: 16 }}>
            <h4>Weekly Overview</h4>

            {weeklyLogs.map((log) => {
              const active = activeLog?.date === log.date;
              return (
                <div
                  key={log.date}
                  onClick={() => openLog(log)}
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    cursor: "pointer",
                    background: active
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <div style={{ display: "flex", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: theme.accent,
                        marginTop: 6,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {formatDate(log.date)}
                      </div>
                      <div style={{ fontSize: 12, color: theme.muted }}>
                        {firstLine(log.workSummary)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </section>

      {/* EDITOR */}
      <section style={{ padding: 24 }}>
        {!form ? (
          <div style={{ color: theme.muted }}>
            Click “Add Today’s Log” to start
          </div>
        ) : (
          <>
            {/* TOP BAR */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <StatusPill green text="Online & Synced" />
              <StatusPill text="Saved locally" />

              <ActionBtn
                text="⬇ Full Backup (JSON)"
                onClick={() => exportLogsToJSON(weeklyLogs)}
              />

              <ActionBtn
                text="🔄 Restore Backup"
                onClick={() => fileInputRef.current?.click()}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                hidden
                onChange={handleRestore}
              />
            </div>

            <GlassCard>
              <div style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 16 }}>
                  Daily Log Editor: {formatDate(form.date)}
                </h3>

                {[
                  ["Work Summary", "workSummary", 100],
                  ["Key Learnings", "keyLearnings", 80],
                  ["Issues Faced", "issuesFaced", 60],
                ].map(([label, key, h]) => (
                  <div key={key as string} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: theme.muted }}>
                      {label}
                    </label>
                    <textarea
                      value={(form as any)[key as string]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [key as string]: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        marginTop: 6,
                        padding: 12,
                        minHeight: h as number,
                        borderRadius: 12,
                        background: "rgba(31,41,55,0.8)",
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                      }}
                    />
                  </div>
                ))}

                <label style={{ fontSize: 13, color: theme.muted }}>
                  Hours Worked
                </label>
                <input
                  type="number"
                  value={form.hoursWorked}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hoursWorked: +e.target.value,
                    })
                  }
                  style={{
                    width: 120,
                    marginTop: 6,
                    marginBottom: 20,
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(31,41,55,0.8)",
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                  }}
                />

                <button
                  onClick={manualSave}
                  style={{
                    width: "100%",
                    background:
                      "linear-gradient(180deg,#22c55e,#16a34a)",
                    padding: 14,
                    borderRadius: 14,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Save & Sync
                </button>
              </div>
            </GlassCard>
          </>
        )}
      </section>
    </div>
  );
}
