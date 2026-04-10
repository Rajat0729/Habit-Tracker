import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { saveDailyLog, getWeeklyLogs } from "../services/dailyLogApi.js";
import { deleteDailyLog } from "../services/deleteDailyLog.js";

import { exportLogsToJSON } from "../utils/backupUtils.js";
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
  sidebar: "#0d1424",
  panel: "rgba(17,24,39,0.85)",
  panelSoft: "rgba(255,255,255,0.03)",
  panelHover: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  text: "#f3f4f6",
  muted: "#9ca3af",
  accent: "#22c55e",
  accentHover: "#16a34a",
  accentSoft: "rgba(34,197,94,0.15)",
  danger: "#ef4444",
  dangerHover: "#dc2626",
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

const sortByDateDesc = (logs: DailyLog[]) =>
  [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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
  const inactivityTimer = useRef<number | null>(null);

  const [weeklyLogs, setWeeklyLogs] = useState<DailyLog[]>([]);
  const [activeLog, setActiveLog] = useState<DailyLog | null>(null);
  const [form, setForm] = useState<EditorForm | null>(null);
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);

  // Modals & Popovers
  const [showGlobalExport, setShowGlobalExport] = useState(false);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPastDate, setSelectedPastDate] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  /* =======================
     LOAD LOGS
  ======================= */
  useEffect(() => {
    getWeeklyLogs()
      .then((logs) => {
        const sorted = sortByDateDesc(logs);
        setWeeklyLogs(sorted);
        sorted.forEach(saveLogToIndexedDB);
      })
      .catch(async () => {
        const offline = await loadAllLogsFromIndexedDB();
        setWeeklyLogs(sortByDateDesc(offline));
      });
      
    return () => {
      if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
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
    setIsEditing(true);
  }

  function addPreviousLog(date: string) {
    setActiveLog(null);
    setForm({
      date,
      workSummary: "",
      keyLearnings: "",
      issuesFaced: "",
      hoursWorked: 0,
    });
    setIsEditing(true);
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
    setIsEditing(false); // Lock editing by default when viewing existing logs
  }

  /* =======================
     INPUT & INACTIVITY HANDLER
  ======================= */
  function handleInput(key: keyof EditorForm, value: string | number) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    
    // Reset inactivity timer on any typing
    if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
    inactivityTimer.current = window.setTimeout(() => {
      setIsEditing(false);
    }, 60000); // Lock after 60 seconds of inactivity
  }

  /* =======================
     AUTOSAVE
  ======================= */
  useEffect(() => {
    if (!form || !isEditing) return; // Only autosave changes if in edit mode
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = window.setTimeout(() => {
      const payload: DailyLog = {
        date: form.date,
        workSummary: form.workSummary,
        keyLearnings: form.keyLearnings.split("\n").filter(Boolean),
        issuesFaced: form.issuesFaced,
        hoursWorked: Number(form.hoursWorked),
      };

      saveLogToIndexedDB(payload);
      saveLogsToLocal([payload]);
      saveDailyLog(payload).catch(() => {});

      setWeeklyLogs((prev) =>
        sortByDateDesc([
          ...prev.filter((l) => l.date !== payload.date),
          payload,
        ])
      );
    }, 4000);
  }, [form, isEditing]);

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
      hoursWorked: Number(form.hoursWorked),
    };

    await saveLogToIndexedDB(payload);
    saveLogsToLocal([payload]);
    await saveDailyLog(payload);

    setWeeklyLogs((prev) =>
      sortByDateDesc([
        ...prev.filter((l) => l.date !== payload.date),
        payload,
      ])
    );
    
    setIsEditing(false); // Lock after explicitly saving
  }

  /* =======================
     DELETE
  ======================= */
  function openDeleteModal() {
    if (!form) return;
    setDeleteInput("");
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteLog() {
    if (!form) return;

    await deleteLogFromIndexedDB(form.date);
    localStorage.removeItem(`daily-log-${form.date}`);
    await deleteDailyLog(form.date);

    setWeeklyLogs((p) => p.filter((l) => l.date !== form.date));
    setActiveLog(null);
    setForm(null);
    setShowDeleteConfirm(false);
  }

  /* =======================
     EXPORT
  ======================= */
  function handleGlobalExport(type: "json" | "csv" | "excel" | "word") {
    let logsToExport = weeklyLogs;
    if (exportStart) logsToExport = logsToExport.filter(l => l.date >= exportStart);
    if (exportEnd) logsToExport = logsToExport.filter(l => l.date <= exportEnd);
    
    if (logsToExport.length === 0) {
      alert("No logs found in this date range.");
      return;
    }

    if (type === "json") exportLogsToJSON(logsToExport);
    if (type === "csv") exportLogsToCSV(logsToExport);
    if (type === "excel") exportLogsToExcel(logsToExport);
    if (type === "word") exportLogsToWord(logsToExport);
    
    setShowGlobalExport(false);
  }

  /* =======================
     AUTO RESIZE
  ======================= */
  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  /* =======================
     STYLES
  ======================= */
  const buttonStyle = {
    padding: "12px 16px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.2s ease-in-out",
    width: "100%",
  };

  const primaryBtn = {
    ...buttonStyle,
    background: theme.accent,
    color: "#fff",
    boxShadow: "0 4px 14px 0 rgba(34,197,94,0.39)",
  };

  const secondaryBtn = {
    ...buttonStyle,
    background: theme.panelSoft,
    color: theme.text,
    border: `1px solid ${theme.border}`,
  };

  const textOutputBox = {
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0)",
    border: `1px solid transparent`,
    color: theme.text,
    whiteSpace: "pre-wrap" as const,
    minHeight: "48px",
    lineHeight: "1.6",
  };

  const textInputBox = {
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(0,0,0,0.2)",
    border: `1px solid ${theme.border}`,
    color: theme.text,
    resize: "none" as const,
    width: "100%",
    outline: "none",
    lineHeight: "1.6",
    transition: "border 0.2s",
  };

  /* =======================
     RENDER
  ======================= */
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 340px 1fr",
        height: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          background: theme.sidebar,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          borderRight: `1px solid ${theme.border}`,
        }}
      >
        <h3 style={{ marginBottom: "32px", fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          📘 DailyLog Pro
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
          <button onClick={addTodayLog} style={primaryBtn} className="hover:bg-green-600">
            + Today’s Log
          </button>

          <button onClick={() => setShowDatePicker(true)} style={secondaryBtn} className="hover:bg-white/5">
            ⏳ Add Past Log
          </button>

          <div style={{ marginTop: "auto" }}>
            <button
              onClick={() => setShowGlobalExport(true)}
              style={secondaryBtn}
              className="hover:bg-white/5"
            >
              ⬇ Export Logs
            </button>
          </div>
        </div>
      </aside>

      {/* DATE PICKER MODAL */}
      {showDatePicker && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
            backdropFilter: "blur(4px)"
          }}
        >
          <div style={{ background: theme.panel, padding: "24px", borderRadius: "16px", width: "340px", border: `1px solid ${theme.border}` }}>
            <h4 style={{ marginBottom: "16px" }}>Select Past Date</h4>
            <input
              type="date"
              max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
              value={selectedPastDate}
              onChange={(e) => setSelectedPastDate(e.target.value)}
              style={{
                width: "100%", padding: "12px", borderRadius: "10px",
                background: theme.sidebar, border: `1px solid ${theme.border}`, color: theme.text,
                colorScheme: "dark"
              }}
            />

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button onClick={() => setShowDatePicker(false)} style={{ ...secondaryBtn, flex: 1 }}>
                Cancel
              </button>
              <button
                disabled={!selectedPastDate}
                onClick={() => {
                  addPreviousLog(selectedPastDate);
                  setShowDatePicker(false);
                  setSelectedPastDate("");
                }}
                style={{ ...primaryBtn, flex: 1, opacity: selectedPastDate ? 1 : 0.5 }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL EXPORT MODAL */}
      {showGlobalExport && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
            backdropFilter: "blur(4px)"
          }}
        >
          <div style={{ background: theme.panel, padding: "24px", borderRadius: "16px", width: "400px", border: `1px solid ${theme.border}` }}>
            <h4 style={{ marginBottom: "20px" }}>Export Logs</h4>
            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "13px", color: theme.muted, display: "block", marginBottom: "8px" }}>Start Date (Optional)</label>
                <input
                  type="date"
                  value={exportStart}
                  onChange={(e) => setExportStart(e.target.value)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "8px",
                    background: theme.sidebar, border: `1px solid ${theme.border}`, color: theme.text, colorScheme: "dark"
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "13px", color: theme.muted, display: "block", marginBottom: "8px" }}>End Date (Optional)</label>
                <input
                  type="date"
                  value={exportEnd}
                  onChange={(e) => setExportEnd(e.target.value)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "8px",
                    background: theme.sidebar, border: `1px solid ${theme.border}`, color: theme.text, colorScheme: "dark"
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button onClick={() => handleGlobalExport('json')} style={secondaryBtn} className="hover:bg-white/10">JSON</button>
              <button onClick={() => handleGlobalExport('csv')} style={secondaryBtn} className="hover:bg-white/10">CSV</button>
              <button onClick={() => handleGlobalExport('excel')} style={secondaryBtn} className="hover:bg-white/10">Excel</button>
              <button onClick={() => handleGlobalExport('word')} style={secondaryBtn} className="hover:bg-white/10">Word</button>
            </div>
            
            <button onClick={() => setShowGlobalExport(false)} style={{ ...secondaryBtn, marginTop: "24px", background: "transparent", border: "none" }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && form && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
            backdropFilter: "blur(4px)"
          }}
        >
          <div style={{ background: theme.panel, padding: "24px", borderRadius: "16px", width: "380px", border: `1px solid ${theme.border}`, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
            <h3 style={{ marginBottom: "16px", color: theme.danger, display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠️ Delete Log
            </h3>
            
            <p style={{ fontSize: "14px", color: theme.text, lineHeight: "1.5", marginBottom: "16px" }}>
              This action cannot be undone. This will permanently delete the daily log for <strong style={{ color: "#fff" }}>{formatDate(form.date)}</strong>.
            </p>

            <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px", border: `1px solid ${theme.border}`, marginBottom: "16px" }}>
              <p style={{ fontSize: "13px", color: theme.muted, margin: 0 }}>
                Please type <strong style={{ color: theme.danger }}>delete {form.date}</strong> to confirm.
              </p>
            </div>

            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={`delete ${form.date}`}
              style={{
                width: "100%", padding: "12px", borderRadius: "10px",
                background: theme.sidebar, border: `1px solid ${deleteInput === `delete ${form.date}` ? theme.danger : theme.border}`, color: theme.text,
                outline: "none"
              }}
            />

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }} style={{ ...secondaryBtn, flex: 1 }}>
                Cancel
              </button>
              <button
                disabled={deleteInput !== `delete ${form.date}`}
                onClick={confirmDeleteLog}
                style={{ 
                  ...primaryBtn, 
                  flex: 1, 
                  background: theme.danger,
                  boxShadow: "0 4px 14px 0 rgba(239, 68, 68, 0.39)",
                  opacity: deleteInput === `delete ${form.date}` ? 1 : 0.4,
                  cursor: deleteInput === `delete ${form.date}` ? "pointer" : "not-allowed"
                }}
              >
                Delete This Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY OVERVIEW */}
      <section style={{ padding: "24px", borderRight: `1px solid ${theme.border}` }}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <h4 style={{ marginBottom: "16px", fontWeight: 600 }}>History</h4>
          
          <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {weeklyLogs.map((log) => (
              <div
                key={log.date}
                onClick={() => openLog(log)}
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: activeLog?.date === log.date ? theme.panelHover : 'transparent',
                  border: `1px solid ${activeLog?.date === log.date ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
                }}
                className="hover:bg-white/5"
              >
                <div style={{ fontWeight: 600, marginBottom: "4px", color: activeLog?.date === log.date ? theme.text : theme.muted }}>
                  {formatDate(log.date)}
                </div>
                <div style={{ fontSize: "13px", color: theme.muted, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {firstLine(log.workSummary)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EDITOR */}
      <section style={{ padding: "32px", overflowY: "auto", position: "relative" }}>
        {!form ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted }}>
            <p>Select a log from history or add a new one.</p>
          </div>
        ) : (
          <div style={{ maxWidth: "800px", margin: "0 auto", background: theme.panel, borderRadius: "20px", border: `1px solid ${theme.border}`, padding: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            
            {/* EDITOR HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", paddingBottom: "24px", borderBottom: `1px solid ${theme.border}` }}>
              <div>
                <h2 style={{ margin: 0, fontWeight: 700 }}>{formatDate(form.date)}</h2>
                <div style={{ fontSize: "14px", color: theme.muted, marginTop: "4px" }}>
                  {isEditing ? "Editing Mode" : "Read Only"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                {!isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(true)} style={{...secondaryBtn, padding: "10px 20px"}} className="hover:bg-white/10">
                      ✎ Edit Log
                    </button>
                    <button onClick={openDeleteModal} style={{...secondaryBtn, padding: "10px 16px", borderColor: theme.danger, color: theme.danger}} className="hover:bg-red-500/10">
                      Delete
                    </button>
                  </>
                ) : (
                  <button onClick={manualSave} style={{...primaryBtn, padding: "10px 20px"}}>
                    ✔ Save & Lock
                  </button>
                )}
              </div>
            </div>

            {/* FORM FIELDS */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* HOURS WORKED */}
              <div>
                <label style={{ fontSize: "14px", fontWeight: 600, color: theme.muted, display: "block", marginBottom: "8px" }}>
                  Hours Worked
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.hoursWorked || ""}
                    onChange={(e) => handleInput("hoursWorked", Number(e.target.value))}
                    style={{ ...textInputBox, width: "120px" }}
                    placeholder="e.g. 5.5"
                  />
                ) : (
                  <div style={{ ...textOutputBox, minHeight: "auto", padding: "8px 16px" }}>
                    {form.hoursWorked || "0"} hrs
                  </div>
                )}
              </div>

              {/* TEXTAREAS */}
              {[
                { label: "Work Summary", key: "workSummary" as const, placeholder: "What did you accomplish today?" },
                { label: "Key Learnings", key: "keyLearnings" as const, placeholder: "Any new concepts, frameworks, or ideas you discovered?" },
                { label: "Issues Faced", key: "issuesFaced" as const, placeholder: "Blockers, bugs, or mental friction..." },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: theme.muted, display: "block", marginBottom: "8px" }}>
                    {label}
                  </label>
                  
                  {isEditing ? (
                    <textarea
                      value={form[key]}
                      placeholder={placeholder}
                      onChange={(e) => {
                        autoResize(e);
                        handleInput(key, e.target.value);
                      }}
                      onFocus={autoResize}
                      style={textInputBox}
                      className="focus:border-green-500/50"
                    />
                  ) : (
                    <div style={textOutputBox}>
                      {form[key] ? form[key] : <span style={{ opacity: 0.5 }}>No content</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
          </div>
        )}
      </section>
    </div>
  );
}

