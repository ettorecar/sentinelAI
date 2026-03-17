import { useState } from "react";
import { BADGE, Card, ST, PageHeader, StatBar, Btn, LiveBadge } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

const rc = r => r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";
const rb = r => r === "CRITICAL" || r === "HIGH" ? "red" : r === "MEDIUM" ? "yellow" : "green";
const typeIcons = { Refinery: "⚗️", Pipeline: "〰️", Terminal: "⚓" };

const ASSETS = [
  { id: "OG-001", name: "Abqaiq Processing Facility",        country: "Saudi Arabia", type: "Refinery", risk: "CRITICAL", mx: 430, my: 185, incident: "Drone swarm threat detected in perimeter",     lastEvt: "14/03", barrel: "7.0Mb/d" },
  { id: "OG-002", name: "Druzhba Pipeline — Western Segment", country: "Russia/EU",    type: "Pipeline", risk: "HIGH",     mx: 358, my: 108, incident: "Unexplained pressure anomaly, 3rd segment",  lastEvt: "13/03", barrel: "1.2Mb/d" },
  { id: "OG-003", name: "Ras Tanura Marine Terminal",         country: "Saudi Arabia", type: "Terminal", risk: "HIGH",     mx: 435, my: 180, incident: "Suspicious vessel loitering 12nm offshore",   lastEvt: "12/03", barrel: "6.5Mb/d" },
  { id: "OG-004", name: "Kharg Island Terminal",              country: "Iran",         type: "Terminal", risk: "MEDIUM",   mx: 438, my: 172, incident: "Elevated military activity nearby",           lastEvt: "11/03", barrel: "2.5Mb/d" },
  { id: "OG-005", name: "Nord Stream Monitoring Zone",        country: "Baltic Sea",   type: "Pipeline", risk: "HIGH",     mx: 335, my: 97,  incident: "Seismic anomaly detected near route",        lastEvt: "10/03", barrel: "0Mb/d"   },
  { id: "OG-006", name: "Kirkuk-Ceyhan Pipeline",             country: "Iraq/Turkey",  type: "Pipeline", risk: "MEDIUM",   mx: 388, my: 148, incident: "Armed group activity near pumping station",   lastEvt: "09/03", barrel: "0.6Mb/d" },
  { id: "OG-007", name: "Sumed Pipeline",                     country: "Egypt",        type: "Pipeline", risk: "LOW",      mx: 368, my: 175, incident: "Routine maintenance in progress",             lastEvt: "08/03", barrel: "2.3Mb/d" },
];

function FilterBtn({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  const accent = label === "CRITICAL" ? "#ff0000" : label === "HIGH" ? "#ff4d4d" : label === "MEDIUM" ? "#ffd700" : label === "LOW" ? "#00ff9d" : "#ff9d00";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? accent : hovered ? accent + "22" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? accent : "#9ca3af",
        border: `1px solid ${active ? accent : hovered ? accent + "44" : "transparent"}`,
        borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function IncidentRow({ a, onClick, selected }) {
  const [hovered, setHovered] = useState(false);
  const color = rc(a.risk);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? "#141e30" : hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 7, padding: "10px 14px", marginBottom: 7,
        borderLeft: `3px solid ${color}`,
        border: `1px solid ${selected ? color + "55" : hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${color}`,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "monospace" }}>{a.id} · {a.lastEvt}</span>
          <div style={{ fontWeight: 700, color: selected ? "#ffffff" : "#e2e8f0", marginTop: 2 }}>
            {typeIcons[a.type]} {a.name}
          </div>
          <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>
            {a.country} · Flow: <span style={{ color: "#ff9d00", fontWeight: 600 }}>{a.barrel}</span>
          </div>
          <div style={{ color: "#ffd700", fontSize: 12, marginTop: 4 }}>⚠ {a.incident}</div>
        </div>
        <BADGE text={a.risk} color={rb(a.risk)} />
      </div>
    </div>
  );
}

export default function OilInfra() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function analyzeAsset(a) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey,
        `You are an energy security analyst. Assess this oil & gas infrastructure threat in 3-4 sentences covering: attack vector analysis, geopolitical context, supply impact, and recommended protective measures. Asset: ${a.name} (${a.country}, Type: ${a.type}, Flow: ${a.barrel}, Risk: ${a.risk}). Incident: ${a.incident}.`
      );
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  function selectAsset(a) {
    setSel(sel?.id === a.id ? null : a);
    setAiResult(null); setAiError("");
  }

  const filtered = filter === "ALL" ? ASSETS : ASSETS.filter(a => a.risk === filter);

  return (
    <div>
      <PageHeader icon="🛢️" title="Oil & Gas Infrastructure Monitor" sub="Real-time threat assessment for critical energy infrastructure worldwide." accent="#ff9d00" mock />

      <StatBar stats={[
        { label: "Monitored Assets", value: "47",       color: "#ff9d00" },
        { label: "Critical Threats", value: "2",        color: "#ff4d4d" },
        { label: "At-Risk Flow",     value: "18.1Mb/d", color: "#ffd700" },
        { label: "Incidents (24h)",  value: "7",        color: "#4db8ff" },
      ]} />

      {/* Map */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "10px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, color: "#ff9d00", fontSize: 13 }}>🗺️ Global Asset Map</div>
          <span style={{ color: "#4a5568", fontSize: 10 }}>Click asset to inspect</span>
        </div>
        <svg viewBox="0 0 700 320" style={{ width: "100%", background: "#050d1a", display: "block" }}>
          {[70,130,200,270].map(y => <line key={y} x1={0} y1={y} x2={700} y2={y} stroke="#0d2040" strokeWidth="1" />)}
          {[0,140,280,420,560,700].map(x => <line key={x} x1={x} y1={0} x2={x} y2={320} stroke="#0d2040" strokeWidth="1" />)}
          <path d="M 60 80 Q 80 60 120 65 Q 150 60 175 80 Q 185 100 180 130 Q 170 160 155 180 Q 140 200 120 210 Q 100 195 85 175 Q 65 150 55 120 Q 48 95 60 80Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 145 220 Q 165 215 180 230 Q 190 250 185 280 Q 178 310 165 318 Q 150 320 138 308 Q 125 290 125 260 Q 125 238 145 220Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 295 70 Q 330 60 365 70 Q 385 80 390 100 Q 385 115 365 118 Q 340 122 315 115 Q 295 105 290 90 Q 288 78 295 70Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 295 130 Q 330 125 360 135 Q 375 155 372 185 Q 368 220 355 248 Q 338 268 318 265 Q 298 260 288 238 Q 278 210 280 180 Q 282 152 295 130Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 400 65 Q 470 55 540 65 Q 600 70 650 85 Q 685 100 695 125 Q 690 150 665 160 Q 630 168 590 162 Q 545 155 500 148 Q 455 140 420 128 Q 395 115 390 95 Q 390 78 400 65Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 600 255 Q 640 250 670 263 Q 685 280 678 300 Q 665 315 640 315 Q 615 312 605 295 Q 596 277 600 255Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          {/* Pipeline routes */}
          <path d="M 358 108 Q 370 130 388 148" fill="none" stroke="#ff9d00" strokeWidth="1.5" strokeDasharray="5" opacity="0.4" />
          <path d="M 368 175 Q 380 178 388 148" fill="none" stroke="#ff9d00" strokeWidth="1.5" strokeDasharray="5" opacity="0.4" />
          {ASSETS.map((a) => {
            const isSelected = sel?.id === a.id;
            const color = rc(a.risk);
            return (
              <g key={a.id} onClick={() => selectAsset(a)} style={{ cursor: "pointer" }}>
                {a.risk === "CRITICAL" && <circle cx={a.mx} cy={a.my} r={18} fill="none" stroke="#ff0000" strokeWidth="0.8" opacity="0.35" />}
                <circle cx={a.mx} cy={a.my} r={isSelected ? 11 : 8} fill={color} opacity={0.9} />
                <circle cx={a.mx} cy={a.my} r={isSelected ? 16 : 12} fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
                <text x={a.mx + 14} y={a.my + 4} fill={isSelected ? "#e2e8f0" : "#6b7a8d"} fontSize={isSelected ? 9 : 8} fontWeight={isSelected ? "700" : "400"}>
                  {a.name.split(" ")[0]}
                </text>
              </g>
            );
          })}
          {[["Critical","#ff0000",10],["High","#ff4d4d",70],["Medium","#ffd700",125],["Low","#00ff9d",180]].map(([l,c,x]) => (
            <g key={l}><circle cx={x+8} cy={308} r={5} fill={c} /><text x={x+17} y={312} fill="#6b7a8d" fontSize="8">{l}</text></g>
          ))}
        </svg>

        {/* Selected asset detail */}
        {sel && (
          <div style={{ margin: "0 14px 14px", background: "#0a1628", borderRadius: 8, padding: 14, borderLeft: `3px solid ${rc(sel.risk)}`, border: `1px solid ${rc(sel.risk)}33`, borderLeft: `3px solid ${rc(sel.risk)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 3 }}>ASSET INTELLIGENCE</div>
                <div style={{ fontWeight: 800, color: "#e2e8f0", fontSize: 14 }}>{typeIcons[sel.type]} {sel.name}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <BADGE text={sel.risk} color={rb(sel.risk)} />
                <button onClick={() => setSel(null)} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>✕</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
              {[["COUNTRY", sel.country, "#e2e8f0"], ["TYPE", sel.type, "#e2e8f0"], ["FLOW", sel.barrel, "#ff9d00"], ["LAST EVENT", sel.lastEvt, "#4db8ff"]].map(([l,v,c]) => (
                <div key={l} style={{ background: "#0d1626", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>{l}</div>
                  <div style={{ color: c, fontSize: 12, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#1a0e00", border: "1px solid #ffd70033", borderRadius: 6, padding: "8px 12px", marginBottom: 10 }}>
              <span style={{ color: "#ffd700", fontSize: 13 }}>⚠ {sel.incident}</span>
            </div>
            {apiKey && (
              <Btn onClick={() => analyzeAsset(sel)} disabled={aiLoading} color="#ff9d00" size="sm">
                {aiLoading ? "⏳ Analyzing..." : "🤖 AI Threat Assessment"}
              </Btn>
            )}
            {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
            {aiResult && (
              <div style={{ background: "#0a0c00", border: "1px solid #ff9d0033", borderLeft: "3px solid #ff9d00", borderRadius: 6, padding: 12, marginTop: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <LiveBadge />
                  <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI ASSET THREAT ASSESSMENT · {sel.id}</span>
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.7 }}>{aiResult}</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Incident log */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <ST icon="⚠️" label="Incident Log" color="#ff9d00" sub={`${filtered.length} assets · sorted by date`} />
          <div style={{ display: "flex", gap: 5 }}>
            {["ALL","CRITICAL","HIGH","MEDIUM","LOW"].map(f => (
              <FilterBtn key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
            ))}
          </div>
        </div>
        {filtered.map(a => (
          <IncidentRow key={a.id} a={a} selected={sel?.id === a.id} onClick={() => selectAsset(a)} />
        ))}
      </Card>
    </div>
  );
}
