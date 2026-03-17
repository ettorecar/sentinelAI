import { useState, useEffect } from "react";
import { BADGE, Card, MockBadge, Btn, LiveBadge } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

const hotspots = [
  { id: 1,  label: "Eastern Ukraine",  type: "Kinetic",      level: "CRITICAL", x: 390, y: 118, actors: "APT-1887 + ground forces" },
  { id: 2,  label: "South China Sea",  type: "Maritime",     level: "HIGH",     x: 620, y: 195, actors: "PLAN vessels, AIS spoofing" },
  { id: 3,  label: "Sahel Region",     type: "Terrorism",    level: "HIGH",     x: 270, y: 230, actors: "Multiple non-state actors" },
  { id: 4,  label: "Baltic Sea",       type: "Hybrid",       level: "HIGH",     x: 345, y: 90,  actors: "Undersea cable interference" },
  { id: 5,  label: "Horn of Africa",   type: "Bio+Piracy",   level: "MEDIUM",   x: 380, y: 245, actors: "BT-2026-003 + maritime" },
  { id: 6,  label: "Taiwan Strait",    type: "Cyber+Naval",  level: "CRITICAL", x: 635, y: 168, actors: "IRON CARDINAL + PLAN" },
  { id: 7,  label: "Persian Gulf",     type: "Maritime",     level: "MEDIUM",   x: 460, y: 185, actors: "Tanker harassment ops" },
  { id: 8,  label: "Eastern Balkans",  type: "Bio+Disinfo",  level: "HIGH",     x: 360, y: 125, actors: "BT-2026-031 + EMBER WOLF" },
  { id: 9,  label: "Venezuela",        type: "Cyber",        level: "MEDIUM",   x: 185, y: 230, actors: "Criminal syndicate APT" },
  { id: 10, label: "North Korea",      type: "Cyber+ICBM",   level: "CRITICAL", x: 650, y: 140, actors: "State APT cluster" },
];

const typeColor = t =>
  t === "Kinetic" ? "#ff0000"
  : t === "Cyber" || t === "Cyber+Naval" || t === "Cyber+ICBM" ? "#4db8ff"
  : t === "Maritime" ? "#00cfff"
  : t === "Terrorism" ? "#ff9d00"
  : t === "Bio+Piracy" || t === "Bio+Disinfo" ? "#00ff9d"
  : "#b47fff";

export default function ThreatMap() {
  const [apiKey] = useApiKey();
  const [tick, setTick] = useState(0);
  const [sel, setSel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t); }, []);

  async function analyzeHotspot(h) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey, `You are a senior intelligence analyst. Provide a concise threat assessment for: ${h.label} (Type: ${h.type}, Level: ${h.level}, Actors: ${h.actors}). Return plain text — 3-4 sentences covering: current situation, key actors, immediate risks, and recommended posture.`);
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>🌍 Global Threat Map</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 16 }}>Real-time geolocation of active threat incidents worldwide. <MockBadge /></p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {[["Active Conflicts", "7", "#ff4d4d"], ["Cyber Incidents", "143", "#4db8ff"], ["Maritime Alerts", "12", "#00cfff"], ["Bio Signals", "14", "#00ff9d"]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center", padding: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ color: "#9ca3af", fontSize: 11 }}>{l}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <svg viewBox="0 0 780 380" style={{ width: "100%", background: "#050d1a", display: "block" }}>
          {[60, 130, 200, 270, 340].map(y => <line key={y} x1={0} y1={y} x2={780} y2={y} stroke="#0d2040" strokeWidth="1" />)}
          {[0, 130, 260, 390, 520, 650, 780].map(x => <line key={x} x1={x} y1={0} x2={x} y2={380} stroke="#0d2040" strokeWidth="1" />)}
          <path d="M 60 80 Q 80 60 120 65 Q 150 60 175 80 Q 185 100 180 130 Q 170 160 155 180 Q 140 200 120 210 Q 100 195 85 175 Q 65 150 55 120 Q 48 95 60 80Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 145 220 Q 165 215 180 230 Q 190 250 185 280 Q 178 310 165 325 Q 150 330 138 315 Q 125 295 125 265 Q 125 240 145 220Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 295 70 Q 330 60 365 70 Q 385 80 390 100 Q 385 115 365 118 Q 340 122 315 115 Q 295 105 290 90 Q 288 78 295 70Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 295 130 Q 330 125 360 135 Q 375 155 372 185 Q 368 220 355 248 Q 338 268 318 265 Q 298 260 288 238 Q 278 210 280 180 Q 282 152 295 130Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 400 65 Q 470 55 540 65 Q 600 70 650 85 Q 685 100 695 125 Q 690 150 665 160 Q 630 168 590 162 Q 545 155 500 148 Q 455 140 420 128 Q 395 115 390 95 Q 390 78 400 65Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 600 260 Q 640 255 670 268 Q 685 285 678 305 Q 665 318 640 318 Q 615 315 605 298 Q 596 280 600 260Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <line x1={390} y1={118} x2={360} y2={125} stroke="#ff4d4d" strokeWidth="0.5" strokeDasharray="3" opacity="0.4" />
          <line x1={620} y1={195} x2={635} y2={168} stroke="#ff4d4d" strokeWidth="0.5" strokeDasharray="3" opacity="0.4" />
          {hotspots.map((h, i) => {
            const c = typeColor(h.type);
            const crit = h.level === "CRITICAL";
            const phase = (tick + i * 2) % 8;
            return (
              <g key={h.id} onClick={() => setSel(sel?.id === h.id ? null : h)} style={{ cursor: "pointer" }}>
                {crit && <circle cx={h.x} cy={h.y} r={18 + phase * 1.5} fill="none" stroke={c} strokeWidth="0.5" opacity={Math.max(0, 0.5 - phase * 0.06)} />}
                <circle cx={h.x} cy={h.y} r={crit ? 9 : 6} fill={c} opacity={0.9} />
                <circle cx={h.x} cy={h.y} r={crit ? 14 : 10} fill="none" stroke={c} strokeWidth="1" opacity="0.4" />
                {sel?.id === h.id && <circle cx={h.x} cy={h.y} r={18} fill="none" stroke={c} strokeWidth="2" />}
              </g>
            );
          })}
          {sel && <text x={sel.x + 16} y={sel.y + 4} fill="#e2e8f0" fontSize="9" fontWeight="bold">{sel.label}</text>}
          {[["Kinetic", "#ff0000", 20], ["Cyber", "#4db8ff", 90], ["Maritime", "#00cfff", 155], ["Bio", "#00ff9d", 215], ["Hybrid", "#b47fff", 270]].map(([l, c, x]) => (
            <g key={l}><circle cx={x} cy={368} r={5} fill={c} /><text x={x + 9} y={372} fill="#9ca3af" fontSize="8">{l}</text></g>
          ))}
        </svg>
      </Card>

      {sel && (
        <Card style={{ borderLeft: `4px solid ${typeColor(sel.type)}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#e2e8f0" }}>{sel.label}</div>
              <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>Type: <span style={{ color: typeColor(sel.type) }}>{sel.type}</span></div>
              <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>Actors: <span style={{ color: "#ffd700" }}>{sel.actors}</span></div>
            </div>
            <BADGE text={sel.level} color={sel.level === "CRITICAL" || sel.level === "HIGH" ? "red" : "yellow"} />
          </div>
          {apiKey && (
            <Btn onClick={() => analyzeHotspot(sel)} disabled={aiLoading} color="#1f2d45">
              {aiLoading ? "⏳ Analyzing..." : "🤖 AI Threat Assessment"}
            </Btn>
          )}
          {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
          {aiResult && (
            <div style={{ background: "#0d1626", borderRadius: 6, padding: 12, marginTop: 10, borderLeft: "3px solid #00ff9d" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <LiveBadge />
                <span style={{ color: "#9ca3af", fontSize: 11 }}>AI THREAT ASSESSMENT</span>
              </div>
              <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.6 }}>{aiResult}</div>
            </div>
          )}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {hotspots.map(h => (
          <div key={h.id} onClick={() => setSel(sel?.id === h.id ? null : h)}
            style={{ background: "#0d1626", borderRadius: 6, padding: "8px 12px", cursor: "pointer", borderLeft: `3px solid ${typeColor(h.type)}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 13 }}>{h.label}</div>
              <div style={{ color: "#9ca3af", fontSize: 11 }}>{h.type}</div>
            </div>
            <BADGE text={h.level} color={h.level === "CRITICAL" || h.level === "HIGH" ? "red" : "yellow"} />
          </div>
        ))}
      </div>
    </div>
  );
}
