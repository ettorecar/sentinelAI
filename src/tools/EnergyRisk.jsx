import { useState } from "react";
import { BADGE, Card, ST, Btn, Input, PageHeader, riskColor, riskBadgeColor, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

const countries = ["Germany", "Italy", "France", "Poland", "Japan", "South Korea", "India", "Turkey"];

const profiles = {
  Germany:      { import_dep: 95, vulnerability: "HIGH",     storage_days: 65, alt_score: 62, resilience_score: 58, chokepoint_exposure: ["Bab-el-Mandeb (LNG)", "Danish Straits (pipeline)"], top_suppliers: [{ name: "Norway", pct: 32, risk: "LOW" }, { name: "USA", pct: 18, risk: "LOW" }, { name: "Russia", pct: 12, risk: "CRITICAL" }, { name: "Algeria", pct: 11, risk: "MEDIUM" }, { name: "Others", pct: 27, risk: "LOW" }], scenarios: [{ name: "Russian gas cutoff", impact: "HIGH", gdp_loss: "1.8%", duration: "12–18 mo" }, { name: "Norwegian field disruption", impact: "MEDIUM", gdp_loss: "0.9%", duration: "3–6 mo" }, { name: "LNG terminal cyberattack", impact: "HIGH", gdp_loss: "1.2%", duration: "2–4 mo" }] },
  Italy:        { import_dep: 90, vulnerability: "HIGH",     storage_days: 55, alt_score: 55, resilience_score: 51, chokepoint_exposure: ["Strait of Hormuz (LNG)", "Bab-el-Mandeb (LNG)", "Suez Canal"],                top_suppliers: [{ name: "Algeria", pct: 31, risk: "MEDIUM" }, { name: "Russia", pct: 12, risk: "CRITICAL" }, { name: "Azerbaijan", pct: 15, risk: "MEDIUM" }, { name: "Libya", pct: 10, risk: "HIGH" }, { name: "Others", pct: 32, risk: "LOW" }],    scenarios: [{ name: "Libyan pipeline disruption", impact: "HIGH", gdp_loss: "1.4%", duration: "6–12 mo" }, { name: "Algerian political instability", impact: "HIGH", gdp_loss: "1.6%", duration: "12–24 mo" }, { name: "Strait of Hormuz closure", impact: "MEDIUM", gdp_loss: "0.7%", duration: "1–3 mo" }] },
  France:       { import_dep: 98, vulnerability: "MEDIUM",   storage_days: 90, alt_score: 72, resilience_score: 70, chokepoint_exposure: ["Bab-el-Mandeb (LNG)"],                                                        top_suppliers: [{ name: "Norway", pct: 36, risk: "LOW" }, { name: "USA", pct: 22, risk: "LOW" }, { name: "Algeria", pct: 14, risk: "MEDIUM" }, { name: "Russia", pct: 7, risk: "CRITICAL" }, { name: "Others", pct: 21, risk: "LOW" }],     scenarios: [{ name: "Norwegian field disruption", impact: "MEDIUM", gdp_loss: "0.8%", duration: "3–6 mo" }, { name: "Algerian instability", impact: "MEDIUM", gdp_loss: "0.6%", duration: "6–12 mo" }] },
  Poland:       { import_dep: 96, vulnerability: "MEDIUM",   storage_days: 75, alt_score: 68, resilience_score: 65, chokepoint_exposure: ["Danish Straits", "Bab-el-Mandeb (LNG)"],                                       top_suppliers: [{ name: "Norway", pct: 28, risk: "LOW" }, { name: "USA LNG", pct: 25, risk: "LOW" }, { name: "Qatar", pct: 18, risk: "MEDIUM" }, { name: "Russia", pct: 5, risk: "CRITICAL" }, { name: "Others", pct: 24, risk: "LOW" }],   scenarios: [{ name: "Baltic pipeline sabotage", impact: "HIGH", gdp_loss: "1.1%", duration: "3–9 mo" }] },
  Japan:        { import_dep: 99, vulnerability: "CRITICAL",  storage_days: 45, alt_score: 40, resilience_score: 38, chokepoint_exposure: ["Strait of Malacca", "Strait of Hormuz", "Taiwan Strait"],                     top_suppliers: [{ name: "Australia", pct: 39, risk: "LOW" }, { name: "Malaysia", pct: 13, risk: "LOW" }, { name: "Qatar", pct: 11, risk: "MEDIUM" }, { name: "Russia", pct: 9, risk: "HIGH" }, { name: "Others", pct: 28, risk: "LOW" }],       scenarios: [{ name: "Strait of Malacca closure", impact: "CRITICAL", gdp_loss: "3.2%", duration: "indefinite" }, { name: "Hormuz disruption", impact: "HIGH", gdp_loss: "2.1%", duration: "6–12 mo" }, { name: "Conflict in Taiwan Strait", impact: "CRITICAL", gdp_loss: "4.0%", duration: "indefinite" }] },
  "South Korea":{ import_dep:100, vulnerability: "CRITICAL",  storage_days: 40, alt_score: 42, resilience_score: 41, chokepoint_exposure: ["Strait of Malacca", "Strait of Hormuz", "Taiwan Strait"],                     top_suppliers: [{ name: "Qatar", pct: 24, risk: "MEDIUM" }, { name: "Australia", pct: 21, risk: "LOW" }, { name: "USA", pct: 16, risk: "LOW" }, { name: "Malaysia", pct: 11, risk: "LOW" }, { name: "Others", pct: 28, risk: "LOW" }],          scenarios: [{ name: "Malacca closure", impact: "CRITICAL", gdp_loss: "2.8%", duration: "indefinite" }, { name: "Hormuz disruption", impact: "HIGH", gdp_loss: "1.9%", duration: "6–12 mo" }] },
  India:        { import_dep: 87, vulnerability: "HIGH",     storage_days: 30, alt_score: 50, resilience_score: 44, chokepoint_exposure: ["Strait of Hormuz", "Bab-el-Mandeb"],                                           top_suppliers: [{ name: "Iraq", pct: 22, risk: "MEDIUM" }, { name: "Saudi Arabia", pct: 18, risk: "HIGH" }, { name: "Russia", pct: 17, risk: "HIGH" }, { name: "UAE", pct: 10, risk: "MEDIUM" }, { name: "Others", pct: 33, risk: "LOW" }],       scenarios: [{ name: "Hormuz closure", impact: "CRITICAL", gdp_loss: "2.5%", duration: "6–18 mo" }, { name: "Bab-el-Mandeb disruption", impact: "HIGH", gdp_loss: "1.3%", duration: "3–9 mo" }] },
  Turkey:       { import_dep: 99, vulnerability: "CRITICAL",  storage_days: 28, alt_score: 38, resilience_score: 35, chokepoint_exposure: ["Turkish Straits", "Strait of Hormuz (LNG)"],                                  top_suppliers: [{ name: "Russia", pct: 33, risk: "CRITICAL" }, { name: "Azerbaijan", pct: 20, risk: "MEDIUM" }, { name: "Iran", pct: 10, risk: "HIGH" }, { name: "Algeria", pct: 8, risk: "MEDIUM" }, { name: "Others", pct: 29, risk: "LOW" }],       scenarios: [{ name: "Russian gas cutoff", impact: "CRITICAL", gdp_loss: "3.5%", duration: "indefinite" }, { name: "Bosphorus closure", impact: "CRITICAL", gdp_loss: "2.8%", duration: "indefinite" }] },
};

function ScenarioRow({ s }) {
  const [hovered, setHovered] = useState(false);
  const color = s.impact === "CRITICAL" ? "#ff0000" : s.impact === "HIGH" ? "#ff4d4d" : "#ffd700";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 7, padding: "11px 14px", marginBottom: 8,
        border: `1px solid ${hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${color}`,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, color: hovered ? "#ffffff" : "#e2e8f0" }}>{s.name}</div>
        <BADGE text={s.impact} color={s.impact === "CRITICAL" || s.impact === "HIGH" ? "red" : "yellow"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div><span style={{ color: "#4a5568", fontSize: 11 }}>EST. GDP IMPACT </span><span style={{ color: "#ff4d4d", fontWeight: 700 }}>{s.gdp_loss}</span></div>
        <div><span style={{ color: "#4a5568", fontSize: 11 }}>DURATION </span><span style={{ color: "#ffd700" }}>{s.duration}</span></div>
      </div>
    </div>
  );
}

// E4 — Supply chain dependency network SVG
function SupplyNetworkSVG({ country, suppliers }) {
  const cx = 130, cy = 110, R = 80;
  const n = suppliers.length;
  const RISK_COLOR = { CRITICAL: "#ff0000", HIGH: "#ff4d4d", MEDIUM: "#ffd700", LOW: "#00ff9d" };

  return (
    <svg viewBox="0 0 260 220" style={{ width: "100%", height: "auto" }}>
      {/* Connection lines — thickness = share % */}
      {suppliers.map((s, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const sx = cx + R * Math.cos(angle), sy = cy + R * Math.sin(angle);
        const color = RISK_COLOR[s.risk] || "#4db8ff";
        return (
          <line key={i} x1={cx} y1={cy} x2={sx} y2={sy}
            stroke={color} strokeWidth={Math.max(1, (s.pct / 100) * 7)} opacity="0.35" />
        );
      })}
      {/* Supplier nodes */}
      {suppliers.map((s, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const sx = cx + R * Math.cos(angle), sy = cy + R * Math.sin(angle);
        const color = RISK_COLOR[s.risk] || "#4db8ff";
        const nr = Math.max(7, (s.pct / 100) * 22);
        const lx = cx + (R + nr + 16) * Math.cos(angle);
        const ly = cy + (R + nr + 16) * Math.sin(angle);
        return (
          <g key={i}>
            <circle cx={sx} cy={sy} r={nr} fill={color} opacity="0.15" stroke={color} strokeWidth="1.5" />
            <text x={sx} y={sy} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="8" fontWeight="700">{s.pct}%</text>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize="7">{s.name}</text>
          </g>
        );
      })}
      {/* Central country node */}
      <circle cx={cx} cy={cy} r="24" fill="#ff9d0015" stroke="#ff9d00" strokeWidth="2" />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#ff9d00" fontSize="9" fontWeight="700">{country}</text>
      <text x={cx} y={cy + 7} textAnchor="middle" fill="#9ca3af" fontSize="6.5">import hub</text>
    </svg>
  );
}

// E4 — Country comparison grouped bar chart (max 3 countries)
const COMPARE_METRICS = [
  { key: "import_dep",       label: "Import Dep %", max: 100 },
  { key: "resilience_score", label: "Resilience",   max: 100 },
  { key: "storage_days",     label: "Storage Days", max: 100 },
  { key: "alt_score",        label: "Alt Supply",   max: 100 },
];
const COMPARE_COLORS = ["#4db8ff", "#00ff9d", "#ff9d00"];

function ComparisonChart({ compareList }) {
  if (compareList.length < 2) return null;
  const BH = 11, BGAP = 3, GPAD = 18, LW = 80, BW = 160, RW = 36;
  const gH = compareList.length * (BH + BGAP) + GPAD;
  const SVG_H = COMPARE_METRICS.length * gH + 4;
  const SVG_W = LW + BW + RW;

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
        {compareList.map((name, i) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: COMPARE_COLORS[i] }} />
            <span style={{ color: "#e2e8f0", fontSize: 11 }}>{name}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: "100%", height: SVG_H }}>
        {COMPARE_METRICS.map((m, mi) => {
          const groupY = mi * gH + 2;
          return (
            <g key={m.key}>
              <text x={0} y={groupY + (BH + BGAP) * compareList.length / 2} fill="#4a5568"
                fontSize="8.5" dominantBaseline="middle">{m.label}</text>
              {compareList.map((name, ci) => {
                const prof = profiles[name];
                if (!prof) return null;
                const raw = prof[m.key] ?? 0;
                const val = Math.min(m.max, raw);
                const bw = (val / m.max) * BW;
                const by = groupY + ci * (BH + BGAP);
                const color = COMPARE_COLORS[ci];
                return (
                  <g key={name}>
                    <rect x={LW} y={by} width={BW} height={BH} fill="#111827" rx="2" />
                    <rect x={LW} y={by} width={bw} height={BH} fill={color} opacity="0.85" rx="2" />
                    <text x={LW + BW + 4} y={by + BH / 2} fill={color} fontSize="8" dominantBaseline="middle"
                      fontWeight="600">{raw}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function tabStyle(active, color = "#ff9d00") {
  return {
    padding: "6px 14px", borderRadius: "5px 5px 0 0", fontSize: 12, fontWeight: active ? 700 : 500,
    cursor: "pointer", border: "none", outline: "none", background: "transparent",
    color: active ? color : "#4a5568",
    borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
  };
}

// 4-axis risk radar comparing selected country vs. peer average
const RADAR_DIMS = [
  { key: "import_dep",       label: "Import Dep.", invert: true  },
  { key: "resilience_score", label: "Resilience",  invert: false },
  { key: "storage_days",     label: "Storage",     invert: false },
  { key: "alt_score",        label: "Alt Supply",  invert: false },
];

function RiskRadar({ country, allCountries }) {
  const n = RADAR_DIMS.length;
  const cx = 100, cy = 100, R = 72;
  const angle = i => (i / n) * 2 * Math.PI - Math.PI / 2;
  const pt = (ang, r) => [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];

  // Country values (normalize to 0-100, invert import_dep so lower = better = larger polygon)
  const countryProf = profiles[country];
  const peerAvg = {};
  RADAR_DIMS.forEach(d => {
    const vals = allCountries.map(c => profiles[c]?.[d.key] || 0);
    peerAvg[d.key] = vals.reduce((s, v) => s + v, 0) / vals.length;
  });

  const toVal = (dim, prof) => {
    let v = (prof[dim.key] || 0);
    if (dim.key === "storage_days") v = Math.min(100, v);
    if (dim.invert) v = 100 - v;
    return v / 100;
  };

  const countryVals = RADAR_DIMS.map(d => toVal(d, countryProf));
  const peerVals = RADAR_DIMS.map(d => toVal(d, peerAvg));

  const countryPts = countryVals.map((v, i) => pt(angle(i), R * v).join(",")).join(" ");
  const peerPts = peerVals.map((v, i) => pt(angle(i), R * v).join(",")).join(" ");

  return (
    <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 200, height: "auto" }}>
      {[0.25, 0.5, 0.75, 1.0].map((ring, ri) => (
        <polygon key={ri}
          points={RADAR_DIMS.map((_, i) => pt(angle(i), R * ring).join(",")).join(" ")}
          fill="none" stroke={ri === 3 ? "#1f2d45" : "#111d2e"}
          strokeWidth={ri === 3 ? "1" : "0.6"} />
      ))}
      {[25, 50, 75].map(v => (
        <text key={v} x={cx + 3} y={cy - (v / 100) * R + 3}
          fill="#2d3f55" fontSize="6" textAnchor="start">{v}</text>
      ))}
      {RADAR_DIMS.map((_, i) => {
        const [x, y] = pt(angle(i), R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#1f2d45" strokeWidth="0.8" />;
      })}
      {/* Peer average polygon */}
      <polygon points={peerPts} fill="#4db8ff0a" stroke="#4db8ff" strokeWidth="1" strokeDasharray="3 2" />
      {/* Country polygon */}
      <polygon points={countryPts} fill="#ff9d0018" stroke="#ff9d00" strokeWidth="1.8" />
      {countryVals.map((v, i) => {
        const [x, y] = pt(angle(i), R * v);
        return <circle key={i} cx={x} cy={y} r="3" fill="#ff9d00" />;
      })}
      {RADAR_DIMS.map((d, i) => {
        const [x, y] = pt(angle(i), R + 15);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill="#9ca3af" fontSize="7" fontWeight="600">{d.label}</text>
        );
      })}
      <circle cx={cx} cy={cy} r="3" fill="#ff9d00" opacity="0.5" />
    </svg>
  );
}

function CountryBtn({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? "#ff9d00" : hovered ? "#ff9d0022" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? "#ff9d00" : "#9ca3af",
        border: `1px solid ${active ? "#ff9d00" : hovered ? "#ff9d0044" : "transparent"}`,
        borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 13,
        fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function DonutChart({ suppliers, import_dep }) {
  let angle = -90;
  const r = 42, cx = 60, cy = 60;
  const colors = ["#4db8ff", "#00ff9d", "#ffd700", "#ff9d00", "#b47fff"];
  const slices = suppliers.map(s => { const a = (s.pct / 100) * 360; const start = angle; angle += a; return { ...s, startAngle: start, endAngle: start + a }; });
  const toXY = (cx, cy, r, deg) => { const rad = deg * Math.PI / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; };
  return (
    <svg viewBox="0 0 120 120" style={{ width: "min(120px, 100%)", height: "auto", flexShrink: 0 }}>
      {slices.map((s, i) => {
        const [x1, y1] = toXY(cx, cy, r, s.startAngle);
        const [x2, y2] = toXY(cx, cy, r, s.endAngle);
        const large = s.pct > 50 ? 1 : 0;
        const color = s.risk === "CRITICAL" ? "#ff0000" : s.risk === "HIGH" ? "#ff4d4d" : s.risk === "MEDIUM" ? "#ffd700" : colors[i % colors.length];
        return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={color} opacity="0.85" stroke="#111827" strokeWidth="1.5" />;
      })}
      <circle cx={cx} cy={cy} r={25} fill="#111827" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="bold">{import_dep}%</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#9ca3af" fontSize="7">import</text>
    </svg>
  );
}

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(
    data.content
      .map((b) => b.text || "")
      .join("")
      .replace(/```json|```/g, "")
      .trim()
  );
}

export default function EnergyRisk() {
  const [apiKey] = useApiKey();
  const { stamp } = useLastAnalysis("energyrisk");
  const [country, setCountry] = useState("Germany");
  const [ran, setRan] = useState(false);
  const [riskTab, setRiskTab] = useState("profile");
  const [aiAssessment, setAiAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compareSet, setCompareSet] = useState(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  function toggleCompare(name) {
    setCompareSet(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); }
      else if (next.size < 3) { next.add(name); }
      return next;
    });
  }
  const p = profiles[country];

  async function analyze() {
    setRan(true);
    setRiskTab("profile");
    setAiAssessment(null);
    setError("");
    if (!apiKey) return;
    setLoading(true);
    try {
      const prof = profiles[country];
      const prompt = `You are a senior energy security analyst. Provide a current intelligence assessment for ${country}'s energy supply chain risk. Context: import dependency ${prof.import_dep}%, vulnerability rated ${prof.vulnerability}, ${prof.storage_days} days strategic reserves, resilience score ${prof.resilience_score}/100, exposed to chokepoints: ${prof.chokepoint_exposure.join(", ")}. Top suppliers: ${prof.top_suppliers.map(s => `${s.name} ${s.pct}% (${s.risk} risk)`).join(", ")}. Return ONLY a JSON object (no markdown, no backticks):
{"geopolitical_context":"string (2-3 sentences on current geopolitical situation affecting energy security)","immediate_threats":["string"],"long_term_risks":["string"],"recommended_actions":["string"],"trend":"IMPROVING|STABLE|DETERIORATING","analyst_note":"string (1-2 sentence expert opinion)"}
Include 3-4 immediate threats, 3-4 long-term risks, 3-4 actions.`;
      const assessment = await callClaude(apiKey, prompt);
      setAiAssessment(assessment); setRiskTab("assessment");
      stamp();
    } catch (e) { setError("AI assessment error: " + e.message); }
    setLoading(false);
  }

  const trendColor = (t) => t === "IMPROVING" ? "#00ff9d" : t === "DETERIORATING" ? "#ff4d4d" : "#ffd700";

  return (
    <div>
      <PageHeader icon="📊" title="Energy Supply Chain Risk Analyzer" sub="National energy dependency analysis and disruption scenario modeling." accent="#ff9d00" dataMode={apiKey ? "hybrid" : "mock"} />

      <Card>
        <ST icon="🌍" label="Select Country" color="#4db8ff" />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {countries.map(c => (
            <CountryBtn key={c} label={c} active={country === c} onClick={() => { setCountry(c); setRan(false); setAiAssessment(null); }} />
          ))}
        </div>
        {error && <div style={{ color: "#ff4d4d", marginTop: 10, fontSize: 13 }}>{error}</div>}
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Btn onClick={() => { analyze(); }} disabled={loading} color="#ff9d00">
            {loading ? "⏳ Analyzing..." : "⚡ Analyze Risk Profile"}
          </Btn>
          <LastAnalysisTag toolId="energyrisk" />
          <button onClick={() => { setCompareOpen(x => !x); if (!compareOpen && ran) setRiskTab("compare"); }} style={{
            background: compareOpen ? "#ff9d0022" : "transparent",
            border: `1px solid ${compareOpen ? "#ff9d00" : "#1f2d45"}`,
            borderRadius: 6, padding: "7px 14px", cursor: "pointer",
            color: compareOpen ? "#ff9d00" : "#9ca3af", fontSize: 12,
            transition: "all 0.15s",
          }}>
            📊 Compare ({compareSet.size}/3)
          </button>
        </div>
      </Card>

      {ran && p && (
        <>
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 110px), 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              ["Import Dependency", p.import_dep + "%", "#ff9d00"],
              ["Vulnerability", p.vulnerability, riskColor(p.vulnerability)],
              ["Storage Days", p.storage_days + "d", "#4db8ff"],
              ["Resilience Score", p.resilience_score + "/100", p.resilience_score > 65 ? "#00ff9d" : p.resilience_score > 45 ? "#ffd700" : "#ff4d4d"],
            ].map(([l, v, c]) => (
              <Card key={l} style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>{l}</div>
              </Card>
            ))}
          </div>

          {/* Sub-tabs */}
          {(() => {
            const RISK_TABS = [
              { id: "profile", label: "Risk Profile" },
              { id: "suppliers", label: "Supplier Mix" },
              { id: "scenarios", label: "Scenarios" },
              ...(compareOpen ? [{ id: "compare", label: "Comparison" }] : []),
              ...(aiAssessment ? [{ id: "assessment", label: "AI Assessment" }] : []),
            ];
            return (
              <div style={{ display: "flex", borderBottom: "1px solid #1f2d45", marginBottom: 14, gap: 2, flexWrap: "wrap" }}>
                {RISK_TABS.map(t => (
                  <button key={t.id} onClick={() => setRiskTab(t.id)} style={tabStyle(riskTab === t.id)}>{t.label}</button>
                ))}
              </div>
            );
          })()}

          {riskTab === "profile" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 14 }}>
              {/* Risk radar */}
              <Card>
                <ST icon="🎯" label="Risk Profile Radar" color="#ff9d00"
                  sub={`${country} vs. peer average (dashed)`} style={{ marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flexShrink: 0 }}>
                    <RiskRadar country={country} allCountries={countries} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    {RADAR_DIMS.map(d => (
                      <div key={d.key} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>{d.label}</span>
                          <span style={{ color: "#ff9d00", fontSize: 11, fontWeight: 700 }}>{p[d.key]}{d.key === "storage_days" ? "d" : ""}</span>
                        </div>
                        <div style={{ background: "#1f2d45", borderRadius: 3, height: 5 }}>
                          <div style={{ background: "#ff9d00", height: 5, borderRadius: 3, width: `${d.invert ? 100 - p[d.key] : Math.min(100, p[d.key])}%` }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: "#9ca3af", fontSize: 10, marginBottom: 5 }}>CHOKEPOINT EXPOSURE</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {p.chokepoint_exposure.map((c, i) => <BADGE key={i} text={c} color="orange" />)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Resilience breakdown */}
              <Card>
                <ST icon="🛡️" label="Resilience Assessment" color="#00ff9d" />
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>Overall Resilience Score</span>
                    <span style={{ color: p.resilience_score > 65 ? "#00ff9d" : p.resilience_score > 45 ? "#ffd700" : "#ff4d4d", fontWeight: 800 }}>{p.resilience_score}/100</span>
                  </div>
                  <div style={{ background: "#1f2d45", borderRadius: 6, height: 14 }}>
                    <div style={{ background: p.resilience_score > 65 ? "#00ff9d" : p.resilience_score > 45 ? "#ffd700" : "#ff4d4d", height: 14, borderRadius: 6, width: `${p.resilience_score}%`, transition: "width 1s" }} />
                  </div>
                </div>
                {[["Alternative Supply Score", p.alt_score], ["Storage Coverage", Math.min(100, p.storage_days)], ["Diversification", 100 - p.top_suppliers[0].pct]].map(([l, v]) => (
                  <div key={l} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ color: "#9ca3af", fontSize: 11 }}>{l}</span>
                      <span style={{ color: "#e2e8f0", fontSize: 11 }}>{v}/100</span>
                    </div>
                    <div style={{ background: "#1f2d45", borderRadius: 3, height: 6 }}>
                      <div style={{ background: "#4db8ff", height: 6, borderRadius: 3, width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {riskTab === "suppliers" && (
            <Card>
              <ST icon="🥧" label="Supplier Mix" color="#ff9d00" />
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <DonutChart suppliers={p.top_suppliers} import_dep={p.import_dep} />
                <div style={{ flex: 1 }}>
                  {p.top_suppliers.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: riskColor(s.risk), flexShrink: 0 }} />
                        <span style={{ color: "#e2e8f0", fontSize: 12 }}>{s.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#ff9d00", fontWeight: 700, fontSize: 12 }}>{s.pct}%</span>
                        <BADGE text={s.risk} color={riskBadgeColor(s.risk)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1f2d45" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>SUPPLY CHAIN DEPENDENCY NETWORK</div>
                <SupplyNetworkSVG country={country} suppliers={p.top_suppliers} />
              </div>
            </Card>
          )}

          {riskTab === "scenarios" && (
            <Card>
              <ST icon="💥" label="Disruption Scenarios" color="#ff4d4d" sub="Modeled disruption scenarios with GDP impact" />
              {p.scenarios.map((s, i) => (
                <ScenarioRow key={i} s={s} />
              ))}
            </Card>
          )}

          {riskTab === "compare" && compareOpen && (
            <Card>
              <ST icon="📊" label="Country Risk Comparison" color="#ff9d00"
                sub="Select up to 3 countries to compare side by side" style={{ marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
                {countries.map(c => {
                  const inSet = compareSet.has(c);
                  const disabled = !inSet && compareSet.size >= 3;
                  return (
                    <button key={c} onClick={() => !disabled && toggleCompare(c)} style={{
                      background: inSet ? `${COMPARE_COLORS[Array.from(compareSet).indexOf(c)]}22` : "transparent",
                      border: `1px solid ${inSet ? COMPARE_COLORS[Array.from(compareSet).indexOf(c)] : "#1f2d45"}`,
                      borderRadius: 6, padding: "5px 12px", cursor: disabled ? "not-allowed" : "pointer",
                      color: inSet ? COMPARE_COLORS[Array.from(compareSet).indexOf(c)] : disabled ? "#2d3f55" : "#9ca3af",
                      fontSize: 12, opacity: disabled ? 0.4 : 1, transition: "all 0.15s",
                    }}>
                      {inSet ? "✓ " : ""}{c}
                    </button>
                  );
                })}
                {compareSet.size > 0 && (
                  <button onClick={() => setCompareSet(new Set())} style={{
                    background: "transparent", border: "1px solid #1f2d45", borderRadius: 6,
                    padding: "5px 10px", cursor: "pointer", color: "#4a5568", fontSize: 11,
                  }}>Clear</button>
                )}
              </div>
              {compareSet.size >= 2
                ? <ComparisonChart compareList={Array.from(compareSet)} />
                : <div style={{ color: "#2d3f55", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Select at least 2 countries to see comparison</div>
              }
            </Card>
          )}

          {riskTab === "assessment" && (
            <>
              {loading && (
                <Card style={{ borderColor: "#ff9d00", textAlign: "center", color: "#9ca3af" }}>
                  ⏳ Generating AI intelligence assessment…
                </Card>
              )}
              {aiAssessment && (
                <Card style={{ borderColor: "#ff9d00" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <ST icon="🤖" label="AI Intelligence Assessment" color="#ff9d00" />
                    <ExportBtn data={aiAssessment} filename="sentinel-energyrisk" />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#9ca3af", fontSize: 11 }}>TREND</span>
                      <BADGE text={aiAssessment.trend} color={aiAssessment.trend === "IMPROVING" ? "green" : aiAssessment.trend === "DETERIORATING" ? "red" : "yellow"} />
                    </div>
                  </div>
                  <div style={{ background: "#0d1626", borderRadius: 6, padding: 12, marginBottom: 12 }}>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>GEOPOLITICAL CONTEXT</div>
                    <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.6 }}>{aiAssessment.geopolitical_context}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ color: "#ff4d4d", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>⚡ Immediate Threats</div>
                      {aiAssessment.immediate_threats?.map((t, i) => (
                        <div key={i} style={{ color: "#e2e8f0", fontSize: 12, marginBottom: 5 }}>• {t}</div>
                      ))}
                    </div>
                    <div>
                      <div style={{ color: "#ffd700", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🔭 Long-term Risks</div>
                      {aiAssessment.long_term_risks?.map((r, i) => (
                        <div key={i} style={{ color: "#e2e8f0", fontSize: 12, marginBottom: 5 }}>• {r}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ color: "#00ff9d", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🛡️ Recommended Actions</div>
                    {aiAssessment.recommended_actions?.map((a, i) => (
                      <div key={i} style={{ color: "#e2e8f0", fontSize: 12, marginBottom: 5 }}>• {a}</div>
                    ))}
                  </div>
                  {aiAssessment.analyst_note && (
                    <div style={{ background: "#0d1626", borderRadius: 6, padding: 10, borderLeft: `3px solid ${trendColor(aiAssessment.trend)}` }}>
                      <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 3 }}>ANALYST NOTE</div>
                      <div style={{ color: "#e2e8f0", fontSize: 13, fontStyle: "italic" }}>{aiAssessment.analyst_note}</div>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
