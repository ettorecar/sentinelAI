import { useState, useEffect } from "react";
import { Card, PageHeader, ST, Btn, BADGE, downloadJson } from "../components/shared";
import { NAV, TOOL_DESC } from "../constants";

const ACCENT = "#b47fff";

// tools excluded from session log
const SKIP_IDS = new Set(["home", "workspace"]);

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

export default function Workspace({ setPage }) {
  const [log, setLog] = useState([]);
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
    // refresh relative timestamps every 30s
    const t = setInterval(() => forceUpdate(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // H4 — collect all sentinel_* localStorage keys
  function exportSession() {
    const data = { exported_at: new Date().toISOString(), analyses: {}, storage: {} };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith("sentinel")) continue;
      try {
        const raw = localStorage.getItem(k);
        data.storage[k] = raw;
        // structured analysis entries
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

  // Storage key inspector
  const storageKeys = (() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("sentinel")) keys.push(k);
    }
    return keys.sort();
  })();

  return (
    <div>
      <PageHeader
        icon="🗂️" title="Workspace"
        sub="Session log of all intelligence analyses · export and manage session data."
        accent={ACCENT} dataMode="local"
        badges={[{ text: `${log.length} Analyses`, color: ACCENT }]}
      />

      {/* H4 — export + clear actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <Btn onClick={exportSession} color={ACCENT}>⬇ Export Session JSON</Btn>
        {log.length > 0 && (
          <Btn onClick={clearLog} color="#4a5568" size="sm">🗑 Clear Session Log</Btn>
        )}
      </div>

      {/* H2 — session log */}
      {log.length === 0 ? (
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
      )}

      {/* Storage inspector */}
      {storageKeys.length > 0 && (
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
      )}
    </div>
  );
}
