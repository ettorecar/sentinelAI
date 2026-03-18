import { useState, useEffect, useRef } from "react";
import { BADGE, Card, Btn, ST, Pulse, Divider } from "../components/shared";
import { NAV, TOOL_DESC, ENERGY_IDS } from "../constants";
import { useApiKey } from "../context/ApiKeyContext";

// ── Data mode per tool ────────────────────────────────────────────────────────
const TOOL_DATA_MODE = {
  disinfo:"ai", osint:"ai", patlife:"ai", psyop:"ai", redteam:"ai",
  intelreport:"ai", scenariobuilder:"ai", threatmap:"hybrid", maritime:"hybrid",
  biothreat:"hybrid", chokepoint:"hybrid", energygrid:"hybrid", oilinfra:"hybrid",
  satellite:"hybrid", energyrisk:"hybrid", cti:"hybrid", translator:"hybrid", airroutes:"hybrid",
};
const MODE_DOT = {
  ai:     { dot:"●", color:"#00ff9d", label:"AI" },
  hybrid: { dot:"◑", color:"#ff9d00", label:"MOCK+AI" },
};

// ── Module threat levels ──────────────────────────────────────────────────────
const DOMAIN_THREAT = {
  cti:"CRITICAL", oilinfra:"CRITICAL", chokepoint:"CRITICAL",
  maritime:"HIGH", psyop:"HIGH", airroutes:"HIGH", biothreat:"HIGH", disinfo:"HIGH",
  threatmap:"HIGH", osint:"MEDIUM", energyrisk:"MEDIUM", energygrid:"MEDIUM", satellite:"MEDIUM",
  patlife:"LOW", redteam:"LOW", translator:"LOW",
  intelreport:"NOMINAL", scenariobuilder:"NOMINAL", workspace:"NOMINAL",
};
const THREAT_COLOR = {
  CRITICAL:"#ff4d4d", HIGH:"#ff9d00", MEDIUM:"#ffd700", LOW:"#00ff9d", NOMINAL:"#3a4a5c",
};

// ── Sparkline trend data per alert type ──────────────────────────────────────
const TYPE_TRENDS = {
  CTI:         [45, 50, 55, 62, 58, 70, 85],
  "Oil Infra": [55, 60, 58, 65, 70, 68, 75],
  Chokepoint:  [60, 65, 70, 68, 74, 76, 82],
  PSYOP:       [20, 28, 35, 40, 45, 42, 58],
  Maritime:    [30, 35, 38, 42, 45, 50, 60],
  Airspace:    [42, 48, 55, 60, 65, 70, 78],
  Bio:         [15, 18, 20, 22, 25, 28, 34],
  Disinfo:     [40, 38, 42, 45, 50, 48, 57],
  Energy:      [55, 52, 58, 60, 65, 62, 68],
  Satellite:   [10, 12, 15, 14, 16, 18, 22],
  OSINT:       [25, 28, 32, 35, 38, 42, 48],
};

// ── Live alert pool ───────────────────────────────────────────────────────────
const FEED_POOL = [
  { type:"CTI",        msg:"New IOC cluster linked to EMBER WOLF — 23 hosts compromised",      level:"CRITICAL", page:"cti"        },
  { type:"Oil Infra",  msg:"Drone strike warning — Abqaiq eastern perimeter breach detected",   level:"CRITICAL", page:"oilinfra"   },
  { type:"Chokepoint", msg:"Hormuz: mine-laying vessel reported, traffic -18%, NAVTEX issued",  level:"CRITICAL", page:"chokepoint" },
  { type:"PSYOP",      msg:"Coordinated narrative surge — Telegram, 4.2M organic reach/6h",    level:"HIGH",     page:"psyop"      },
  { type:"Maritime",   msg:"ADRIATICA SUN AIS blackout extended >8h, Libya coastal sector",     level:"HIGH",     page:"maritime"   },
  { type:"Airspace",   msg:"Houthi MANPAD threat confirmed — Red Sea FL050–FL150 active",       level:"HIGH",     page:"airroutes"  },
  { type:"Bio",        msg:"R₀=2.4 pathogen cluster — N. Congo surveillance alert raised",      level:"HIGH",     page:"biothreat"  },
  { type:"Disinfo",    msg:"Campaign #UA-2023-11 reactivated — EU parliamentary target",        level:"MEDIUM",   page:"disinfo"    },
  { type:"Energy",     msg:"Germany resilience score drops to 58/100 — gas storage -14%",       level:"MEDIUM",   page:"energyrisk" },
  { type:"Satellite",  msg:"LEO debris field expanding +12% — SAR satellite at risk",           level:"MEDIUM",   page:"satellite"  },
  { type:"OSINT",      msg:"Entity correlation: WOLF-7 linked to 3 new IOC indicators",         level:"HIGH",     page:"osint"      },
  { type:"CTI",        msg:"COBALT PHANTOM C2 infrastructure reactivated — 8 new nodes",        level:"CRITICAL", page:"cti"        },
  { type:"Maritime",   msg:"DARK PHANTOM VLCC — SAR satellite reacquired, Bab el-Mandeb",       level:"HIGH",     page:"maritime"   },
  { type:"Airspace",   msg:"NOTAM A0823/26 extended — Syria FIR active airstrikes, FL000–UNL", level:"CRITICAL", page:"airroutes"  },
  { type:"Oil Infra",  msg:"Kashagan pipeline pressure anomaly — SIGINT alert corroborated",    level:"HIGH",     page:"oilinfra"   },
  { type:"Chokepoint", msg:"Bab el-Mandeb: 14 vessels diverted last 6h, Cape rerouting up",     level:"HIGH",     page:"chokepoint" },
  { type:"PSYOP",      msg:"Deepfake video campaign — 3 EU capitals, AI-synthetic audio",       level:"HIGH",     page:"psyop"      },
  { type:"Bio",        msg:"Novel H5N1 variant — WHO alert level raised, 3 border crossings",   level:"HIGH",     page:"biothreat"  },
  { type:"Energy",     msg:"NORDSTREAM monitoring — unexplained seismic signal 54.3°N 14.2°E", level:"MEDIUM",   page:"energyrisk" },
  { type:"Disinfo",    msg:"State-sponsored botnet: 850K accounts activated — election target", level:"HIGH",     page:"disinfo"    },
  { type:"Maritime",   msg:"KAVKAZ shadow tanker — STS transfer confirmed, Black Sea",          level:"HIGH",     page:"maritime"   },
  { type:"CTI",        msg:"Ransomware BLACKBYTE v3 detected — 4 NATO infrastructure targets",  level:"CRITICAL", page:"cti"        },
  { type:"Satellite",  msg:"ELINT: new RF source — Kaliningrad, non-standard emission pattern", level:"HIGH",     page:"satellite"  },
  { type:"Airspace",   msg:"GPS jamming reported — Eastern Finland, GNSS unreliable 3h",        level:"MEDIUM",   page:"airroutes"  },
];

const LEVEL_COLOR = { CRITICAL:"#ff4d4d", HIGH:"#ff9d00", MEDIUM:"#ffd700", LOW:"#00ff9d" };
const TYPE_COLOR  = { "Oil Infra":"#ff9d00", Chokepoint:"#ff9d00", Energy:"#ff9d00", CTI:"#38bdf8", Maritime:"#22d3ee", Airspace:"#38bdf8" };

// ── Favorites hook ────────────────────────────────────────────────────────────
function useFavorites() {
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sentinel-favs") || "[]"); } catch { return []; }
  });
  function toggle(id) {
    setFavs(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      try { localStorage.setItem("sentinel-favs", JSON.stringify(next)); } catch {}
      return next;
    });
  }
  return [favs, toggle];
}

// ── Sparkline mini chart ──────────────────────────────────────────────────────
function Sparkline({ values, color = "#ff9d00", width = 52, height = 16 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values), range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const lastY = height - ((values[values.length - 1] - min) / range) * (height - 2) - 1;
  return (
    <svg width={width} height={height} style={{ display:"block", flexShrink:0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      <circle cx={width} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

// ── Domain pulse strip ────────────────────────────────────────────────────────
function DomainPulseStrip({ tools, setPage }) {
  return (
    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
      {tools.map(t => {
        const level = DOMAIN_THREAT[t.id] || "NOMINAL";
        const col = THREAT_COLOR[level];
        const isCrit = level === "CRITICAL";
        return (
          <button key={t.id} onClick={() => setPage(t.id)} title={`${t.label} — ${level}`}
            style={{ display:"flex", alignItems:"center", gap:4, background:"#0d1626", border:`1px solid ${col}2a`, borderRadius:5, padding:"3px 8px", cursor:"pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "#141e30"}
            onMouseLeave={e => e.currentTarget.style.background = "#0d1626"}
          >
            <span style={{ width:5, height:5, borderRadius:"50%", background:col, display:"inline-block", flexShrink:0,
              boxShadow: isCrit ? `0 0 5px ${col}` : "none",
              animation: isCrit ? "sentinelPulse 1.3s ease-in-out infinite" : "none",
            }} />
            <span style={{ color:col, fontSize:9, fontWeight: isCrit ? 700 : 500, letterSpacing:0.4, whiteSpace:"nowrap" }}>{t.icon} {t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Operational counter card ──────────────────────────────────────────────────
function OpCounter({ label, value, color }) {
  return (
    <div style={{ background:"#0d1626", borderRadius:8, padding:"10px 14px", border:"1px solid #1f2d45", borderTop:`2px solid ${color}`, flex:"1 1 90px", minWidth:85 }}>
      <div style={{ color:"#4a5568", fontSize:9, letterSpacing:2, marginBottom:4, fontWeight:600 }}>{label}</div>
      <div style={{ color, fontSize:22, fontWeight:900, fontFamily:"monospace", lineHeight:1 }}>{value}</div>
    </div>
  );
}

// ── Tool card ─────────────────────────────────────────────────────────────────
function ToolCard({ t, accent, setPage, isFav, onToggleFav }) {
  const [hovered, setHovered] = useState(false);
  const m = MODE_DOT[TOOL_DATA_MODE[t.id]];
  const level = DOMAIN_THREAT[t.id] || "NOMINAL";
  const tc = THREAT_COLOR[level];
  return (
    <div onClick={() => setPage(t.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#141e30" : "#111827",
        border: `1px solid ${hovered ? accent + "55" : "#1f2d45"}`,
        borderTop: `2px solid ${hovered ? accent : level === "NOMINAL" ? "#1f2d45" : tc}`,
        borderRadius:8, padding:13, cursor:"pointer",
        transition:"background 0.15s, border-color 0.15s",
        display:"flex", flexDirection:"column", position:"relative",
      }}
    >
      {onToggleFav && (
        <button onClick={e => { e.stopPropagation(); onToggleFav(t.id); }}
          title={isFav ? "Remove from pinned" : "Pin tool"}
          style={{ position:"absolute", top:7, right:7, background:"none", border:"none", cursor:"pointer", fontSize:12,
            opacity: isFav ? 1 : (hovered ? 0.5 : 0.15), color: isFav ? "#ffd700" : "#9ca3af", transition:"opacity 0.15s", padding:2, lineHeight:1 }}
        >★</button>
      )}
      <div style={{ fontSize:20, marginBottom:6 }}>{t.icon}</div>
      <div style={{ fontWeight:700, color: hovered ? accent : "#e2e8f0", fontSize:12, marginBottom:4, transition:"color 0.15s" }}>{t.label}</div>
      <div style={{ color:"#4a5568", fontSize:11, lineHeight:1.4, flex:1 }}>{TOOL_DESC[t.id]}</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
        {m && (
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ color:m.color, fontSize:9 }}>{m.dot}</span>
            <span style={{ color:m.color, fontSize:9, fontWeight:700, letterSpacing:0.8, opacity:0.85 }}>{m.label}</span>
          </div>
        )}
        {level !== "NOMINAL" && (
          <span style={{ fontSize:9, color:tc, fontWeight:700, letterSpacing:0.8, marginLeft:"auto",
            animation: level === "CRITICAL" ? "sentinelBlink 1.8s ease-in-out infinite" : "none",
          }}>{level}</span>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home({ setPage }) {
  const [apiKey] = useApiKey();
  const [utc, setUtc]       = useState("");
  const [dateStr, setDateStr] = useState("");
  const [favs, toggleFav]   = useFavorites();
  const [blink, setBlink]   = useState(true);
  const [counters, setCounters] = useState({ threats:0, vessels:0, routes:0, sigint:0, tools:0, notams:0 });
  const feedIdxRef = useRef(7);
  const [liveFeed, setLiveFeed] = useState(() =>
    FEED_POOL.slice(0, 7).map((f, i) => ({ ...f, ts: i === 0 ? "1m" : `${(i + 1) * 9}m`, uid: i, isNew: false }))
  );

  // Inject CSS animations once
  useEffect(() => {
    const id = "sentinel-home-css";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      @keyframes sentinelPulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(1.5)} }
      @keyframes sentinelBlink    { 0%,100%{opacity:1} 48%,52%{opacity:0} }
      @keyframes sentinelTicker   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      @keyframes sentinelSlideIn  { from{opacity:0;transform:translateY(-7px)} to{opacity:1;transform:translateY(0)} }
      @keyframes sentinelGlow     { 0%,100%{box-shadow:0 0 0 transparent} 50%{box-shadow:0 0 10px #ff4d4d33} }
    `;
    document.head.appendChild(el);
    return () => { const s = document.getElementById(id); if (s) s.remove(); };
  }, []);

  // UTC clock
  useEffect(() => {
    function tick() {
      const d = new Date();
      setUtc(d.toISOString().slice(11, 19) + " UTC");
      setDateStr(d.toISOString().slice(0, 10));
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Blinking cursor
  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 580);
    return () => clearInterval(t);
  }, []);

  // Count-up animation on mount
  useEffect(() => {
    const targets = { threats:28, vessels:12, routes:10, sigint:8, tools:20, notams:10 };
    let cur = { threats:0, vessels:0, routes:0, sigint:0, tools:0, notams:0 };
    const steps = Object.fromEntries(Object.keys(targets).map(k => [k, Math.max(1, Math.ceil(targets[k] / 22))]));
    const id = setInterval(() => {
      let done = true;
      Object.keys(targets).forEach(k => {
        if (cur[k] < targets[k]) { cur[k] = Math.min(cur[k] + steps[k], targets[k]); done = false; }
      });
      setCounters({ ...cur });
      if (done) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, []);

  // Auto-rotating live feed (new alert every 9s)
  useEffect(() => {
    const id = setInterval(() => {
      const next = FEED_POOL[feedIdxRef.current % FEED_POOL.length];
      feedIdxRef.current++;
      setLiveFeed(prev => [
        { ...next, ts:"now", uid:Date.now(), isNew:true },
        ...prev.slice(0, 6).map(f => ({ ...f, isNew:false, ts: f.ts === "now" ? "1m" : f.ts })),
      ]);
    }, 9000);
    return () => clearInterval(id);
  }, []);

  const tools = NAV.slice(1);
  const isEnergy   = id => ENERGY_IDS.includes(id);
  const isReport   = id => id === "intelreport";
  const isScenario = id => id === "scenariobuilder";
  function toolAccent(id) {
    if (isEnergy(id))   return "#ff9d00";
    if (id === "airroutes") return "#38bdf8";
    if (isReport(id))   return "#b47fff";
    if (isScenario(id)) return "#22d3ee";
    return "#00ff9d";
  }

  const criticalCount = Object.values(DOMAIN_THREAT).filter(v => v === "CRITICAL").length;
  const highCount     = Object.values(DOMAIN_THREAT).filter(v => v === "HIGH").length;

  // Ticker text (doubled for seamless loop)
  const tickerText = FEED_POOL.map(f => `[${f.level}] ${f.type.toUpperCase()}: ${f.msg}`).join("   ·   ");
  const tickerDur  = Math.round(tickerText.length * 0.055) + "s";

  return (
    <div>

      {/* ── Scrolling ticker ─────────────────────────────────────── */}
      <div style={{ background:"#030810", borderBottom:"1px solid #1a2740", overflow:"hidden", whiteSpace:"nowrap", marginBottom:16, borderRadius:6, padding:"5px 0" }}>
        <div style={{ display:"inline-block", animation:`sentinelTicker ${tickerDur} linear infinite` }}>
          {[tickerText, tickerText].map((txt, outerIdx) => (
            <span key={outerIdx}>
              {txt.split("   ·   ").map((item, j) => {
                const col = item.includes("[CRITICAL]") ? "#ff4d4d" : item.includes("[HIGH]") ? "#ff9d00" : "#ffd700";
                return (
                  <span key={j} style={{ marginRight:28 }}>
                    <span style={{ color:col, fontSize:10, fontFamily:"monospace", fontWeight: item.includes("[CRITICAL]") ? 700 : 400 }}>{item}</span>
                  </span>
                );
              })}
            </span>
          ))}
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div style={{ paddingBottom:18, borderBottom:"1px solid #1f2d45", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ color:"#4a5568", fontSize:10, letterSpacing:4, fontWeight:600, marginBottom:6 }}>
              AI-POWERED DEFENCE INTELLIGENCE PLATFORM
            </div>
            <h1 style={{ fontSize:32, fontWeight:900, color:"#e2e8f0", margin:0, letterSpacing:-1, lineHeight:1 }}>
              SENTINEL<span style={{ color:"#00ff9d" }}>.</span>
              <span style={{ color:"#00ff9d", fontSize:18, fontFamily:"monospace", opacity: blink ? 1 : 0, marginLeft:2 }}>_</span>
            </h1>
            <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
              <BADGE text="20 Tools" color="green" />
              <BADGE text="AI Powered" color="blue" />
              <BADGE text="OSINT" color="blue" />
              <BADGE text="Energy Module" color="orange" />
              <BADGE text="v0.8" color="gray" />
            </div>
          </div>

          {/* System status */}
          <div style={{ background:"#0d1626", border:"1px solid #1f2d45", borderRadius:8, padding:"12px 16px", minWidth:195, flexShrink:0 }}>
            <div style={{ color:"#4a5568", fontSize:9, letterSpacing:3, marginBottom:8, fontFamily:"monospace" }}>◈ SYSTEM STATUS</div>
            {[
              ["AI Engine",    apiKey ? "#00ff9d" : "#ff4d4d", apiKey ? "ONLINE" : "NO KEY"],
              ["Threat Feed",  "#00ff9d", "LIVE"],
              ["Energy Mod.",  "#ff9d00", "ACTIVE"],
              ["Airspace Mod.","#38bdf8", "ACTIVE"],
              ["Maritime Mod.","#22d3ee", "ACTIVE"],
            ].map(([label, color, val]) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <span style={{ color:"#4a5568", fontSize:10 }}>{label}</span>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ width:4, height:4, borderRadius:"50%", background:color, display:"inline-block",
                    animation: val === "LIVE" || val === "ONLINE" ? "sentinelPulse 2s ease-in-out infinite" : "none",
                  }} />
                  <span style={{ color, fontSize:10, fontWeight:700, fontFamily:"monospace" }}>{val}</span>
                </div>
              </div>
            ))}
            <div style={{ borderTop:"1px solid #1f2d45", marginTop:8, paddingTop:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                <span style={{ color:"#4a5568", fontSize:9, fontFamily:"monospace" }}>UTC</span>
                <span style={{ color:"#38bdf8", fontSize:10, fontFamily:"monospace", fontWeight:700 }}>{utc}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#4a5568", fontSize:9, fontFamily:"monospace" }}>DATE</span>
                <span style={{ color:"#4a5568", fontSize:10, fontFamily:"monospace" }}>{dateStr}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Operational counters ─────────────────────────────────── */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <OpCounter label="ACTIVE THREATS"   value={counters.threats} color="#ff4d4d" />
        <OpCounter label="VESSELS TRACKED"  value={counters.vessels} color="#22d3ee" />
        <OpCounter label="AIRSPACE ALERTS"  value={counters.routes}  color="#38bdf8" />
        <OpCounter label="SIGINT EVENTS"    value={counters.sigint}  color="#b47fff" />
        <OpCounter label="ACTIVE NOTAMs"    value={counters.notams}  color="#ffd700" />
        <OpCounter label="TOOLS ONLINE"     value={counters.tools}   color="#00ff9d" />
      </div>

      {/* ── Alert bar ────────────────────────────────────────────── */}
      <div style={{
        background:"#0d1626", border:"1px solid #1f2d45", borderLeft:"3px solid #ff4d4d", borderRadius:8,
        padding:"10px 14px", marginBottom:12,
        display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
        animation:"sentinelGlow 2.8s ease-in-out infinite",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#ff4d4d", display:"inline-block", animation:"sentinelPulse 1.2s ease-in-out infinite" }} />
          <span style={{ color:"#ff4d4d", fontSize:12, fontWeight:700, letterSpacing:1 }}>THREAT LEVEL: ELEVATED</span>
        </div>
        <div style={{ color:"#4a5568", fontSize:11 }}>{criticalCount} CRITICAL · {highCount} HIGH · Last update: {utc || "—"}</div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
          {[["CTI","CRITICAL"],["Maritime","HIGH"],["Airspace","HIGH"],["Bio","HIGH"]].map(([d, l]) => (
            <div key={d} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ color:"#4a5568", fontSize:10 }}>{d}</span>
              <BADGE text={l} color={LEVEL_COLOR[l]} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Domain pulse strip ───────────────────────────────────── */}
      <Card style={{ padding:"10px 14px", marginBottom:12, background:"#070f1c" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
          <span style={{ width:5, height:5, borderRadius:"50%", background:"#00ff9d", display:"inline-block", animation:"sentinelPulse 2.2s ease-in-out infinite" }} />
          <span style={{ color:"#4a5568", fontSize:9, letterSpacing:2, fontWeight:600 }}>ALL MODULES — LIVE STATUS</span>
          <span style={{ marginLeft:"auto", color:"#4a5568", fontSize:9, fontFamily:"monospace" }}>{NAV.length - 1} / {NAV.length - 1} ONLINE</span>
        </div>
        <DomainPulseStrip tools={NAV.slice(1)} setPage={setPage} />
      </Card>

      {/* ── Feed + gauge ─────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px,1fr))", gap:12, marginBottom:14 }}>

        {/* Live intelligence feed */}
        <Card style={{ marginBottom:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <ST icon="📡" label="Live Intelligence Feed" color="#00ff9d" />
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#00ff9d", display:"inline-block", animation:"sentinelPulse 1.5s ease-in-out infinite" }} />
              <span style={{ color:"#00ff9d", fontSize:9, fontWeight:700, letterSpacing:2 }}>LIVE</span>
            </div>
          </div>
          <div>
            {liveFeed.map((f) => {
              const lc = LEVEL_COLOR[f.level] || "#9ca3af";
              const tc = TYPE_COLOR[f.type] || "#4db8ff";
              const trend = TYPE_TRENDS[f.type];
              return (
                <div key={f.uid} onClick={() => setPage(f.page)} style={{
                  display:"flex", gap:6, alignItems:"center",
                  padding:"6px 8px 6px 10px", marginBottom:2, borderRadius:5,
                  borderLeft:`2px solid ${lc}`,
                  background: f.isNew ? `${lc}12` : "transparent",
                  animation: f.isNew ? "sentinelSlideIn 0.35s ease-out" : "none",
                  cursor:"pointer", transition:"background 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1f2d4522"}
                  onMouseLeave={e => e.currentTarget.style.background = f.isNew ? `${lc}12` : "transparent"}
                >
                  <span style={{ color:"#3a4a5c", fontSize:9, minWidth:24, fontFamily:"monospace" }}>{f.ts}</span>
                  <span style={{ background:`${tc}18`, color:tc, border:`1px solid ${tc}33`, fontSize:9, fontWeight:700, borderRadius:3, padding:"1px 5px", minWidth:50, textAlign:"center", whiteSpace:"nowrap" }}>{f.type}</span>
                  <span style={{ color:"#c9d1da", fontSize:11, flex:1, lineHeight:1.35 }}>{f.msg}</span>
                  {trend && <Sparkline values={trend} color={lc} />}
                  <BADGE text={f.level} color={lc} />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Global threat gauge */}
        <Card style={{ marginBottom:0 }}>
          <ST icon="🌡️" label="Global Threat Assessment" color="#ff4d4d" />
          <div style={{ textAlign:"center" }}>
            <svg viewBox="0 0 200 115" style={{ width:"100%", maxWidth:210, margin:"0 auto", display:"block" }}>
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
          <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", marginTop:4 }}>
            {[[`${criticalCount} Critical`,"#ff4d4d"],[`${highCount} High`,"#ff9d00"],["8 Medium","#ffd700"],["5 Low","#00ff9d"]].map(([l,c]) => (
              <BADGE key={l} text={l} color={c} />
            ))}
          </div>
          <div style={{ marginTop:12, textAlign:"center" }}>
            <Btn onClick={() => setPage("threatmap")} color="#00ff9d">🌍 Open Threat Map</Btn>
          </div>
          {/* Module distribution */}
          <div style={{ marginTop:12, borderTop:"1px solid #1f2d45", paddingTop:10 }}>
            <div style={{ fontSize:9, color:"#4a5568", letterSpacing:2, marginBottom:7 }}>MODULE THREAT DISTRIBUTION</div>
            {[["CRITICAL","#ff4d4d"],["HIGH","#ff9d00"],["MEDIUM","#ffd700"],["LOW","#00ff9d"]].map(([level, color]) => {
              const count = Object.values(DOMAIN_THREAT).filter(v => v === level).length;
              const pct   = Math.round((count / (NAV.length - 1)) * 100);
              return (
                <div key={level} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <span style={{ color, fontSize:9, width:52, fontWeight:600 }}>{level}</span>
                  <div style={{ flex:1, height:4, background:"#1a2740", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:2 }} />
                  </div>
                  <span style={{ color:"#4a5568", fontSize:9, width:16, textAlign:"right" }}>{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── Featured modules ─────────────────────────────────────── */}
      <Divider label="FEATURED MODULES" />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px,1fr))", gap:10, marginBottom:14 }}>

        <div style={{ background:"#0d1626", border:"1px solid #ff9d0033", borderTop:"2px solid #ff9d00", borderRadius:10, padding:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <span style={{ fontSize:18 }}>🛢️</span>
            <span style={{ fontWeight:800, color:"#ff9d00", fontSize:14 }}>Energy Intelligence</span>
            <BADGE text="4 tools" color="#ff9d00" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:10 }}>
            {[["oilinfra","Oil Infra"],["chokepoint","Chokepoints"],["energyrisk","Energy Risk"],["energygrid","Grid Sim"]].map(([id, label]) => {
              const col = THREAT_COLOR[DOMAIN_THREAT[id]] || "#ff9d00";
              return (
                <button key={id} onClick={() => setPage(id)} style={{ background:"#111827", border:`1px solid ${col}2a`, borderRadius:6, padding:"7px 10px", cursor:"pointer", textAlign:"left", transition:"background 0.15s", display:"flex", alignItems:"center", gap:5 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1a2234"}
                  onMouseLeave={e => e.currentTarget.style.background = "#111827"}
                >
                  <span style={{ width:5, height:5, borderRadius:"50%", background:col, flexShrink:0 }} />
                  <span style={{ color:"#ff9d00", fontSize:11, fontWeight:600 }}>{label} →</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ background:"#0d1626", border:"1px solid #22d3ee33", borderTop:"2px solid #22d3ee", borderRadius:10, padding:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:18 }}>🎯</span>
            <span style={{ fontWeight:800, color:"#22d3ee", fontSize:14 }}>Scenario Builder</span>
            <BADGE text="AI Live" color="#22d3ee" />
          </div>
          <div style={{ color:"#4a5568", fontSize:12, marginBottom:14, lineHeight:1.5 }}>
            Multi-domain crisis scenarios — actors, events, AI-powered cascade analysis and escalation paths.
          </div>
          <Btn onClick={() => setPage("scenariobuilder")} color="#22d3ee" size="sm">Open Scenario Builder →</Btn>
        </div>

        <div style={{ background:"#0d1626", border:"1px solid #b47fff33", borderTop:"2px solid #b47fff", borderRadius:10, padding:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:18 }}>📋</span>
            <span style={{ fontWeight:800, color:"#b47fff", fontSize:14 }}>Intel Report Generator</span>
            <BADGE text="AI Live" color="#b47fff" />
          </div>
          <div style={{ color:"#4a5568", fontSize:12, marginBottom:14, lineHeight:1.5 }}>
            Structured multi-domain intelligence briefs — executive summary, threat actors, recommended actions.
          </div>
          <Btn onClick={() => setPage("intelreport")} color="#b47fff" size="sm">Open Report Generator →</Btn>
        </div>
      </div>

      {/* ── Pinned tools ─────────────────────────────────────────── */}
      {favs.length > 0 && (() => {
        const pinned = NAV.slice(1).filter(t => favs.includes(t.id));
        return (
          <>
            <Divider label="⭐ PINNED" />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:8, marginBottom:14 }}>
              {pinned.map(t => (
                <ToolCard key={t.id} t={t} accent={toolAccent(t.id)} setPage={setPage} isFav={true} onToggleFav={toggleFav} />
              ))}
            </div>
          </>
        );
      })()}

      {/* ── Core tools grid ──────────────────────────────────────── */}
      <Divider label="CORE TOOLS" />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:8 }}>
        {tools.filter(t => !isEnergy(t.id) && !isReport(t.id) && !isScenario(t.id)).map(t => (
          <ToolCard key={t.id} t={t} accent={toolAccent(t.id)} setPage={setPage} isFav={favs.includes(t.id)} onToggleFav={toggleFav} />
        ))}
      </div>
    </div>
  );
}
