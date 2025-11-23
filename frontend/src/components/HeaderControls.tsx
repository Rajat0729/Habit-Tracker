import React from "react";

type Props = {
  isMobile: boolean;
  search: string;
  setSearch: (s: string) => void;
  frequencyFilter: string;
  setFrequencyFilter: (v: any) => void;
  viewDaysMode: "weekly" | "monthly";
  setViewDaysMode: (v: any) => void;
  sortMode: "name" | "current" | "longest";
  setSortMode: (v: any) => void;
  logout: () => void;
};

export default function HeaderControls(props: Props) {
  const {
    isMobile,
    search,
    setSearch,
    frequencyFilter,
    setFrequencyFilter,
    viewDaysMode,
    setViewDaysMode,
    sortMode,
    setSortMode,
    logout,
  } = props;

  const controlInputStyle = (w = 160): React.CSSProperties => ({
    padding: 8,
    borderRadius: 8,
    border: "1px solid #222",
    background: "#0e1113",
    color: "#ddd",
    width: isMobile ? "100%" : w,
    minWidth: isMobile ? undefined : 80,
    boxSizing: "border-box",
  });

  return (
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
          background: "#0e1113",
          color: "#ddd",
          width: isMobile ? "100%" : 220,
          boxSizing: "border-box",
        }}
      />

      <select value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)} style={controlInputStyle()}>
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
  );
}
