import { useState, useEffect } from "react";
import { Card, PageHeader, ST, Btn, BADGE, downloadJson } from "../components/shared";
import { NAV, TOOL_DESC } from "../constants";

const ACCENT = "#b47fff";

const SKIP_IDS = new Set(["home", "workspace"]);

const tabStyle = (active, color = ACCENT) => ({
  padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400,
  background: active ? color + "22" : "transparent",
  color: active ? color : "#4a5568",
  border: `1px solid ${active ? color + "44" : "transparent"}`,
  transition: "all 0.15s",
});

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "adesso";
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  return `${Math.floor(h / 24)}d fa`;
}

function LogEntry({ entry, onOpen }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onOpen(entry.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "#0f1a2e" : "#0d1626",
        borderRadius: 8, padding: "12px 14px", marginBottom: 8,
        cursor: "pointer", borderLeft: `3px solid ${ACCENT}44`,
        border: `1px solid ${hov ? "#2a3f5f" : "#1f2d45"}`,
        borderLeftColor: ACCENT + "55",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 16 }}>{entry.icon}</span>
            <span style={{ fontWeight: 700, color: hov ? "#ffffff" : "#e2e8f0", fontSize: 13 }}>{entry.label}</span>
            <BADGE text="ANALYSED" color="#b47fff" />
          </div>
          <div style={{ color: "#4a5568", fontSize: 10, fontFamily: "monospace", marginBottom: entry.excerpt ? 6 : 0 }}>
            {new Date(entry.ts).toISOString().slice(0, 16).replace("T", " ")} UTC
          </div>
          {entry.excerpt ? (
            <div style={{ color: "#9ca3af", fontSize: 11, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {entry.excerpt}
            </div>
          ) : (
            <div style={{ color: "#2d3f55", fontSize: 11, fontStyle: "italic" }}>{TOOL_DESC[entry.id] || ""}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, marginLeft: 14, flexShrink: 0 }}>
          <span style={{ color: "#4a5568", fontSize: 11, fontFamily: "monospace" }}>{timeAgo(entry.ts)}</span>
          <span style={{ color: ACCENT, fontSize: 10 }}>→ apri</span>
        </div>
      </div>
    </div>
  );
}

// SVG timeline: each tool as a dot on a 24h horizontal axis
function ActivityTimeline({ log }) {
  if (!log.length) return null;
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const W = 400, H = 64, PAD = { left: 14, right: 14 };
  const innerW = W - PAD.left - PAD.right;
  const recentLog = log.filter(e => now - e.ts <= DAY_MS);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>24H ACTIVITY TIMELINE</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", background: "#050d1a", borderRadius: 8 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const x = PAD.left + frac * innerW;
          return <line key={i} x1={x} y1={10} x2={x} y2={44} stroke="#0a1830" strokeWidth="1" />;
        })}
        {/* Axis */}
        <line x1={PAD.left} y1={44} x2={W - PAD.right} y2={44} stroke="#1f2d45" strokeWidth="1" />
        {/* Labels */}
        {["24h ago", "18h", "12h", "6h", "Now"].map((label, i) => {
          const x = PAD.left + (i / 4) * innerW;
          return <text key={i} x={x} y={58} textAnchor="middle" fill="#4a5568" fontSize="6.5">{label}</text>;
        })}
        {/* Dots */}
        {recentLog.map((entry, i) => {
          const age = now - entry.ts;
          const x = PAD.left + (1 - age / DAY_MS) * innerW;
          return (
            <g key={i}>
              <circle cx={x} cy={30} r={6} fill={ACCENT} opacity="0.15" />
              <circle cx={x} cy={30} r={3} fill={ACCENT} opacity="0.9" />
              <text x={x} y={22} textAnchor="middle" fill="#9ca3af" fontSize="8">{entry.icon}</text>
            </g>
          );
        })}
        {recentLog.length === 0 && (
          <text x={W / 2} y={32} textAnchor="middle" fill="#2d3f55" fontSize="9">No activity in last 24h</text>
        )}
      </svg>
    </div>
  );
}

// Recency bars: how recently each tool was used (fresher = longer bar)
function ToolUsageBreakdown({ log }) {
  if (!log.length) return null;
  const now = Date.now();
  const maxAge = Math.max(...log.map(e => now - e.ts), 1);
  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>TOOL RECENCY</div>
      {log.slice(0, 10).map((entry, i) => {
        const age = now - entry.ts;
        const freshness = Math.max(0.04, 1 - age / maxAge);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{entry.icon}</span>
            <span style={{ color: "#9ca3af", fontSize: 11, minWidth: 120, flexShrink: 0 }}>{entry.label}</span>
            <div style={{ flex: 1, height: 5, background: "#0a1830", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${freshness * 100}%`, height: "100%", background: ACCENT, borderRadius: 3, opacity: 0.75 }} />
            </div>
            <span style={{ color: "#4a5568", fontSize: 10, minWidth: 42, textAlign: "right", flexShrink: 0 }}>{timeAgo(entry.ts)}</span>
          </div>
        );
      })}
    </div>
  );
}

// Session stats KPIs
function SessionStats({ log }) {
  const now = Date.now();
  const today = log.filter(e => now - e.ts < 24 * 60 * 60 * 1000).length;
  const withExcerpt = log.filter(e => e.excerpt).length;
  const oldest = log.length ? new Date(Math.min(...log.map(e => e.ts))).toISOString().slice(11, 16) : "—";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
      {[
        { label: "Total Analyses", value: String(log.length), color: ACCENT },
        { label: "Last 24h",       value: String(today),      color: "#4db8ff" },
        { label: "With Output",    value: String(withExcerpt), color: "#00ff9d" },
      ].map(s => (
        <div key={s.label} style={{ background: "#0a1830", borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ color: s.color, fontSize: 22, fontWeight: 900, fontFamily: "monospace" }}>{s.value}</div>
          <div style={{ color: "#4a5568", fontSize: 10, marginTop: 3 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function Workspace({ setPage }) {
  const [log, setLog] = useState([]);
  const [tab, setTab] = useState("log");
  const [, forceUpdate] = useState(0);

  function buildLog() {
    const entries = [];
    for (const n of NAV) {
      if (SKIP_IDS.has(n.id)) continue;
      try {
        const ts = localStorage.getItem(`sentinel_last_${n.id}`);
        if (ts) {
          entries.push({
            id: n.id,
            label: n.label,
            icon: n.icon,
            ts: parseInt(ts, 10),
            excerpt: localStorage.getItem(`sentinel_excerpt_${n.id}`) || "",
          });
        }
      } catch {}
    }
    entries.sort((a, b) => b.ts - a.ts);
    setLog(entries);
  }

  useEffect(() => {
    buildLog();
    const t = setInterval(() => forceUpdate(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  function exportSession() {
    const data = { exported_at: new Date().toISOString(), analyses: {}, storage: {} };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith("sentinel")) continue;
      try {
        const raw = localStorage.getItem(k);
        data.storage[k] = raw;
        if (k.startsWith("sentinel_last_")) {
          const toolId = k.replace("sentinel_last_", "");
          const excerpt = localStorage.getItem(`sentinel_excerpt_${toolId}`) || null;
          const prefill = localStorage.getItem(`sentinel_prefill_${toolId}`) || null;
          data.analyses[toolId] = { timestamp: new Date(Number(raw)).toISOString(), excerpt, prefill };
        }
      } catch {}
    }
    downloadJson(data, `sentinel-session-${new Date().toISOString().slice(0, 10)}`);
  }

  function clearLog() {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("sentinel_last_") || k?.startsWith("sentinel_excerpt_") || k?.startsWith("sentinel_prefill_")) {
        toRemove.push(k);
      }
    }
    toRemove.forEach(k => { try { localStorage.removeItem(k); } catch {} });
    setLog([]);
  }

  const storageKeys = (() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("sentinel")) keys.push(k);
    }
    return keys.sort();
  })();

  const TABS = [
    { id: "log",      label: "Session Log" },
    { id: "activity", label: "Activity" },
    { id: "storage",  label: "Storage" },
  ];

  return (
    <div>
      <PageHeader
        icon="🗂️" title="Workspace"
        sub="Session log of all intelligence analyses · export and manage session data."
        accent={ACCENT} dataMode="local"
        badges={[{ text: `${log.length} Analyses`, color: ACCENT }]}
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <Btn onClick={exportSession} color={ACCENT}>⬇ Export Session JSON</Btn>
        {log.length > 0 && (
          <Btn onClick={clearLog} color="#4a5568" size="sm">🗑 Clear Session Log</Btn>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "log" && (
        log.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🗂️</div>
              <div style={{ color: "#6b7a8d", fontSize: 14, marginBottom: 8 }}>Nessuna analisi registrata</div>
              <div style={{ color: "#4a5568", fontSize: 12 }}>
                Esegui analisi in qualsiasi tool per vederle comparire qui.
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <ST icon="📋" label="Analysis Log" color={ACCENT}
              sub={`${log.length} tool${log.length !== 1 ? "s" : ""} analizzato/i questa sessione`} />
            {log.map(entry => (
              <LogEntry key={entry.id} entry={entry} onOpen={setPage} />
            ))}
          </Card>
        )
      )}

      {tab === "activity" && (
        <Card>
          <ST icon="📊" label="Session Activity" color={ACCENT} sub="Analysis frequency and recency across all tools" />
          {log.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 20px", color: "#4a5568", fontSize: 13 }}>
              No activity recorded yet.
            </div>
          ) : (
            <>
              <SessionStats log={log} />
              <ActivityTimeline log={log} />
              <ToolUsageBreakdown log={log} />
            </>
          )}
        </Card>
      )}

      {tab === "storage" && (
        storageKeys.length > 0 ? (
          <Card>
            <ST icon="🔑" label="Session Storage" color="#4db8ff"
              sub={`${storageKeys.length} chiavi Sentinel in localStorage`} />
            <div style={{ overflowX: "auto" }}>
              {storageKeys.map(k => {
                const v = localStorage.getItem(k) || "";
                const preview = v.length > 90 ? v.slice(0, 90) + "…" : v;
                return (
                  <div key={k} style={{
                    display: "flex", gap: 12, borderBottom: "1px solid #0d1626",
                    padding: "5px 0", fontFamily: "monospace", fontSize: 10,
                  }}>
                    <span style={{ color: "#4db8ff", minWidth: 220, flexShrink: 0 }}>{k}</span>
                    <span style={{ color: "#4a5568", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {preview}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ textAlign: "center", padding: "30px 20px", color: "#4a5568", fontSize: 13 }}>
              No session storage keys found.
            </div>
          </Card>
        )
      )}
    </div>
  );
}
