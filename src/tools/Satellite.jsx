import { useState, useEffect } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, StatBar, LiveBadge, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { RC } from "../constants";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content.map(b => b.text || "").join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

const PASSES = [
  { sat: "SENTINEL-2A", time: "08:14", dur: "6m", el: "72°", res: "10m",  risk: "HIGH",     type: "Optical/MSI" },
  { sat: "LANDSAT-9",   time: "10:47", dur: "4m", el: "51°", res: "30m",  risk: "MEDIUM",   type: "Optical/TIR" },
  { sat: "PLEIADES-1A", time: "13:22", dur: "3m", el: "38°", res: "0.5m", risk: "CRITICAL", type: "Optical/VHR" },
  { sat: "SPOT-7",      time: "15:05", dur: "5m", el: "63°", res: "1.5m", risk: "HIGH",     type: "Optical/HR"  },
];
const COV_HOURS = new Set([8, 10, 13, 15, 18]);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const WORLD_POLYS = [
  "10,17 66,17 88,8 133,25 144,72 111,83 66,83 22,72 10,39",
  "111,85 159,94 155,139 128,161 111,122",
  "189,22 233,22 244,33 233,50 222,61 194,61 189,44",
  "178,59 264,59 264,111 233,136 211,136 178,100",
  "229,8 400,8 400,89 311,89 267,83 244,50 229,44",
  "322,111 370,111 370,149 322,149",
  "116,7 187,7 187,33 116,33",
];

const RISK_COLOR = { CRITICAL: "#ff4d4d", HIGH: "#ff9d00", MEDIUM: "#ffd700", LOW: "#00ff9d" };

const tabStyle = (active, color = "#4db8ff") => ({
  padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400,
  background: active ? color + "22" : "transparent",
  color: active ? color : "#4a5568",
  border: `1px solid ${active ? color + "44" : "transparent"}`,
  transition: "all 0.15s",
});

function passScore(p) {
  const resVal = { "0.5m": 100, "1.5m": 85, "10m": 60, "30m": 30 }[p.res] || 50;
  const elVal = (parseInt(p.el) / 90) * 100;
  const durVal = Math.min(100, parseInt(p.dur) * 14);
  return Math.round(resVal * 0.5 + elVal * 0.3 + durVal * 0.2);
}

function PassScoreChart({ passes }) {
  const W = 360, H = 130, PAD = { top: 10, right: 44, bottom: 22, left: 96 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const barH = Math.floor(innerH / passes.length) - 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        {passes.map((p, i) => {
          const col = RISK_COLOR[p.risk] || "#4db8ff";
          return (
            <linearGradient key={i} id={`sat-grd-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={col} stopOpacity="0.7" />
              <stop offset="100%" stopColor={col} stopOpacity="0.15" />
            </linearGradient>
          );
        })}
      </defs>
      {passes.map((p, i) => {
        const score = passScore(p);
        const barW = (score / 100) * innerW;
        const y = PAD.top + i * (barH + 6);
        const col = RISK_COLOR[p.risk] || "#4db8ff";
        const shortName = p.sat.replace("SENTINEL", "SEN").replace("LANDSAT", "LS")
          .replace("PLEIADES", "PL");
        return (
          <g key={i}>
            <text x={PAD.left - 5} y={y + barH / 2 + 4} textAnchor="end" fill="#9ca3af" fontSize="8.5">{shortName}</text>
            <rect x={PAD.left} y={y} width={innerW} height={barH} fill="#0a1830" rx="2" />
            <rect x={PAD.left} y={y} width={barW} height={barH} fill={`url(#sat-grd-${i})`} rx="2" />
            <rect x={PAD.left + Math.max(0, barW - 2)} y={y} width={2} height={barH} fill={col} rx="1" />
            <text x={PAD.left + barW + 5} y={y + barH / 2 + 4} fill={col} fontSize="9" fontWeight="700">{score}</text>
          </g>
        );
      })}
      <text x={PAD.left + innerW / 2} y={H - 3} textAnchor="middle" fill="#4a5568" fontSize="7">
        Intel Value Score (0–100) · weighted: resolution 50% · elevation 30% · duration 20%
      </text>
    </svg>
  );
}

function GroundTrackMap({ tick }) {
  const W = 400, H = 200;
  const toX = lon => ((lon + 180) / 360) * W;
  const toY = lat => ((90 - lat) / 180) * H;
  const INC = 51.6;
  const PERIOD = 22.5;
  function buildTrack(phaseOffset) {
    const pts = [];
    for (let i = 0; i <= 400; i++) {
      const lon = -180 + i * 0.9;
      const lat = INC * Math.sin(((lon + phaseOffset) / PERIOD) * 2 * Math.PI);
      pts.push(`${toX(lon).toFixed(1)},${toY(lat).toFixed(1)}`);
    }
    return pts.join(" ");
  }
  const tracks = [
    { pts: buildTrack(PERIOD * 2),  opacity: 0.2, width: 0.6 },
    { pts: buildTrack(PERIOD),      opacity: 0.4, width: 0.8 },
    { pts: buildTrack(0),           opacity: 0.9, width: 1.4 },
    { pts: buildTrack(-PERIOD),     opacity: 0.4, width: 0.8 },
    { pts: buildTrack(-PERIOD * 2), opacity: 0.2, width: 0.6 },
  ];
  const phase = (tick * 0.0015) % 1;
  const satLon = -180 + phase * 360;
  const satLat = INC * Math.sin((satLon / PERIOD) * 2 * Math.PI);
  const satX = toX(satLon);
  const satY = toY(satLat);
  const now = new Date();
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  const sunLon = (utcH - 12) * 15;
  const nightCenterLon = sunLon + 180;
  const nightX = toX(((nightCenterLon + 180) % 360) - 180);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", background: "#050d1a", borderRadius: 8, display: "block" }}>
      <defs>
        <radialGradient id="night-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00001a" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#00001a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sat-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4db8ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4db8ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[-60, -30, 0, 30, 60].map(lat => (
        <line key={`lat${lat}`} x1={0} y1={toY(lat)} x2={W} y2={toY(lat)} stroke="#0a1830" strokeWidth="0.5" />
      ))}
      {[-120, -60, 0, 60, 120].map(lon => (
        <line key={`lon${lon}`} x1={toX(lon)} y1={0} x2={toX(lon)} y2={H} stroke="#0a1830" strokeWidth="0.5" />
      ))}
      {WORLD_POLYS.map((pts, i) => (
        <polygon key={i} points={pts} fill="#0e2040" stroke="#1a3a6a" strokeWidth="0.7" />
      ))}
      <ellipse cx={nightX} cy={H / 2} rx={W / 2} ry={H / 2} fill="url(#night-grad)" />
      {tracks.map((t, i) => (
        <polyline key={i} points={t.pts} fill="none" stroke="#4db8ff" strokeWidth={t.width} opacity={t.opacity} />
      ))}
      <ellipse cx={satX} cy={satY} rx={14} ry={14} fill="url(#sat-glow)" />
      <circle cx={satX} cy={satY} r="4" fill="#4db8ff" />
      <circle cx={satX} cy={satY} r="7" fill="none" stroke="#4db8ff" strokeWidth="1" opacity="0.5" />
      <text x={4} y={toY(0) + 4} fill="#1a3a6a" fontSize="6">EQ</text>
      <text x={toX(0) + 2} y={H - 3} fill="#1a3a6a" fontSize="6">0°</text>
    </svg>
  );
}

function NextPassCountdown({ passes }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    function compute() {
      const now = new Date();
      const [h, m] = passes[0].time.split(":").map(Number);
      const target = new Date(now);
      target.setUTCHours(h, m, 0, 0);
      if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
      setSecs(Math.max(0, Math.floor((target - now) / 1000)));
    }
    compute();
    const t = setInterval(compute, 1000);
    return () => clearInterval(t);
  }, [passes]);
  const hh = Math.floor(secs / 3600);
  const mm = Math.floor((secs % 3600) / 60);
  const ss = secs % 60;
  const pad = n => String(n).padStart(2, "0");
  const urgent = secs < 600;
  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>NEXT PASS COUNTDOWN</div>
      <div style={{
        fontFamily: "monospace", fontSize: 26, fontWeight: 900, letterSpacing: 4,
        color: urgent ? "#ff4d4d" : "#4db8ff",
        textShadow: urgent ? "0 0 12px #ff4d4d55" : "0 0 12px #4db8ff55",
      }}>
        {pad(hh)}:{pad(mm)}:{pad(ss)}
      </div>
      <div style={{ color: "#4a5568", fontSize: 10, marginTop: 4 }}>
        {passes[0].sat} · {passes[0].time} UTC · El {passes[0].el}
      </div>
      {urgent && <div style={{ color: "#ff4d4d", fontSize: 10, marginTop: 4, fontWeight: 700 }}>⚠ IMMINENT PASS</div>}
    </div>
  );
}

function PassRow({ p }) {
  const [hovered, setHovered] = useState(false);
  const color = RC[p.risk] || "#555";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0f1a2e" : "#0d1626", borderRadius: 7, padding: "10px 14px", marginBottom: 6,
        border: `1px solid ${hovered ? "#2a3f5f" : "#1f2d45"}`, borderLeft: `3px solid ${color}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, color: hovered ? "#ffffff" : "#e2e8f0", fontSize: 13 }}>{p.sat}</div>
        <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>{p.time} · {p.dur} · El: {p.el} · {p.type}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <BADGE text={p.risk} color={p.risk === "CRITICAL" || p.risk === "HIGH" ? "red" : "yellow"} />
        <div style={{ color: "#4a5568", fontSize: 10, marginTop: 4, fontFamily: "monospace" }}>Res: {p.res}</div>
      </div>
    </div>
  );
}

function AiBriefPanel({ result, zone }) {
  const { brief, optimal_windows, sensor_recommendation, denial_indicators, key_features } = result;
  return (
    <div>
      <div style={{ background: "#051220", border: "1px solid #4db8ff33", borderLeft: "3px solid #4db8ff", borderRadius: 6, padding: 14, marginBottom: 12 }}>
        <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>INTELLIGENCE BRIEF · {zone || "AOI"}</div>
        <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7 }}>{brief}</div>
      </div>

      {optimal_windows?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>OPTIMAL COLLECTION WINDOWS</div>
          {optimal_windows.map((w, i) => (
            <div key={i} style={{
              background: "#0a1830", border: "1px solid #1f2d45", borderRadius: 6, padding: "8px 12px", marginBottom: 6,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <span style={{ fontFamily: "monospace", color: "#4db8ff", fontSize: 12, fontWeight: 700 }}>{w.time}</span>
                <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: 10 }}>{w.satellite}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#00ff9d", fontSize: 11, fontWeight: 700 }}>Score: {w.score}/10</div>
                <div style={{ color: "#4a5568", fontSize: 10 }}>{w.reason}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sensor_recommendation && (
        <div style={{ background: "#0a1830", borderRadius: 8, padding: 12, marginBottom: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>PRIMARY SENSOR</div>
            <div style={{ color: "#ffd700", fontWeight: 700, fontSize: 13 }}>{sensor_recommendation.primary}</div>
          </div>
          <div>
            <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>SECONDARY</div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>{sensor_recommendation.secondary}</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>RATIONALE</div>
            <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{sensor_recommendation.rationale}</div>
          </div>
        </div>
      )}

      {denial_indicators?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>DENIAL & DECEPTION INDICATORS</div>
          {denial_indicators.map((d, i) => (
            <div key={i} style={{ color: "#ff9d00", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #1f2d4520" }}>⚠ {d}</div>
          ))}
        </div>
      )}

      {key_features?.length > 0 && (
        <div>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>KEY GROUND FEATURES TO MONITOR</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {key_features.map((f, i) => (
              <span key={i} style={{ background: "#0a1830", border: "1px solid #1f2d45", borderRadius: 4, padding: "3px 8px", color: "#9ca3af", fontSize: 11 }}>{f}</span>
            ))}
          </div>
        </div>
      )}
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
  const [tab, setTab] = useState("track");
  const { stamp } = useLastAnalysis("satellite");

  useEffect(() => {
    if (!ran) return;
    const t = setInterval(() => setTick(x => x + 1), 50);
    return () => clearInterval(t);
  }, [ran]);

  async function generateBrief() {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const result = await callClaude(apiKey,
        `You are a satellite intelligence analyst. Given the area of interest "${zone || "unspecified coordinates"}", provide a structured satellite intelligence assessment.
Return ONLY JSON (no markdown):
{
  "brief": "3-4 sentence satellite intel brief covering optimal passes, recommended sensors, key features, and deception risks",
  "optimal_windows": [{"time": "HH:MM UTC", "satellite": "name", "score": 8, "reason": "brief reason"}],
  "sensor_recommendation": {"primary": "sensor name", "secondary": "sensor name", "rationale": "why these sensors for this AOI"},
  "denial_indicators": ["indicator 1", "indicator 2"],
  "key_features": ["feature1", "feature2", "feature3", "feature4", "feature5"]
}`
      );
      setAiResult(result); setTab("brief");
      stamp();
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  const criticalCount = PASSES.filter(p => p.risk === "CRITICAL").length;
  const nextPass = PASSES[0].time;

  const TABS = [
    { id: "track",   label: "Ground Track" },
    { id: "passes",  label: "Pass Schedule" },
    { id: "profile", label: "Sensor Profile" },
    ...(aiResult ? [{ id: "brief", label: "AI Brief" }] : []),
  ];

  return (
    <div>
      <PageHeader icon="🛰️" title="Satellite Pass Planner" sub="Overflight windows and coverage analysis for reconnaissance satellites." accent="#4db8ff" dataMode={apiKey ? "hybrid" : "mock"} />

      <Card>
        <Input label="📍 Area of Interest" value={zone} onChange={setZone} placeholder="e.g. 44.4°N 8.9°E · Coordinates or location name" />
        <Btn onClick={() => { setRan(true); setTab("track"); }} color="#4db8ff">Calculate Pass Windows</Btn>
      </Card>

      {ran && (
        <>
          <StatBar stats={[
            { label: "Passes Today",   value: String(PASSES.length), color: "#4db8ff" },
            { label: "Critical",       value: String(criticalCount), color: "#ff4d4d" },
            { label: "Next Window",    value: nextPass,              color: "#00ff9d" },
            { label: "Coverage Hours", value: String(COV_HOURS.size), color: "#ffd700" },
          ]} />

          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>
            ))}
            {apiKey && (
              <button
                onClick={generateBrief}
                disabled={aiLoading}
                style={{ ...tabStyle(false, "#ffd700"), marginLeft: "auto", opacity: aiLoading ? 0.6 : 1 }}
              >
                {aiLoading ? "⏳ Analyzing..." : "🛰️ AI Brief"}
              </button>
            )}
            <LastAnalysisTag toolId="satellite" />
          </div>

          {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginBottom: 8 }}>{aiError}</div>}

          {tab === "track" && (
            <>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <ST icon="🌍" label="Ground Track" color="#4db8ff" sub="Sinusoidal LEO trace · animated position · day/night terminator" />
                  <NextPassCountdown passes={PASSES} />
                </div>
                <GroundTrackMap tick={tick} />
                <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 20, height: 2, background: "#4db8ff", opacity: 0.9 }} />
                    <span style={{ color: "#4a5568", fontSize: 10 }}>Primary track</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4db8ff" }} />
                    <span style={{ color: "#4a5568", fontSize: 10 }}>Current position</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 12, height: 8, background: "#00001a", border: "1px solid #1a3a6a", borderRadius: 2, opacity: 0.8 }} />
                    <span style={{ color: "#4a5568", fontSize: 10 }}>Night side</span>
                  </div>
                </div>
              </Card>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 12, marginBottom: 12 }}>
                <Card>
                  <ST icon="🌐" label="Orbit Visualization" color="#4db8ff" sub="Live orbital tracking" />
                  <svg viewBox="0 0 200 140" style={{ width: "100%", background: "#050d1a", borderRadius: 8 }}>
                    {[[20,20],[180,15],[50,80],[170,90],[90,10],[140,50],[30,110],[160,30]].map(([sx,sy],i) =>
                      <circle key={i} cx={sx} cy={sy} r={1} fill="#fff" opacity={0.3}/>
                    )}
                    <ellipse cx={100} cy={70} rx={55} ry={22} fill="none" stroke="#4db8ff" strokeWidth="0.5" strokeDasharray="3" opacity="0.35" />
                    <ellipse cx={100} cy={70} rx={45} ry={35} fill="none" stroke="#ffd700" strokeWidth="0.5" strokeDasharray="3" opacity="0.35" transform="rotate(90,100,70)" />
                    <circle cx={100} cy={70} r={28} fill="#0d2040" stroke="#1a3a6a" strokeWidth="1.5" />
                    <ellipse cx={92} cy={62} rx={10} ry={7} fill="#1a3a6a" opacity="0.8" />
                    <ellipse cx={112} cy={68} rx={8} ry={10} fill="#1a3a6a" opacity="0.8" />
                    <circle cx={100 + 55 * Math.cos((tick * 0.8 % 360) * Math.PI / 180)} cy={70 + 22 * Math.sin((tick * 0.8 % 360) * Math.PI / 180)} r={3} fill="#4db8ff" />
                    <circle cx={100 + 45 * Math.cos(((tick * 0.5 + 120) % 360 + 90) * Math.PI / 180)} cy={70 + 35 * Math.sin(((tick * 0.5 + 120) % 360 + 90) * Math.PI / 180)} r={3} fill="#ffd700" />
                    <text x={100} y={74} textAnchor="middle" fill="#00ff9d" fontSize="6" fontWeight="bold">TARGET</text>
                    <circle cx={18} cy={132} r={3} fill="#4db8ff" />
                    <text x={25} y={136} fill="#6b7a8d" fontSize="7">Optical</text>
                    <circle cx={68} cy={132} r={3} fill="#ffd700" />
                    <text x={75} y={136} fill="#6b7a8d" fontSize="7">Thermal</text>
                  </svg>
                </Card>

                <Card>
                  <ST icon="⏱️" label="24h Coverage Heatmap" color="#4db8ff" sub="Active pass windows highlighted" />
                  <div style={{ display: "flex", gap: 1, marginBottom: 6 }}>
                    {HOURS.map(h => (
                      <div key={h} style={{ flex: 1 }}>
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
            </>
          )}

          {tab === "passes" && (
            <Card>
              <ST icon="🗓️" label="Pass Schedule" color="#4db8ff" sub="Sorted by window time · today's coverage" />
              {PASSES.map((p, i) => <PassRow key={i} p={p} />)}
            </Card>
          )}

          {tab === "profile" && (
            <Card>
              <ST icon="📡" label="Sensor Profile & Intel Value" color="#4db8ff" sub="Composite score: resolution 50% · elevation 30% · duration 20%" />
              <PassScoreChart passes={PASSES} />
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr 0.6fr", gap: 8, padding: "5px 0", marginBottom: 4, borderBottom: "1px solid #1f2d45" }}>
                  {["Satellite","Type","Elevation","Resolution","Duration","Score"].map(h => (
                    <span key={h} style={{ color: "#4a5568", fontSize: 9, letterSpacing: 0.5 }}>{h}</span>
                  ))}
                </div>
                {PASSES.map((p, i) => {
                  const col = RISK_COLOR[p.risk] || "#4db8ff";
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr 0.6fr", gap: 8, padding: "8px 0", borderBottom: "1px solid #0d1626", alignItems: "center" }}>
                      <span style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 600 }}>{p.sat}</span>
                      <span style={{ color: "#4a5568", fontSize: 10 }}>{p.type}</span>
                      <span style={{ color: "#4a5568", fontSize: 10 }}>{p.el}</span>
                      <span style={{ color: "#4a5568", fontSize: 10 }}>{p.res}</span>
                      <span style={{ color: "#4a5568", fontSize: 10 }}>{p.dur}</span>
                      <span style={{ color: col, fontSize: 11, fontWeight: 700 }}>{passScore(p)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {tab === "brief" && aiResult && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <LiveBadge />
                <ST icon="🤖" label="AI Satellite Intelligence Brief" color="#4db8ff" />
                <ExportBtn data={aiResult} filename="sentinel-satellite" />
              </div>
              <AiBriefPanel result={aiResult} zone={zone} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
