import { useState, useEffect } from "react";
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

const VESSELS = [
  { mmsi: "247123456", name: "ADRIATICA SUN",  flag: "🇮🇹", anomaly: "AIS blackout 6h",           risk: "HIGH",     type: "Cargo",     speed: "0.0 kn",  course: "N/A",  mx: 298, my: 112 },
  { mmsi: "212987654", name: "AEGEAN STAR",    flag: "🇬🇷", anomaly: "Unusual anchorage",          risk: "MEDIUM",   type: "Tanker",    speed: "0.4 kn",  course: "217°", mx: 390, my: 178 },
  { mmsi: "538001234", name: "PACIFIC WOLF",   flag: "🇲🇭", anomaly: "Speed anomaly +8 kn",        risk: "MEDIUM",   type: "Bulk",      speed: "19.2 kn", course: "084°", mx: 320, my: 118 },
  { mmsi: "636091234", name: "LIBERIA MOON",   flag: "🇱🇷", anomaly: "None",                       risk: "LOW",      type: "Container", speed: "14.1 kn", course: "262°", mx: 295, my: 200 },
  { mmsi: "311000450", name: "ATLAS PRIME",    flag: "🇧🇸", anomaly: "Dark ship rendezvous",       risk: "HIGH",     type: "Tanker",    speed: "1.1 kn",  course: "008°", mx: 168, my: 185 },
  { mmsi: "477123789", name: "ORIENT TIGER",   flag: "🇨🇳", anomaly: "Identity spoofing suspected", risk: "HIGH",    type: "Tanker",    speed: "8.2 kn",  course: "135°", mx: 435, my: 148 },
  { mmsi: "319001234", name: "CAYMAN GHOST",   flag: "🇰🇾", anomaly: "AIS blackout 18h",           risk: "HIGH",     type: "Cargo",     speed: "0.0 kn",  course: "N/A",  mx: 200, my: 162 },
  { mmsi: "255801234", name: "NOVA MERCATOR",  flag: "🇵🇹", anomaly: "Unusual speed reduction",    risk: "LOW",      type: "Container", speed: "9.1 kn",  course: "022°", mx: 280, my: 195 },
  { mmsi: "229034567", name: "MARE NERO",      flag: "🇲🇹", anomaly: "Loitering near chokepoint",  risk: "MEDIUM",   type: "Tanker",    speed: "2.3 kn",  course: "180°", mx: 355, my: 148 },
  { mmsi: "441012345", name: "SEOUL DAWN",     flag: "🇰🇷", anomaly: "None",                       risk: "LOW",      type: "Container", speed: "18.7 kn", course: "280°", mx: 462, my: 168 },
  { mmsi: "355012345", name: "PANAMA GHOST",   flag: "🇵🇦", anomaly: "Shadow fleet suspected",     risk: "HIGH",     type: "Tanker",    speed: "11.4 kn", course: "310°", mx: 148, my: 145 },
  { mmsi: "205012345", name: "BALTIC EAGLE",   flag: "🇧🇪", anomaly: "Possible GNSS spoofing",     risk: "MEDIUM",   type: "Bulk",      speed: "5.6 kn",  course: "045°", mx: 332, my: 100 },
];

const rc = r => r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";
const riskBadge = r => r === "HIGH" ? "red" : r === "MEDIUM" ? "yellow" : "green";

function VesselCard({ v, selected, onClick }) {
  const [hovered, setHovered] = useState(false);
  const accent = rc(v.risk);
  const active = selected || hovered;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? "#141e30" : hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 8,
        padding: "11px 14px",
        cursor: "pointer",
        border: `1px solid ${selected ? accent + "55" : hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${accent}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: selected ? "#ffffff" : "#e2e8f0", fontSize: 13, marginBottom: 2 }}>
          {v.flag} {v.name}
        </div>
        <div style={{ color: "#9ca3af", fontSize: 11 }}>{v.type} · {v.anomaly}</div>
        <div style={{ color: "#4a5568", fontSize: 10, marginTop: 2, fontFamily: "monospace" }}>
          {v.mmsi} · {v.speed}
        </div>
      </div>
      <BADGE text={v.risk} color={riskBadge(v.risk)} />
    </div>
  );
}

export default function Maritime() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setPulse(x => !x), 900);
    return () => clearInterval(t);
  }, []);

  function selectVessel(v) {
    setSel(sel?.mmsi === v.mmsi ? null : v);
    setAiResult(null);
    setAiError("");
  }

  async function analyzeVessel(v) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey,
        `You are a maritime intelligence analyst. Analyze this AIS anomaly and provide an intelligence assessment in 3-4 sentences covering: likely explanation, risk level, and recommended action. Vessel: ${v.name} (MMSI: ${v.mmsi}, Flag: ${v.flag?.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")}, Type: ${v.type}). Anomaly: ${v.anomaly}. Speed: ${v.speed}, Course: ${v.course}. Risk: ${v.risk}.`
      );
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  const highCount  = VESSELS.filter(v => v.risk === "HIGH").length;
  const anomCount  = VESSELS.filter(v => v.anomaly !== "None").length;

  return (
    <div>
      <PageHeader
        icon="🌊"
        title="Maritime Anomaly Tracker"
        sub="AIS anomaly detection and vessel intelligence — Mediterranean theatre."
        accent="#00cfff"
        dataMode={apiKey ? "hybrid" : "mock"}
        classification="SECRET"
      />

      <StatBar stats={[
        { label: "Vessels Tracked", value: String(VESSELS.length), color: "#4db8ff" },
        { label: "High Risk",       value: String(highCount),      color: "#ff4d4d" },
        { label: "AIS Anomalies",   value: String(anomCount),      color: "#ffd700" },
        { label: "Theatre",         value: "MED",                  color: "#00cfff" },
      ]} />

      {/* Map */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "10px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, color: "#4db8ff", fontSize: 13 }}>🗺️ Mediterranean Theatre</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: pulse ? "#00cfff" : "#00cfff44", transition: "background 0.4s" }} />
            <span style={{ color: "#4a5568", fontSize: 10 }}>LIVE AIS</span>
          </div>
        </div>
        <svg viewBox="0 0 520 280" style={{ width: "100%", background: "#07101f", display: "block" }}>
          {/* Sea gradient base */}
          <rect width="520" height="280" fill="#07101f" />
          {/* Grid lines */}
          {[1,2,3,4].map(i => (
            <line key={`h${i}`} x1={0} y1={i*56} x2={520} y2={i*56} stroke="#0d1a2e" strokeWidth="1" />
          ))}
          {[1,2,3,4,5,6].map(i => (
            <line key={`v${i}`} x1={i*74} y1={0} x2={i*74} y2={280} stroke="#0d1a2e" strokeWidth="1" />
          ))}
          {/* Landmass — European/African Med coast */}
          <path d="M 60 80 Q 100 60 160 70 Q 200 65 250 75 Q 310 70 370 80 Q 420 85 460 100 Q 480 120 470 150 Q 450 170 420 175 Q 390 180 360 170 Q 330 178 300 195 Q 270 210 250 220 Q 220 228 200 220 Q 170 215 150 200 Q 120 185 100 170 Q 70 155 55 130 Q 45 105 60 80Z"
            fill="#0d2040" stroke="#1a3a6e" strokeWidth="1.5" />
          {/* North Africa coast */}
          <path d="M 60 165 Q 100 172 145 170 Q 200 168 250 172 Q 310 175 370 172 Q 420 170 460 165 Q 480 162 510 158 Q 510 280 0 280 Q 0 165 60 165Z"
            fill="#0d2040" stroke="#1a3a6e" strokeWidth="1" />
          {/* Italy peninsula */}
          <path d="M 260 75 Q 270 100 275 130 Q 280 160 295 185 Q 300 195 295 200 Q 285 205 280 195 Q 268 178 260 160 Q 252 138 250 110 Q 248 88 255 75Z"
            fill="#07101f" stroke="#1a3a6e" strokeWidth="1" />
          {/* Greece peninsula */}
          <path d="M 378 120 Q 382 138 380 152 Q 376 160 370 162 Q 362 158 360 150 Q 358 140 362 128 Q 368 118 378 120Z"
            fill="#07101f" stroke="#1a3a6e" strokeWidth="0.8" />
          {/* Anatolian coast hint */}
          <path d="M 415 110 Q 440 108 460 112 Q 465 118 460 125 Q 450 128 435 128 Q 420 126 415 120 Q 413 115 415 110Z"
            fill="#0d2040" stroke="#1a3a6e" strokeWidth="0.8" />
          {/* Shipping lanes */}
          <path d="M 62 150 Q 130 152 200 155 Q 250 157 300 160 Q 345 162 390 168 Q 415 172 440 172"
            fill="none" stroke="#4db8ff" strokeWidth="1.5" strokeDasharray="7 4" opacity="0.35"
            style={{ animation: "sentinelDash 4s linear infinite" }} />
          <path d="M 62 140 Q 130 138 200 140 Q 250 140 300 142 Q 330 143 365 148 Q 390 152 420 155 Q 445 157 465 155"
            fill="none" stroke="#00cfff" strokeWidth="1" strokeDasharray="5 5" opacity="0.22" />
          <path d="M 240 110 Q 290 114 330 120 Q 360 126 388 140 Q 410 145 430 142"
            fill="none" stroke="#4db8ff" strokeWidth="1" strokeDasharray="4 5" opacity="0.2" />
          {/* Port markers */}
          {[
            { name: "Gibraltar", px: 70, py: 148 },
            { name: "Marseille", px: 248, py: 116 },
            { name: "Malta",     px: 308, py: 172 },
            { name: "Piraeus",   px: 380, py: 150 },
            { name: "Port Said", px: 430, py: 170 },
            { name: "Istanbul",  px: 418, py: 116 },
          ].map(p => (
            <g key={p.name}>
              <rect x={p.px - 3} y={p.py - 3} width={6} height={6} fill="#4db8ff" opacity={0.6} transform={`rotate(45,${p.px},${p.py})`} />
              <text x={p.px} y={p.py - 8} textAnchor="middle" fill="#2d6a80" fontSize="7">{p.name}</text>
            </g>
          ))}
          {/* Vessel markers */}
          {VESSELS.map((v) => {
            const isSelected = sel?.mmsi === v.mmsi;
            const color = rc(v.risk);
            const courseDeg = parseFloat(v.course);
            const hasHeading = !isNaN(courseDeg) && parseFloat(v.speed) >= 0.5;
            const arrowLen = isSelected ? 18 : 13;
            const ax = hasHeading ? v.mx + Math.sin(courseDeg * Math.PI / 180) * arrowLen : null;
            const ay = hasHeading ? v.my - Math.cos(courseDeg * Math.PI / 180) * arrowLen : null;
            return (
              <g key={v.mmsi} onClick={() => selectVessel(v)} style={{ cursor: "pointer" }}>
                {/* Course arrow */}
                {hasHeading && (
                  <line x1={v.mx} y1={v.my} x2={ax} y2={ay}
                    stroke={color} strokeWidth={isSelected ? 1.5 : 1} opacity={isSelected ? 0.8 : 0.45}
                    markerEnd="none" />
                )}
                {/* Outer pulse ring — only for selected */}
                {isSelected && (
                  <circle cx={v.mx} cy={v.my} r={pulse ? 18 : 14}
                    fill="none" stroke={color} strokeWidth="1"
                    opacity={pulse ? 0.5 : 0.2}
                    style={{ transition: "r 0.4s, opacity 0.4s" }} />
                )}
                {/* Inner ring */}
                <circle cx={v.mx} cy={v.my} r={isSelected ? 11 : 8}
                  fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
                {/* Core dot */}
                <circle cx={v.mx} cy={v.my} r={isSelected ? 7 : 5}
                  fill={color} opacity={isSelected ? 1 : 0.85} />
                {/* Arrow head */}
                {hasHeading && (
                  <circle cx={ax} cy={ay} r={2} fill={color} opacity={isSelected ? 0.9 : 0.5} />
                )}
                {/* Label */}
                <text x={v.mx} y={v.my - 15} textAnchor="middle"
                  fill={isSelected ? "#e2e8f0" : "#6b7a8d"} fontSize={isSelected ? 9 : 8}
                  fontWeight={isSelected ? "700" : "400"}>
                  {v.name}
                </text>
              </g>
            );
          })}
          {/* Legend */}
          <g transform="translate(10,255)">
            {[["HIGH","#ff4d4d"],["MEDIUM","#ffd700"],["LOW","#00ff9d"]].map(([label, color], i) => (
              <g key={label} transform={`translate(${i * 72}, 0)`}>
                <circle cx={5} cy={5} r={4} fill={color} opacity={0.8} />
                <text x={13} y={9} fill="#6b7a8d" fontSize={8}>{label}</text>
              </g>
            ))}
          </g>
        </svg>

        {/* Selected vessel detail panel */}
        {sel && (
          <div style={{ margin: "0 14px 14px", background: "#0a1628", borderRadius: 8, padding: 14, border: `1px solid ${rc(sel.risk)}33`, borderLeft: `3px solid ${rc(sel.risk)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 4 }}>VESSEL INTELLIGENCE</div>
                <div style={{ fontWeight: 900, color: "#e2e8f0", fontSize: 15 }}>{sel.flag} {sel.name}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <BADGE text={sel.risk} color={riskBadge(sel.risk)} />
                <button
                  onClick={() => setSel(null)}
                  style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>
                  ✕
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))", gap: 8, marginBottom: 12 }}>
              {[
                ["MMSI",    sel.mmsi,    "#4db8ff"],
                ["TYPE",    sel.type,    "#e2e8f0"],
                ["ANOMALY", sel.anomaly, rc(sel.risk)],
                ["SPEED",   sel.speed,   "#e2e8f0"],
                ["COURSE",  sel.course,  "#e2e8f0"],
                ["STATUS",  sel.anomaly === "None" ? "Normal" : "Alert", sel.anomaly === "None" ? "#00ff9d" : "#ff4d4d"],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: "#0d1626", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                  <div style={{ color, fontSize: 12, fontWeight: 600, fontFamily: label === "MMSI" || label === "SPEED" || label === "COURSE" ? "monospace" : "inherit" }}>{value}</div>
                </div>
              ))}
            </div>

            {apiKey && (
              <Btn onClick={() => analyzeVessel(sel)} disabled={aiLoading} color="#00cfff" size="sm">
                {aiLoading ? "⏳ Analyzing..." : "🤖 AI Maritime Assessment"}
              </Btn>
            )}
            {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
            {aiResult && (
              <div style={{ background: "#051220", border: "1px solid #00cfff33", borderLeft: "3px solid #00cfff", borderRadius: 6, padding: 12, marginTop: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <LiveBadge />
                  <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI MARITIME ASSESSMENT · {sel.mmsi}</span>
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.7 }}>{aiResult}</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Vessel list */}
      <div style={{ marginBottom: 8 }}>
        <ST icon="🚢" label="Vessel Registry" color="#00cfff" sub={`${VESSELS.length} vessels monitored · ${anomCount} anomalies active`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 8 }}>
        {VESSELS.map(v => (
          <VesselCard
            key={v.mmsi}
            v={v}
            selected={sel?.mmsi === v.mmsi}
            onClick={() => selectVessel(v)}
          />
        ))}
      </div>
    </div>
  );
}
