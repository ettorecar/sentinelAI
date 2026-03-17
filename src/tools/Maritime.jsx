import { useState } from "react";
import { BADGE, Card, MockBadge, Btn, LiveBadge } from "../components/shared";
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

const vessels = [
  { mmsi: "247123456", name: "ADRIATICA SUN", flag: "🇮🇹", anomaly: "AIS blackout 6h",          risk: "HIGH",   type: "Cargo",     mx: 298, my: 112 },
  { mmsi: "212987654", name: "AEGEAN STAR",   flag: "🇬🇷", anomaly: "Unusual anchorage",         risk: "MEDIUM", type: "Tanker",    mx: 390, my: 178 },
  { mmsi: "538001234", name: "PACIFIC WOLF",  flag: "🇲🇭", anomaly: "Speed anomaly",             risk: "MEDIUM", type: "Bulk",      mx: 320, my: 118 },
  { mmsi: "636091234", name: "LIBERIA MOON",  flag: "🇱🇷", anomaly: "None",                      risk: "LOW",    type: "Container", mx: 295, my: 200 },
  { mmsi: "311000450", name: "ATLAS PRIME",   flag: "🇧🇸", anomaly: "Dark ship rendezvous",      risk: "HIGH",   type: "Tanker",    mx: 168, my: 185 },
];
const rc = r => r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";

export default function Maritime() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function analyzeVessel(v) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey, `You are a maritime intelligence analyst. Analyze this AIS anomaly and provide an intelligence assessment in 3-4 sentences covering: likely explanation, risk level, and recommended action. Vessel: ${v.name} (MMSI: ${v.mmsi}, Flag: ${v.flag?.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")}, Type: ${v.type}). Anomaly: ${v.anomaly}. Risk: ${v.risk}.`);
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>🌊 Maritime Anomaly Tracker</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>AIS anomaly detection — Mediterranean theatre. <MockBadge /></p>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px 0", fontWeight: 700, color: "#4db8ff" }}>🗺️ Mediterranean Map</div>
        <svg viewBox="0 0 520 280" style={{ width: "100%", background: "#0a1628", display: "block" }}>
          <path d="M 60 80 Q 100 60 160 70 Q 200 65 250 75 Q 310 70 370 80 Q 420 85 460 100 Q 480 120 470 150 Q 450 170 420 175 Q 390 180 360 170 Q 330 178 300 195 Q 270 210 250 220 Q 220 228 200 220 Q 170 215 150 200 Q 120 185 100 170 Q 70 155 55 130 Q 45 105 60 80Z" fill="#0d2040" stroke="#1f4080" strokeWidth="1.5" />
          <path d="M 260 75 Q 270 100 275 130 Q 280 160 295 185 Q 300 195 295 200 Q 285 205 280 195 Q 268 178 260 160 Q 252 138 250 110 Q 248 88 255 75Z" fill="#0a1628" stroke="#1f4080" strokeWidth="1" />
          {vessels.map((v, i) => (
            <g key={i} onClick={() => setSel(sel?.mmsi === v.mmsi ? null : v)} style={{ cursor: "pointer" }}>
              <circle cx={v.mx} cy={v.my} r={sel?.mmsi === v.mmsi ? 10 : 7} fill={rc(v.risk)} opacity={0.85} />
              <circle cx={v.mx} cy={v.my} r={sel?.mmsi === v.mmsi ? 14 : 11} fill="none" stroke={rc(v.risk)} strokeWidth="1" opacity="0.4" />
              <text x={v.mx} y={v.my - 14} textAnchor="middle" fill="#e2e8f0" fontSize="8">{v.name}</text>
            </g>
          ))}
        </svg>
        {sel && (
          <div style={{ margin: "0 14px 14px", background: "#0d1626", borderRadius: 7, padding: 12, borderLeft: `3px solid ${rc(sel.risk)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontWeight: 800, color: "#e2e8f0" }}>{sel.flag} {sel.name}</div>
              <BADGE text={sel.risk} color={sel.risk === "HIGH" ? "red" : sel.risk === "MEDIUM" ? "yellow" : "green"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
              {[["MMSI", sel.mmsi], ["Type", sel.type], ["Anomaly", sel.anomaly], ["Risk", sel.risk]].map(([l, v]) => (
                <div key={l}><div style={{ color: "#9ca3af", fontSize: 10 }}>{l}</div><div style={{ color: "#e2e8f0", fontSize: 11 }}>{v}</div></div>
              ))}
            </div>
            {apiKey && (
              <Btn onClick={() => analyzeVessel(sel)} disabled={aiLoading} color="#1f2d45">
                {aiLoading ? "⏳ Analyzing..." : "🤖 AI AIS Analysis"}
              </Btn>
            )}
            {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
            {aiResult && (
              <div style={{ background: "#051a0d", borderRadius: 6, padding: 10, marginTop: 10, borderLeft: "3px solid #00ff9d" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                  <LiveBadge />
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>AI VESSEL ASSESSMENT</span>
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.6 }}>{aiResult}</div>
              </div>
            )}
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10, marginTop: 14 }}>
        {vessels.map(v => (
          <div key={v.mmsi} onClick={() => setSel(sel?.mmsi === v.mmsi ? null : v)}
            style={{ background: "#0d1626", borderRadius: 7, padding: "10px 14px", cursor: "pointer", borderLeft: `3px solid ${rc(v.risk)}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 13 }}>{v.flag} {v.name}</div>
              <div style={{ color: "#9ca3af", fontSize: 11 }}>{v.type} · {v.anomaly}</div>
            </div>
            <BADGE text={v.risk} color={v.risk === "HIGH" ? "red" : v.risk === "MEDIUM" ? "yellow" : "green"} />
          </div>
        ))}
      </div>
    </div>
  );
}
