import { useState, useEffect } from "react";
import { BADGE, Card, Btn, ST, Pulse } from "../components/shared";
import { NAV, TOOL_DESC, ENERGY_IDS } from "../constants";

const feed = [
  { time: "14:32", type: "CTI",        msg: "New IOC cluster linked to EMBER WOLF",               level: "HIGH",     page: "cti"        },
  { time: "14:18", type: "Oil Infra",  msg: "Drone threat detected — Abqaiq perimeter",            level: "CRITICAL", page: "oilinfra"   },
  { time: "13:55", type: "Chokepoint", msg: "Hormuz: new mine-laying report, strait traffic -18%", level: "CRITICAL", page: "chokepoint" },
  { time: "13:41", type: "PSYOP",      msg: "Coordinated narrative surge — Telegram",              level: "MEDIUM",   page: "psyop"      },
  { time: "12:59", type: "Maritime",   msg: "ADRIATICA SUN AIS blackout extended >8h",             level: "HIGH",     page: "maritime"   },
  { time: "12:30", type: "Disinfo",    msg: "Campaign #UA-2023-11 reactivated",                    level: "MEDIUM",   page: "disinfo"    },
  { time: "11:44", type: "Energy",     msg: "Germany resilience score drops to 58/100",            level: "MEDIUM",   page: "energyrisk" },
];

export default function Home({ setPage }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 2000); return () => clearInterval(t); }, []);

  const tools = NAV.slice(1);
  const isEnergy = id => ENERGY_IDS.includes(id);
  const isReport = id => id === "intelreport";

  return (
    <div>
      <div style={{ textAlign: "center", padding: "20px 0 14px" }}>
        <div style={{ fontSize: 36 }}>🛡️</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#00ff9d", margin: "4px 0 0" }}>SENTINEL</h1>
        <p style={{ color: "#9ca3af", margin: "5px 0 8px", fontSize: 13 }}>AI-Powered Defence Intelligence Platform</p>
        <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap" }}>
          <BADGE text="AI Powered" color="green" />
          <BADGE text="OSINT" color="blue" />
          <BADGE text="Dual-Use" color="yellow" />
          <BADGE text="18 Tools" color="orange" />
          <BADGE text="Energy Module" color="#ff9d00" />
          <BADGE text="v0.8" color="gray" />
        </div>
      </div>

      {/* Status bar */}
      <div style={{ background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 8, padding: "9px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Pulse color="#ff4d4d" size={8} />
          <span style={{ color: "#ff4d4d", fontSize: 12, fontWeight: 700 }}>THREAT LEVEL: ELEVATED</span>
        </div>
        <div style={{ color: "#9ca3af", fontSize: 12 }}>3 CRITICAL · 12 HIGH · Last update: 14:32 UTC</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[["CTI", "HIGH", "red"], ["Energy", "CRITICAL", "red"], ["Maritime", "HIGH", "red"], ["Bio", "MEDIUM", "yellow"]].map(([d, l, c]) => (
            <div key={d} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#9ca3af", fontSize: 11 }}>{d}</span>
              <BADGE text={l} color={c} />
            </div>
          ))}
        </div>
      </div>

      {/* Feed + gauge */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 12 }}>
        <Card style={{ marginBottom: 0 }}>
          <ST icon="📡" label="Live Intelligence Feed" color="#00ff9d" />
          {feed.map((f, i) => (
            <div key={i} onClick={() => setPage(f.page)} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 6, opacity: tick % 2 === 0 && i === 0 ? 0.5 : 1, transition: "opacity 1s", cursor: "pointer" }}>
              {i === 0 && <Pulse color="#ff4d4d" size={7} />}
              <span style={{ color: "#9ca3af", fontSize: 11, minWidth: 34 }}>{f.time}</span>
              <span style={{ background: "#1f2d45", color: f.type === "Oil Infra" || f.type === "Chokepoint" || f.type === "Energy" ? "#ff9d00" : "#4db8ff", fontSize: 9, fontWeight: 700, borderRadius: 3, padding: "1px 4px", minWidth: 48, textAlign: "center" }}>{f.type}</span>
              <span style={{ color: "#e2e8f0", fontSize: 12, flex: 1 }}>{f.msg}</span>
              <BADGE text={f.level} color={f.level === "CRITICAL" ? "red" : f.level === "HIGH" ? "red" : f.level === "MEDIUM" ? "yellow" : "green"} />
            </div>
          ))}
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
              <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="#1f2d45" strokeWidth="16" strokeLinecap="round" />
              <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="url(#arcGrad)" strokeWidth="16" strokeLinecap="round" strokeDasharray="251" strokeDashoffset="63" />
              <line x1="100" y1="105" x2="58" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="100" cy="105" r="7" fill="#111827" stroke="#fff" strokeWidth="2" />
              <text x="100" y="82" textAnchor="middle" fill="#ff4d4d" fontSize="12" fontWeight="bold">ELEVATED</text>
              <text x="14" y="120" fill="#00ff9d" fontSize="8">LOW</text>
              <text x="88" y="18" fill="#ffd700" fontSize="8">MED</text>
              <text x="162" y="120" fill="#ff0000" fontSize="8">CRIT</text>
            </svg>
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
            {[["3 Critical", "red"], ["12 High", "red"], ["8 Medium", "yellow"], ["5 Low", "green"]].map(([l, c]) => <BADGE key={l} text={l} color={c} />)}
          </div>
          <div style={{ marginTop: 10, textAlign: "center" }}>
            <Btn onClick={() => setPage("threatmap")} color="#1f2d45">🌍 Open Threat Map →</Btn>
          </div>
        </Card>
      </div>

      {/* Energy module highlight */}
      <div style={{ background: "linear-gradient(135deg,#1a1200,#111827)", border: "1px solid #ff9d0044", borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>🛢️</span>
          <span style={{ fontWeight: 800, color: "#ff9d00", fontSize: 15 }}>Energy Intelligence Module</span>
          <BADGE text="v0.6" color="orange" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
          {[
            ["oilinfra",   "🛢️ Oil Infrastructure",   "Monitor threats to critical O&G assets"],
            ["chokepoint", "🚢 Chokepoints",            "Global maritime energy choke analysis"],
            ["energyrisk", "📊 Energy Risk",            "National supply chain vulnerability"],
            ["energygrid", "⚡ Grid Simulator",         "Cascade failure simulation"],
          ].map(([id, label, desc]) => (
            <div key={id} style={{ background: "#0d1626", borderRadius: 7, padding: 12, cursor: "pointer", border: "1px solid #ff9d0033" }} onClick={() => setPage(id)}>
              <div style={{ fontWeight: 700, color: "#ff9d00", marginBottom: 4, fontSize: 13 }}>{label}</div>
              <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 8 }}>{desc}</div>
              <Btn onClick={() => setPage(id)} color="#ff9d00">Open →</Btn>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario Builder highlight */}
      <div style={{ background: "linear-gradient(135deg,#00131a,#111827)", border: "1px solid #22d3ee44", borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>🎯</span>
          <span style={{ fontWeight: 800, color: "#22d3ee", fontSize: 15 }}>Scenario Builder</span>
          <BADGE text="New" color="#22d3ee" />
        </div>
        <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 10 }}>Build multi-domain crisis scenarios — define actors, events across domains, and get AI-powered cascade analysis, escalation paths and response options.</div>
        <Btn onClick={() => setPage("scenariobuilder")} color="#22d3ee">🎯 Open Scenario Builder →</Btn>
      </div>

      {/* Intel Report highlight */}
      <div style={{ background: "linear-gradient(135deg,#0d0a1e,#111827)", border: "1px solid #b47fff44", borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span style={{ fontWeight: 800, color: "#b47fff", fontSize: 15 }}>Intelligence Report Generator</span>
          <BADGE text="New" color="#b47fff" />
        </div>
        <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 10 }}>Generate structured multi-domain intelligence briefs — executive summary, key findings, threat actors, recommended actions.</div>
        <Btn onClick={() => setPage("intelreport")} color="#b47fff">📋 Open Report Generator →</Btn>
      </div>

      {/* Core tools grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 9 }}>
        {tools.filter(t => !isEnergy(t.id) && !isReport(t.id)).map(t => (
          <Card key={t.id} style={{ cursor: "pointer", position: "relative", padding: 13 }}>
            <div style={{ fontSize: 22, marginBottom: 5 }}>{t.icon}</div>
            <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 3, fontSize: 13 }}>{t.label}</div>
            <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 9, minHeight: 30 }}>{TOOL_DESC[t.id]}</div>
            <Btn onClick={() => setPage(t.id)} color="#1f2d45">Open →</Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}
