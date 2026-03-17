import { useState, useEffect } from "react";
import { BADGE, Card, Input, Btn, ST, MockBadge, LiveBadge } from "../components/shared";
import { RC } from "../constants";
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

const passes = [
  { sat: "SENTINEL-2A",  time: "08:14", dur: "6m", el: "72°", res: "10m",   risk: "HIGH"     },
  { sat: "LANDSAT-9",    time: "10:47", dur: "4m", el: "51°", res: "30m",   risk: "MEDIUM"   },
  { sat: "PLEIADES-1A",  time: "13:22", dur: "3m", el: "38°", res: "0.5m",  risk: "CRITICAL" },
  { sat: "SPOT-7",       time: "15:05", dur: "5m", el: "63°", res: "1.5m",  risk: "HIGH"     },
];
const covH = new Set([8, 10, 13, 15, 18]);
const hours = Array.from({ length: 24 }, (_, i) => i);

export default function Satellite() {
  const [apiKey] = useApiKey();
  const [zone, setZone] = useState("");
  const [ran, setRan] = useState(false);
  const [tick, setTick] = useState(0);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  useEffect(() => { if (!ran) return; const t = setInterval(() => setTick(x => x + 1), 50); return () => clearInterval(t); }, [ran]);

  async function generateBrief() {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey, `You are a satellite intelligence analyst. Given the area of interest "${zone || "unspecified coordinates"}", write a brief 3-4 sentence satellite intelligence brief covering: optimal pass windows for today, recommended satellites for the mission type (optical/radar/SAR), key ground features to monitor, and any denial/deception considerations for the area.`);
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  const toR = a => a * Math.PI / 180;
  const a1 = (tick * 0.8) % 360;
  const a2 = (tick * 0.5 + 120) % 360;
  const ox1 = 100 + 55 * Math.cos(toR(a1));
  const oy1 = 70 + 22 * Math.sin(toR(a1));
  const ox2 = 100 + 45 * Math.cos(toR(a2 + 90));
  const oy2 = 70 + 35 * Math.sin(toR(a2 + 90));

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>🛰️ Satellite Pass Planner</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>Overflight windows for reconnaissance satellites. <MockBadge /></p>

      <Card>
        <Input label="📍 Area of Interest" value={zone} onChange={setZone} placeholder="e.g. 44.4°N 8.9°E" />
        <Btn onClick={() => setRan(true)}>Calculate</Btn>
      </Card>

      {ran && (
        <>
          <Card>
            <ST icon="🌐" label="Orbit Visualization" color="#4db8ff" />
            <svg viewBox="0 0 200 140" style={{ width: "100%", maxWidth: 260, margin: "0 auto", display: "block", background: "#050d1a", borderRadius: 8 }}>
              {[[20,20],[180,15],[50,80],[170,90],[90,10],[140,50]].map(([sx,sy],i) => <circle key={i} cx={sx} cy={sy} r={1} fill="#fff" opacity={0.4}/>)}
              <circle cx={100} cy={70} r={28} fill="#0d2040" stroke="#1a3a6a" strokeWidth="1.5" />
              <ellipse cx={92} cy={62} rx={10} ry={7} fill="#1a3a6a" opacity="0.8" />
              <ellipse cx={112} cy={68} rx={8} ry={10} fill="#1a3a6a" opacity="0.8" />
              <ellipse cx={100} cy={70} rx={55} ry={22} fill="none" stroke="#4db8ff" strokeWidth="0.5" strokeDasharray="3" opacity="0.4" />
              <ellipse cx={100} cy={70} rx={45} ry={35} fill="none" stroke="#ffd700" strokeWidth="0.5" strokeDasharray="3" opacity="0.4" transform="rotate(90,100,70)" />
              <circle cx={ox1} cy={oy1} r={3} fill="#4db8ff" />
              <circle cx={ox2} cy={oy2} r={3} fill="#ffd700" />
              <text x={100} y={74} textAnchor="middle" fill="#00ff9d" fontSize="7" fontWeight="bold">TARGET</text>
            </svg>
          </Card>

          <Card>
            <ST icon="⏱️" label="24h Coverage Heatmap" color="#4db8ff" />
            <div style={{ display: "flex", gap: 1, marginBottom: 4 }}>
              {hours.map(h => <div key={h} style={{ flex: 1, height: 24, background: covH.has(h) ? "#ff4d4d" : "#0d1626", borderRadius: 2, border: "1px solid #1f2d45" }} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#9ca3af", fontSize: 9 }}>
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
            </div>
          </Card>

          {apiKey && (
            <Card>
              <Btn onClick={generateBrief} disabled={aiLoading} color="#1f2d45">
                {aiLoading ? "⏳ Generating..." : "🤖 AI Intelligence Brief"}
              </Btn>
              {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
              {aiResult && (
                <div style={{ background: "#0d1626", borderRadius: 6, padding: 12, marginTop: 10, borderLeft: "3px solid #4db8ff" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <LiveBadge />
                    <span style={{ color: "#9ca3af", fontSize: 11 }}>AI SATELLITE INTEL BRIEF</span>
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.6 }}>{aiResult}</div>
                </div>
              )}
            </Card>
          )}

          <Card>
            <ST icon="🗓️" label="Pass Schedule" color="#4db8ff" />
            {passes.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d1626", borderRadius: 6, padding: "8px 12px", marginBottom: 5, borderLeft: `3px solid ${RC[p.risk]}` }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{p.sat}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>{p.time} · {p.dur} · El: {p.el}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <BADGE text={p.risk} color={p.risk === "CRITICAL" || p.risk === "HIGH" ? "red" : "yellow"} />
                  <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 2 }}>Res: {p.res}</div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
