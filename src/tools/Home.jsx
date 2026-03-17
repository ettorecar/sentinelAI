import { useState, useEffect } from "react";
import { BADGE, Card, Btn, ST, Pulse, Divider } from "../components/shared";
import { NAV, TOOL_DESC, ENERGY_IDS } from "../constants";

const feed = [
  { time: "14:32", type: "CTI",        msg: "New IOC cluster linked to EMBER WOLF",               level: "CRITICAL", page: "cti"        },
  { time: "14:18", type: "Oil Infra",  msg: "Drone threat detected — Abqaiq perimeter",            level: "CRITICAL", page: "oilinfra"   },
  { time: "13:55", type: "Chokepoint", msg: "Hormuz: new mine-laying report, strait traffic -18%", level: "CRITICAL", page: "chokepoint" },
  { time: "13:41", type: "PSYOP",      msg: "Coordinated narrative surge — Telegram",              level: "HIGH",     page: "psyop"      },
  { time: "12:59", type: "Maritime",   msg: "ADRIATICA SUN AIS blackout extended >8h",             level: "HIGH",     page: "maritime"   },
  { time: "12:30", type: "Disinfo",    msg: "Campaign #UA-2023-11 reactivated",                    level: "MEDIUM",   page: "disinfo"    },
  { time: "11:44", type: "Energy",     msg: "Germany resilience score drops to 58/100",            level: "MEDIUM",   page: "energyrisk" },
];

const LEVEL_COLOR = {
  CRITICAL: "#ff4d4d",
  HIGH:     "#ff9d00",
  MEDIUM:   "#ffd700",
  LOW:      "#00ff9d",
};

const TYPE_COLOR = {
  "Oil Infra": "#ff9d00", "Chokepoint": "#ff9d00", "Energy": "#ff9d00",
};

export default function Home({ setPage }) {
  const [tick, setTick] = useState(0);
  const [utc, setUtc] = useState(() => new Date().toISOString().slice(11, 16) + " UTC");
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 2000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setUtc(new Date().toISOString().slice(11, 16) + " UTC"), 10000); return () => clearInterval(t); }, []);

  const tools = NAV.slice(1);
  const isEnergy = id => ENERGY_IDS.includes(id);
  const isReport = id => id === "intelreport";
  const isScenario = id => id === "scenariobuilder";

  function toolAccent(id) {
    if (isEnergy(id)) return "#ff9d00";
    if (isReport(id)) return "#b47fff";
    if (isScenario(id)) return "#22d3ee";
    return "#00ff9d";
  }

  return (
    <div>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div style={{ padding: "28px 0 20px", borderBottom: "1px solid #1f2d45", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 4, fontWeight: 600, marginBottom: 6 }}>
              AI-POWERED DEFENCE INTELLIGENCE PLATFORM
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#e2e8f0", margin: 0, letterSpacing: -1, lineHeight: 1 }}>
              SENTINEL
              <span style={{ color: "#00ff9d", marginLeft: 2 }}>.</span>
            </h1>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <BADGE text="18 Tools" color="green" />
              <BADGE text="AI Powered" color="blue" />
              <BADGE text="OSINT" color="blue" />
              <BADGE text="Energy Module" color="orange" />
              <BADGE text="v0.8" color="gray" />
            </div>
          </div>
          {/* System status widget */}
          <div style={{ background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 8, padding: "12px 16px", minWidth: 160, flexShrink: 0 }}>
            <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 3, marginBottom: 8 }}>SYSTEM STATUS</div>
            {[
              ["AI Engine",    "#00ff9d", "ONLINE"],
              ["Threat Feed",  "#00ff9d", "LIVE"],
              ["Energy Mod.",  "#ff9d00", "ACTIVE"],
              ["Last sync",    "#4a5568", utc],
            ].map(([label, color, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ color: "#4a5568", fontSize: 10 }}>{label}</span>
                <span style={{ color, fontSize: 10, fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alert bar ────────────────────────────────────────────── */}
      <div style={{
        background: "#0d1626", border: "1px solid #1f2d45",
        borderLeft: "3px solid #ff4d4d",
        borderRadius: 8, padding: "10px 14px", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Pulse color="#ff4d4d" size={8} />
          <span style={{ color: "#ff4d4d", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>THREAT LEVEL: ELEVATED</span>
        </div>
        <div style={{ color: "#4a5568", fontSize: 11 }}>3 CRITICAL · 12 HIGH · Last update: 14:32 UTC</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["CTI", "CRITICAL"], ["Energy", "CRITICAL"], ["Maritime", "HIGH"], ["Bio", "MEDIUM"]].map(([d, l]) => (
            <div key={d} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#4a5568", fontSize: 10 }}>{d}</span>
              <BADGE text={l} color={LEVEL_COLOR[l]} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Feed + gauge ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 14 }}>

        <Card style={{ marginBottom: 0 }}>
          <ST icon="📡" label="Live Intelligence Feed" color="#00ff9d" />
          <div>
            {feed.map((f, i) => {
              const lc = LEVEL_COLOR[f.level] || "#9ca3af";
              const tc = TYPE_COLOR[f.type] || "#4db8ff";
              const isNew = i === 0;
              return (
                <div
                  key={i}
                  onClick={() => setPage(f.page)}
                  style={{
                    display: "flex", gap: 8, alignItems: "center",
                    padding: "7px 8px 7px 10px",
                    marginBottom: 2, borderRadius: 5,
                    borderLeft: `2px solid ${lc}`,
                    background: isNew ? `${lc}08` : "transparent",
                    opacity: isNew && tick % 2 === 0 ? 0.65 : 1,
                    transition: "opacity 0.8s, background 0.15s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1f2d4522"}
                  onMouseLeave={e => e.currentTarget.style.background = isNew ? `${lc}08` : "transparent"}
                >
                  <span style={{ color: "#3a4a5c", fontSize: 10, minWidth: 34, fontVariantNumeric: "tabular-nums" }}>{f.time}</span>
                  <span style={{
                    background: `${tc}18`, color: tc,
                    border: `1px solid ${tc}33`,
                    fontSize: 9, fontWeight: 700, borderRadius: 3,
                    padding: "1px 5px", minWidth: 52, textAlign: "center", whiteSpace: "nowrap",
                  }}>{f.type}</span>
                  <span style={{ color: "#c9d1da", fontSize: 12, flex: 1, lineHeight: 1.4 }}>{f.msg}</span>
                  <BADGE text={f.level} color={lc} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card style={{ marginBottom: 0 }}>
          <ST icon="🌡️" label="Global Threat Assessment" color="#ff4d4d" />
          <div style={{ textAlign: "center" }}>
            <svg viewBox="0 0 200 115" style={{ width: "100%", maxWidth: 210, margin: "0 auto", display: "block" }}>
              <defs>
                <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00ff9d" />
                  <stop offset="50%" stopColor="#ffd700" />
                  <stop offset="100%" stopColor="#ff0000" />
                </linearGradient>
              </defs>
              <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="#1f2d45" strokeWidth="14" strokeLinecap="round" />
              <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="url(#arcGrad)" strokeWidth="14" strokeLinecap="round" strokeDasharray="251" strokeDashoffset="63" />
              <line x1="100" y1="105" x2="58" y2="38" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
              <circle cx="100" cy="105" r="5" fill="#111827" stroke="#e2e8f0" strokeWidth="2" />
              <text x="100" y="80" textAnchor="middle" fill="#ff4d4d" fontSize="11" fontWeight="bold" letterSpacing="1">ELEVATED</text>
              <text x="14" y="120" fill="#00ff9d" fontSize="8" opacity="0.7">LOW</text>
              <text x="88" y="18" fill="#ffd700" fontSize="8" opacity="0.7">MED</text>
              <text x="162" y="120" fill="#ff0000" fontSize="8" opacity="0.7">CRIT</text>
            </svg>
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
            {[["3 Critical", "#ff4d4d"], ["12 High", "#ff9d00"], ["8 Medium", "#ffd700"], ["5 Low", "#00ff9d"]].map(([l, c]) => (
              <BADGE key={l} text={l} color={c} />
            ))}
          </div>
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <Btn onClick={() => setPage("threatmap")} color="#00ff9d">🌍 Open Threat Map</Btn>
          </div>
        </Card>
      </div>

      {/* ── Featured modules ─────────────────────────────────────── */}
      <Divider label="FEATURED MODULES" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10, marginBottom: 14 }}>

        {/* Energy */}
        <div style={{ background: "#0d1626", border: "1px solid #ff9d0033", borderTop: "2px solid #ff9d00", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🛢️</span>
            <span style={{ fontWeight: 800, color: "#ff9d00", fontSize: 14 }}>Energy Intelligence</span>
            <BADGE text="4 tools" color="#ff9d00" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
            {[
              ["oilinfra",   "Oil Infra"],
              ["chokepoint", "Chokepoints"],
              ["energyrisk", "Energy Risk"],
              ["energygrid", "Grid Sim"],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setPage(id)} style={{
                background: "#111827", border: "1px solid #ff9d0022", borderRadius: 6,
                padding: "7px 10px", color: "#ff9d00", fontSize: 11, fontWeight: 600,
                cursor: "pointer", textAlign: "left", transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#1a2234"}
                onMouseLeave={e => e.currentTarget.style.background = "#111827"}
              >
                {label} →
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Builder */}
        <div style={{ background: "#0d1626", border: "1px solid #22d3ee33", borderTop: "2px solid #22d3ee", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>🎯</span>
            <span style={{ fontWeight: 800, color: "#22d3ee", fontSize: 14 }}>Scenario Builder</span>
            <BADGE text="New" color="#22d3ee" />
          </div>
          <div style={{ color: "#4a5568", fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
            Multi-domain crisis scenarios — actors, events, AI-powered cascade analysis and escalation paths.
          </div>
          <Btn onClick={() => setPage("scenariobuilder")} color="#22d3ee" size="sm">Open Scenario Builder →</Btn>
        </div>

        {/* Intel Report */}
        <div style={{ background: "#0d1626", border: "1px solid #b47fff33", borderTop: "2px solid #b47fff", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <span style={{ fontWeight: 800, color: "#b47fff", fontSize: 14 }}>Intel Report Generator</span>
            <BADGE text="New" color="#b47fff" />
          </div>
          <div style={{ color: "#4a5568", fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
            Structured multi-domain intelligence briefs — executive summary, threat actors, recommended actions.
          </div>
          <Btn onClick={() => setPage("intelreport")} color="#b47fff" size="sm">Open Report Generator →</Btn>
        </div>
      </div>

      {/* ── Core tools grid ──────────────────────────────────────── */}
      <Divider label="CORE TOOLS" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
        {tools.filter(t => !isEnergy(t.id) && !isReport(t.id) && !isScenario(t.id)).map(t => {
          const accent = toolAccent(t.id);
          return (
            <ToolCard key={t.id} t={t} accent={accent} setPage={setPage} />
          );
        })}
      </div>
    </div>
  );
}

function ToolCard({ t, accent, setPage }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => setPage(t.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#141e30" : "#111827",
        border: `1px solid ${hovered ? accent + "55" : "#1f2d45"}`,
        borderTop: `2px solid ${hovered ? accent : "#1f2d45"}`,
        borderRadius: 8, padding: 13, cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 6 }}>{t.icon}</div>
      <div style={{ fontWeight: 700, color: hovered ? accent : "#e2e8f0", fontSize: 12, marginBottom: 4, transition: "color 0.15s" }}>{t.label}</div>
      <div style={{ color: "#4a5568", fontSize: 11, marginBottom: 0, lineHeight: 1.4 }}>{TOOL_DESC[t.id]}</div>
    </div>
  );
}
