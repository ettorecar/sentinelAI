import { useState, useEffect } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, StatBar, LiveBadge } from "../components/shared";
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

const PASSES = [
  { sat: "SENTINEL-2A", time: "08:14", dur: "6m", el: "72°", res: "10m",  risk: "HIGH",     type: "Optical/MSI" },
  { sat: "LANDSAT-9",   time: "10:47", dur: "4m", el: "51°", res: "30m",  risk: "MEDIUM",   type: "Optical/TIR" },
  { sat: "PLEIADES-1A", time: "13:22", dur: "3m", el: "38°", res: "0.5m", risk: "CRITICAL", type: "Optical/VHR" },
  { sat: "SPOT-7",      time: "15:05", dur: "5m", el: "63°", res: "1.5m", risk: "HIGH",     type: "Optical/HR"  },
];
const COV_HOURS = new Set([8, 10, 13, 15, 18]);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function PassRow({ p }) {
  const [hovered, setHovered] = useState(false);
  const color = RC[p.risk] || "#555";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 7,
        padding: "10px 14px",
        marginBottom: 6,
        borderLeft: `3px solid ${color}`,
        border: `1px solid ${hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${color}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, color: hovered ? "#ffffff" : "#e2e8f0", fontSize: 13 }}>{p.sat}</div>
        <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>
          {p.time} · {p.dur} · El: {p.el} · {p.type}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <BADGE text={p.risk} color={p.risk === "CRITICAL" || p.risk === "HIGH" ? "red" : "yellow"} />
        <div style={{ color: "#4a5568", fontSize: 10, marginTop: 4, fontFamily: "monospace" }}>Res: {p.res}</div>
      </div>
    </div>
  );
}

export default function Satellite() {
  const [apiKey] = useApiKey();
  const [zone, setZone] = useState("");
  const [ran, setRan] = useState(false);
  const [tick, setTick] = useState(0);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (!ran) return;
    const t = setInterval(() => setTick(x => x + 1), 50);
    return () => clearInterval(t);
  }, [ran]);

  async function generateBrief() {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey,
        `You are a satellite intelligence analyst. Given the area of interest "${zone || "unspecified coordinates"}", write a brief 3-4 sentence satellite intelligence brief covering: optimal pass windows for today, recommended satellites for the mission type (optical/radar/SAR), key ground features to monitor, and any denial/deception considerations for the area.`
      );
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

  const criticalCount = PASSES.filter(p => p.risk === "CRITICAL").length;
  const nextPass = PASSES[0].time;

  return (
    <div>
      <PageHeader icon="🛰️" title="Satellite Pass Planner" sub="Overflight windows and coverage analysis for reconnaissance satellites." accent="#4db8ff" mock />

      <Card>
        <Input label="📍 Area of Interest" value={zone} onChange={setZone} placeholder="e.g. 44.4°N 8.9°E · Coordinates or location name" />
        <Btn onClick={() => setRan(true)} color="#4db8ff">Calculate Pass Windows</Btn>
      </Card>

      {ran && (
        <>
          <StatBar stats={[
            { label: "Passes Today",   value: String(PASSES.length), color: "#4db8ff" },
            { label: "Critical",       value: String(criticalCount), color: "#ff4d4d" },
            { label: "Next Window",    value: nextPass,              color: "#00ff9d" },
            { label: "Coverage Hours", value: String(COV_HOURS.size), color: "#ffd700" },
          ]} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {/* Orbit viz */}
            <Card>
              <ST icon="🌐" label="Orbit Visualization" color="#4db8ff" sub="Live orbital tracking" />
              <svg viewBox="0 0 200 140" style={{ width: "100%", background: "#050d1a", borderRadius: 8 }}>
                {/* Stars */}
                {[[20,20],[180,15],[50,80],[170,90],[90,10],[140,50],[30,110],[160,30]].map(([sx,sy],i) =>
                  <circle key={i} cx={sx} cy={sy} r={1} fill="#fff" opacity={0.3}/>
                )}
                {/* Orbit paths */}
                <ellipse cx={100} cy={70} rx={55} ry={22} fill="none" stroke="#4db8ff" strokeWidth="0.5" strokeDasharray="3" opacity="0.35" />
                <ellipse cx={100} cy={70} rx={45} ry={35} fill="none" stroke="#ffd700" strokeWidth="0.5" strokeDasharray="3" opacity="0.35" transform="rotate(90,100,70)" />
                {/* Earth */}
                <circle cx={100} cy={70} r={28} fill="#0d2040" stroke="#1a3a6a" strokeWidth="1.5" />
                <ellipse cx={92} cy={62} rx={10} ry={7} fill="#1a3a6a" opacity="0.8" />
                <ellipse cx={112} cy={68} rx={8} ry={10} fill="#1a3a6a" opacity="0.8" />
                {/* Satellites */}
                <circle cx={ox1} cy={oy1} r={3} fill="#4db8ff" />
                <circle cx={ox2} cy={oy2} r={3} fill="#ffd700" />
                {/* Target */}
                <text x={100} y={74} textAnchor="middle" fill="#00ff9d" fontSize="6" fontWeight="bold">TARGET</text>
                {/* Legend */}
                <circle cx={18} cy={132} r={3} fill="#4db8ff" />
                <text x={25} y={136} fill="#6b7a8d" fontSize="7">Optical</text>
                <circle cx={68} cy={132} r={3} fill="#ffd700" />
                <text x={75} y={136} fill="#6b7a8d" fontSize="7">Thermal</text>
              </svg>
            </Card>

            {/* Coverage heatmap */}
            <Card>
              <ST icon="⏱️" label="24h Coverage Heatmap" color="#4db8ff" sub="Active pass windows highlighted" />
              <div style={{ display: "flex", gap: 1, marginBottom: 6 }}>
                {HOURS.map(h => (
                  <div key={h} style={{ flex: 1, position: "relative" }}>
                    <div style={{
                      height: 28,
                      background: COV_HOURS.has(h) ? "#ff4d4d" : "#0d1626",
                      borderRadius: 2,
                      border: `1px solid ${COV_HOURS.has(h) ? "#ff4d4d44" : "#1f2d45"}`,
                      opacity: COV_HOURS.has(h) ? 0.9 : 0.7,
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#4a5568", fontSize: 9, fontFamily: "monospace" }}>
                {["00:00","06:00","12:00","18:00","24:00"].map(t => <span key={t}>{t}</span>)}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 10, height: 10, background: "#ff4d4d", borderRadius: 2 }} />
                  <span style={{ color: "#9ca3af", fontSize: 10 }}>Pass Window</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 10, height: 10, background: "#0d1626", borderRadius: 2, border: "1px solid #1f2d45" }} />
                  <span style={{ color: "#9ca3af", fontSize: 10 }}>No Coverage</span>
                </div>
              </div>
            </Card>
          </div>

          {/* AI Brief */}
          {apiKey && (
            <Card>
              <ST icon="🤖" label="AI Intelligence Brief" color="#4db8ff" />
              <Btn onClick={generateBrief} disabled={aiLoading} color="#4db8ff" size="sm">
                {aiLoading ? "⏳ Generating..." : "🛰️ Generate Satellite Intel Brief"}
              </Btn>
              {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
              {aiResult && (
                <div style={{ background: "#051220", border: "1px solid #4db8ff33", borderLeft: "3px solid #4db8ff", borderRadius: 6, padding: 12, marginTop: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <LiveBadge />
                    <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>
                      AI SATELLITE INTEL BRIEF · {zone || "AOI"}
                    </span>
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7 }}>{aiResult}</div>
                </div>
              )}
            </Card>
          )}

          {/* Pass schedule */}
          <Card>
            <ST icon="🗓️" label="Pass Schedule" color="#4db8ff" sub="Sorted by window time · today's coverage" />
            {PASSES.map((p, i) => <PassRow key={i} p={p} />)}
          </Card>
        </>
      )}
    </div>
  );
}
