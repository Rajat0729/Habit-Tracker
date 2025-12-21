import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { saveDailyLog, getWeeklyLogs } from "../services/dailyLogApi.js";
import { deleteDailyLog } from "../services/deleteDailyLog.js";

import {
  exportLogsToJSON,
  importLogsFromJSON,
} from "../utils/backupUtils.js";
import { exportLogsToCSV } from "../utils/exportCsv.js";
import { exportLogsToExcel } from "../utils/exportExcel.js";
import { exportLogsToWord } from "../utils/exportWord.js";

import {
  saveLogToIndexedDB,
  loadAllLogsFromIndexedDB,
  deleteLogFromIndexedDB,
} from "../utils/indexedDb.js";

import { saveLogsToLocal } from "../utils/localBackup.js";
import { syncImportedLogs } from "../services/restoreService.js";

import type { DailyLog } from "../types/dailyLog.js";

/* =======================
   THEME
======================= */
const theme = {
  bg: "#0b1220",
  sidebar: "#0b1020",
  panel: "rgba(17,24,39,0.88)",
  panelSoft: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
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
  const [showExportMenu, setShowExportMenu] = useState(false);

  /* =======================
     LOAD LOGS (SERVER → IDB)
  ======================= */
  useEffect(() => {
    getWeeklyLogs()
      .then((logs) => {
        setWeeklyLogs(logs);
        logs.forEach(saveLogToIndexedDB);
      })
      .catch(async () => {
        const offline = await loadAllLogsFromIndexedDB();
        setWeeklyLogs(offline);
      });
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
  }

  /* =======================
     AUTOSAVE
  ======================= */
  useEffect(() => {
    if (!form) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = window.setTimeout(() => {
      const payload: DailyLog = {
        date: form.date,
        workSummary: form.workSummary,
        keyLearnings: form.keyLearnings.split("\n").filter(Boolean),
        issuesFaced: form.issuesFaced,
        hoursWorked: form.hoursWorked,
      };

      saveLogToIndexedDB(payload);
      saveLogsToLocal([payload]);
      saveDailyLog(payload).catch(() => {});
    }, 4000);
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

    saveLogToIndexedDB(payload);
    saveLogsToLocal([payload]);
    await saveDailyLog(payload);
  }

  /* =======================
     DELETE LOG
  ======================= */
  async function handleDeleteLog() {
    if (!form) return;
    if (!confirm(`Delete log for ${formatDate(form.date)}?`)) return;

    await deleteLogFromIndexedDB(form.date);
    localStorage.removeItem(`daily-log-${form.date}`);
    await deleteDailyLog(form.date);

    setWeeklyLogs((p) => p.filter((l) => l.date !== form.date));
    setActiveLog(null);
    setForm(null);
  }

  /* =======================
     EXPORT HANDLER
  ======================= */
  function handleExport(type: "json" | "csv" | "excel" | "word") {
    if (type === "json") exportLogsToJSON(weeklyLogs);
    if (type === "csv") exportLogsToCSV(weeklyLogs);
    if (type === "excel") exportLogsToExcel(weeklyLogs);
    if (type === "word") exportLogsToWord(weeklyLogs);
    setShowExportMenu(false);
  }

  /* =======================
     RENDER
  ======================= */
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 320px 1fr",
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          background: theme.sidebar,
          padding: 20,
          borderRight: `1px solid ${theme.border}`,
        }}
      >
        <h3 style={{ marginBottom: 24 }}>📘 DailyLog Pro</h3>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(34,197,94,0.15)",
              color: theme.accent,
              border: "none",
              cursor: "pointer",
            }}
          >
            Dashboard
          </button>

          <button
            disabled
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 10,
              background: "transparent",
              color: theme.muted,
              border: "none",
            }}
          >
            Weekly Summary
          </button>
        </nav>

        <button
          onClick={addTodayLog}
          style={{
            marginTop: 24,
            background: theme.accent,
            color: "#04150d",
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
        <div
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 16,
          }}
        >
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
                    ? theme.accentSoft
                    : theme.panelSoft,
                  border: active
                    ? `1px solid ${theme.accent}`
                    : `1px solid ${theme.border}`,
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {formatDate(log.date)}
                </div>
                <div style={{ fontSize: 12, color: theme.muted }}>
                  {firstLine(log.workSummary)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* EDITOR */}
      <section style={{ padding: 24 }}>
        {!form ? (
          <div style={{ color: theme.muted }}>
            Click “Add Today’s Log” to start
          </div>
        ) : (
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: 18,
              padding: 24,
            }}
          >
            {/* HEADER */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3>Daily Log Editor:</h3>

              <div style={{ position: "relative" }}>
                <button
                  onClick={() =>
                    setShowExportMenu((p) => !p)
                  }
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${theme.border}`,
                    background: theme.panelSoft,
                    color: theme.text,
                    cursor: "pointer",
                  }}
                >
                  ⬇ Export
                </button>

                {showExportMenu && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "110%",
                      background: "#0f172a",
                      border: `1px solid ${theme.border}`,
                      borderRadius: 10,
                      overflow: "hidden",
                      zIndex: 20,
                    }}
                  >
                    {[
                      ["JSON (Backup)", "json"],
                      ["CSV", "csv"],
                      ["Excel (.xlsx)", "excel"],
                      ["Word (.docx)", "word"],
                    ].map(([label, key]) => (
                      <div
                        key={key}
                        onClick={() =>
                          handleExport(key as any)
                        }
                        style={{
                          padding: "8px 14px",
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(255,255,255,0.08)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            "transparent")
                        }
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* FIELDS */}
            {[
              ["Work Summary", "workSummary", 90],
              ["Key Learnings", "keyLearnings", 80],
              ["Issues Faced", "issuesFaced", 60],
            ].map(([label, key, h]) => (
              <div key={key as string} style={{ marginBottom: 14 }}>
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
                    background: theme.panelSoft,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                  }}
                />
              </div>
            ))}

            {/* HOURS + DELETE */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: 20,
              }}
            >
              <div>
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
                    width: 100,
                    marginTop: 6,
                    padding: 8,
                    borderRadius: 10,
                    background: theme.panelSoft,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                  }}
                />
              </div>

              <button
                onClick={handleDeleteLog}
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: theme.danger,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1px solid rgba(239,68,68,0.35)`,
                  cursor: "pointer",
                }}
              >
                🗑 Delete This Log
              </button>
            </div>

            {/* SAVE */}
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
        )}
      </section>
    </div>
  );
}
