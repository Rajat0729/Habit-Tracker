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
  const autosaveTimer = useRef<number | null>(null);

  const [weeklyLogs, setWeeklyLogs] = useState<DailyLog[]>([]);
  const [activeLog, setActiveLog] = useState<DailyLog | null>(null);
  const [form, setForm] = useState<EditorForm | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  /* =======================
     LOAD LOGS
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
     DELETE
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
     EXPORT (UNCHANGED + SAFE)
  ======================= */
  function handleExport(type: "json" | "csv" | "excel" | "word") {
    if (type === "json") exportLogsToJSON(weeklyLogs);
    if (type === "csv") exportLogsToCSV(weeklyLogs);
    if (type === "excel") exportLogsToExcel(weeklyLogs);
    if (type === "word") exportLogsToWord(weeklyLogs);
    setShowExportMenu(false);
  }

  /* =======================
     TEXTAREA AUTO-RESIZE
  ======================= */
  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  /* =======================
     RENDER
  ======================= */
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 320px 1fr",
        height: "100vh",
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
            width: "100%",
          }}
        >
          + Add Today’s Log
        </button>
      </aside>

      {/* WEEKLY OVERVIEW (SCROLL FIX) */}
      <section style={{ padding: 20 }}>
        <div
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 16,
            maxHeight: "calc(100vh - 40px)",
            overflowY: "auto",
          }}
        >
          <h4 style={{ marginBottom: 12 }}>Weekly Overview</h4>

          {weeklyLogs.map((log) => {
            const active = activeLog?.date === log.date;
            return (
              <div
                key={log.date}
                onClick={() => openLog(log)}
                style={{
                  marginBottom: 10,
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
      <section style={{ padding: 24, overflowY: "auto" }}>
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
                marginBottom: 16,
              }}
            >
              <h3>Daily Log Editor</h3>

              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowExportMenu((p) => !p)}
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
                        onClick={() => handleExport(key as any)}
                        style={{
                          padding: "8px 14px",
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {[
              ["Work Summary", "workSummary"],
              ["Key Learnings", "keyLearnings"],
              ["Issues Faced", "issuesFaced"],
            ].map(([label, key]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: theme.muted }}>
                  {label}
                </label>
                <textarea
                  value={(form as any)[key]}
                  onChange={(e) => {
                    autoResize(e);
                    setForm({ ...form, [key]: e.target.value });
                  }}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 12,
                    borderRadius: 12,
                    background: theme.panelSoft,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    resize: "none",
                    overflow: "hidden",
                  }}
                />
              </div>
            ))}

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
