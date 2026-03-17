import { useState } from "react";
import { BADGE, Card, ST, MockBadge, Btn, LiveBadge } from "../components/shared";
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
const typeIcons = { Refinery: "⚗️", Pipeline: "〰️", Terminal: "⚓" };

const assets = [
  { id: "OG-001", name: "Abqaiq Processing Facility",       country: "Saudi Arabia", type: "Refinery", risk: "CRITICAL", mx: 430, my: 185, incident: "Drone swarm threat detected in perimeter",          lastEvt: "14/03", barrel: "7.0Mb/d" },
  { id: "OG-002", name: "Druzhba Pipeline — Western Segment",country: "Russia/EU",    type: "Pipeline", risk: "HIGH",     mx: 358, my: 108, incident: "Unexplained pressure anomaly, 3rd segment",         lastEvt: "13/03", barrel: "1.2Mb/d" },
  { id: "OG-003", name: "Ras Tanura Marine Terminal",        country: "Saudi Arabia", type: "Terminal", risk: "HIGH",     mx: 435, my: 180, incident: "Suspicious vessel loitering 12nm offshore",          lastEvt: "12/03", barrel: "6.5Mb/d" },
  { id: "OG-004", name: "Kharg Island Terminal",             country: "Iran",         type: "Terminal", risk: "MEDIUM",   mx: 438, my: 172, incident: "Elevated military activity nearby",                  lastEvt: "11/03", barrel: "2.5Mb/d" },
  { id: "OG-005", name: "Nord Stream Monitoring Zone",       country: "Baltic Sea",   type: "Pipeline", risk: "HIGH",     mx: 335, my: 97,  incident: "Seismic anomaly detected near route",               lastEvt: "10/03", barrel: "0Mb/d"   },
  { id: "OG-006", name: "Kirkuk-Ceyhan Pipeline",            country: "Iraq/Turkey",  type: "Pipeline", risk: "MEDIUM",   mx: 388, my: 148, incident: "Armed group activity near pumping station",          lastEvt: "09/03", barrel: "0.6Mb/d" },
  { id: "OG-007", name: "Sumed Pipeline",                    country: "Egypt",        type: "Pipeline", risk: "LOW",      mx: 368, my: 175, incident: "Routine maintenance in progress",                    lastEvt: "08/03", barrel: "2.3Mb/d" },
];

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
      const text = await callClaude(apiKey, `You are an energy security analyst. Assess this oil & gas infrastructure threat in 3-4 sentences covering: attack vector analysis, geopolitical context, supply impact, and recommended protective measures. Asset: ${a.name} (${a.country}, Type: ${a.type}, Flow: ${a.barrel}, Risk: ${a.risk}). Incident: ${a.incident}.`);
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }
  const filtered = filter === "ALL" ? assets : assets.filter(a => a.risk === filter);

  return (
    <div>
      <h2 style={{ color: "#ff9d00", marginTop: 0 }}>🛢️ Oil & Gas Infrastructure Threat Monitor</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 16 }}>Real-time threat assessment for critical energy infrastructure worldwide. <MockBadge /></p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {[["Monitored Assets", "47", "#ff9d00"], ["Critical Threats", "2", "#ff4d4d"], ["At-Risk Flow", "18.1Mb/d", "#ffd700"], ["Incidents (24h)", "7", "#4db8ff"]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center", padding: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ color: "#9ca3af", fontSize: 11 }}>{l}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px 0", fontWeight: 700, color: "#4db8ff" }}>🗺️ Global Asset Map</div>
        <svg viewBox="0 0 700 320" style={{ width: "100%", background: "#050d1a", display: "block" }}>
          {[70, 130, 200, 270].map(y => <line key={y} x1={0} y1={y} x2={700} y2={y} stroke="#0d2040" strokeWidth="1" />)}
          {[0, 140, 280, 420, 560, 700].map(x => <line key={x} x1={x} y1={0} x2={x} y2={320} stroke="#0d2040" strokeWidth="1" />)}
          <path d="M 60 80 Q 80 60 120 65 Q 150 60 175 80 Q 185 100 180 130 Q 170 160 155 180 Q 140 200 120 210 Q 100 195 85 175 Q 65 150 55 120 Q 48 95 60 80Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 145 220 Q 165 215 180 230 Q 190 250 185 280 Q 178 310 165 318 Q 150 320 138 308 Q 125 290 125 260 Q 125 238 145 220Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 295 70 Q 330 60 365 70 Q 385 80 390 100 Q 385 115 365 118 Q 340 122 315 115 Q 295 105 290 90 Q 288 78 295 70Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 295 130 Q 330 125 360 135 Q 375 155 372 185 Q 368 220 355 248 Q 338 268 318 265 Q 298 260 288 238 Q 278 210 280 180 Q 282 152 295 130Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 400 65 Q 470 55 540 65 Q 600 70 650 85 Q 685 100 695 125 Q 690 150 665 160 Q 630 168 590 162 Q 545 155 500 148 Q 455 140 420 128 Q 395 115 390 95 Q 390 78 400 65Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 600 255 Q 640 250 670 263 Q 685 280 678 300 Q 665 315 640 315 Q 615 312 605 295 Q 596 277 600 255Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 358 108 Q 370 130 388 148" fill="none" stroke="#ff9d00" strokeWidth="1.5" strokeDasharray="5" opacity="0.5" />
          <path d="M 368 175 Q 380 178 388 148" fill="none" stroke="#ff9d00" strokeWidth="1.5" strokeDasharray="5" opacity="0.5" />
          <path d="M 430 185 Q 432 182 435 180" fill="none" stroke="#ff9d00" strokeWidth="1.5" strokeDasharray="5" opacity="0.5" />
          {assets.map((a, i) => (
            <g key={i} onClick={() => setSel(sel?.id === a.id ? null : a)} style={{ cursor: "pointer" }}>
              {a.risk === "CRITICAL" && <circle cx={a.mx} cy={a.my} r={16} fill="none" stroke="#ff0000" strokeWidth="0.8" opacity="0.4" />}
              <circle cx={a.mx} cy={a.my} r={sel?.id === a.id ? 10 : 7} fill={rc(a.risk)} opacity={0.9} />
              <circle cx={a.mx} cy={a.my} r={sel?.id === a.id ? 14 : 10} fill="none" stroke={rc(a.risk)} strokeWidth="1" opacity="0.3" />
              <text x={a.mx + 12} y={a.my + 4} fill="#e2e8f0" fontSize="8">{a.name.split(" ")[0]}</text>
            </g>
          ))}
          {[["Critical", "#ff0000", 10], ["High", "#ff4d4d", 70], ["Medium", "#ffd700", 125], ["Low", "#00ff9d", 180]].map(([l, c, x]) => (
            <g key={l}><circle cx={x + 8} cy={308} r={5} fill={c} /><text x={x + 17} y={312} fill="#9ca3af" fontSize="8">{l}</text></g>
          ))}
        </svg>
        {sel && (
          <div style={{ margin: "0 16px 16px", background: "#0d1626", borderRadius: 8, padding: 14, borderLeft: `3px solid ${rc(sel.risk)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 800, color: "#e2e8f0" }}>{typeIcons[sel.type]} {sel.name}</div>
              <BADGE text={sel.risk} color={sel.risk === "CRITICAL" || sel.risk === "HIGH" ? "red" : sel.risk === "MEDIUM" ? "yellow" : "green"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[["Country", sel.country], ["Type", sel.type], ["Flow", sel.barrel], ["Last Event", sel.lastEvt]].map(([l, v]) => (
                <div key={l}><div style={{ color: "#9ca3af", fontSize: 10 }}>{l}</div><div style={{ color: "#e2e8f0", fontSize: 12 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ marginTop: 8, color: "#ffd700", fontSize: 13 }}>⚠️ {sel.incident}</div>
            <div style={{ marginTop: 10 }}>
              {apiKey && (
                <Btn onClick={() => analyzeAsset(sel)} disabled={aiLoading} color="#1f2d45">
                  {aiLoading ? "⏳ Analyzing..." : "🤖 AI Threat Assessment"}
                </Btn>
              )}
              {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
              {aiResult && (
                <div style={{ background: "#0d1626", borderRadius: 6, padding: 10, marginTop: 10, borderLeft: "3px solid #ff9d00" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                    <LiveBadge />
                    <span style={{ color: "#9ca3af", fontSize: 11 }}>AI ASSET THREAT ASSESSMENT</span>
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.6 }}>{aiResult}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <ST icon="⚠️" label="Incident Log" color="#ff9d00" />
          <div style={{ display: "flex", gap: 6 }}>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ background: filter === f ? "#ff9d00" : "#1f2d45", color: filter === f ? "#0a0f1e" : "#9ca3af", border: "none", borderRadius: 4, padding: "3px 9px", cursor: "pointer", fontSize: 11, fontWeight: filter === f ? 700 : 400 }}>{f}</button>
            ))}
          </div>
        </div>
        {filtered.map(a => (
          <div key={a.id} style={{ background: "#0d1626", borderRadius: 7, padding: "10px 14px", marginBottom: 7, borderLeft: `3px solid ${rc(a.risk)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ color: "#9ca3af", fontSize: 10, fontFamily: "monospace" }}>{a.id} · {a.lastEvt}</span>
                <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{typeIcons[a.type]} {a.name}</div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>{a.country} · Flow: <span style={{ color: "#ff9d00" }}>{a.barrel}</span></div>
                <div style={{ color: "#ffd700", fontSize: 12, marginTop: 3 }}>⚠️ {a.incident}</div>
              </div>
              <BADGE text={a.risk} color={a.risk === "CRITICAL" || a.risk === "HIGH" ? "red" : a.risk === "MEDIUM" ? "yellow" : "green"} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
