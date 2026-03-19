import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
}

const days  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const slots = ["06–09","09–12","12–15","15–18","18–21","21–24"];
const slotAccent = i => ["#ffd700","#ff9d00","#ff9d00","#ff4d4d","#ff4d4d","#4db8ff"][i] || "#4db8ff";
const riskColor  = r => r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";
const riskBadge  = r => r === "CRITICAL" || r === "HIGH" ? "red" : r === "MEDIUM" ? "yellow" : "green";

const NODE_TYPE_COLOR = { Residential: "#4db8ff", Work: "#ff9d00", Transit: "#ffd700", Recreation: "#00ff9d", Unknown: "#6b7a8d" };
const ASSOC_TYPE_COLOR = { Person: "#ff9d00", Vehicle: "#4db8ff", Location: "#00ff9d", Organization: "#b47fff" };
const ANOM_COLOR = { HIGH: "#ff4d4d", MEDIUM: "#ffd700", LOW: "#00ff9d" };
const FREQ_DASH = { Daily: "0", Regular: "6 3", Occasional: "3 6" };

function tabStyle(active, color) {
  return {
    background: active ? `${color}18` : "transparent",
    color: active ? color : "#6b7a8d",
    border: "none", borderBottom: `2px solid ${active ? color : "transparent"}`,
    padding: "8px 14px", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: 0.5, transition: "all 0.15s", whiteSpace: "nowrap",
  };
}

function HeatmapCell({ active, slotIdx, day, slot }) {
  const [hovered, setHovered] = useState(false);
  const ac = slotAccent(slotIdx);
  return (
    <td style={{ padding: 2 }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={active ? `Active: ${slot} on ${day}` : `Inactive: ${slot} on ${day}`}
        style={{
          width: 34, height: 24, borderRadius: 4, cursor: "default",
          background: active ? (hovered ? ac + "55" : ac + "33") : hovered ? "#1f2d45" : "#0d1626",
          border: `1px solid ${active ? (hovered ? ac : ac + "88") : hovered ? "#2a3f5f" : "#1f2d45"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s, border-color 0.15s",
          boxShadow: active && hovered ? `0 0 6px ${ac}44` : "none",
        }}
      >
        {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: ac, boxShadow: `0 0 4px ${ac}` }} />}
      </div>
    </td>
  );
}

function HeatmapGrid({ heatmap }) {
  const rowTotals = slots.map((_, si) => days.reduce((s, _, di) => s + (heatmap[si]?.[di] === 1 ? 1 : 0), 0));
  const colTotals = days.map((_, di) => slots.reduce((s, _, si) => s + (heatmap[si]?.[di] === 1 ? 1 : 0), 0));
  const maxRow = Math.max(...rowTotals, 1);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ color: "#4a5568", padding: "2px 8px", fontWeight: 400, textAlign: "left", fontSize: 10, minWidth: 52 }} />
            {days.map((d, di) => (
              <th key={d} style={{ color: colTotals[di] > 0 ? "#e2e8f0" : "#4a5568", padding: "2px 2px 6px", fontWeight: colTotals[di] > 0 ? 700 : 400, minWidth: 38, textAlign: "center", fontSize: 11 }}>{d}</th>
            ))}
            <th style={{ color: "#4a5568", padding: "2px 8px", fontSize: 9, letterSpacing: 1 }}>FREQ</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s, si) => (
            <tr key={s}>
              <td style={{ color: rowTotals[si] > 0 ? slotAccent(si) : "#4a5568", padding: "2px 8px", fontSize: 10, whiteSpace: "nowrap", fontWeight: rowTotals[si] > 0 ? 700 : 400 }}>{s}</td>
              {days.map((d, di) => <HeatmapCell key={di} active={heatmap[si]?.[di] === 1} slotIdx={si} day={d} slot={s} />)}
              <td style={{ padding: "2px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ height: 8, borderRadius: 2, background: slotAccent(si), width: Math.max(4, (rowTotals[si] / maxRow) * 40) }} />
                  <span style={{ color: slotAccent(si), fontSize: 10, fontWeight: 700 }}>{rowTotals[si]}</span>
                </div>
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ color: "#4a5568", padding: "6px 8px 2px", fontSize: 9, letterSpacing: 1 }}>ACTIVE</td>
            {days.map((_, di) => (
              <td key={di} style={{ padding: "6px 2px 2px", textAlign: "center" }}>
                <span style={{ color: colTotals[di] > 0 ? "#e2e8f0" : "#4a5568", fontSize: 10, fontWeight: colTotals[di] > 0 ? 700 : 400 }}>{colTotals[di]}</span>
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        {[["Morning 06–09",0],["Midday 09–15",1],["Afternoon 15–18",3],["Evening 18–21",4],["Night 21–24",5]].map(([label, idx]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: slotAccent(idx) }} />
            <span style={{ color: "#4a5568", fontSize: 10 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MovementMap({ nodes, edges, patterns }) {
  const [sel, setSel] = useState(null);
  if (!nodes?.length) {
    // Fall back to pattern-derived visualization
    const locs = [...new Set((patterns || []).map(p => p.location))].slice(0, 7);
    if (!locs.length) return <div style={{ color: "#4a5568", padding: 16 }}>No movement data available.</div>;
    const pts = locs.map((l, i) => {
      const angle = (2 * Math.PI * i) / locs.length - Math.PI / 2;
      const r = i === 0 ? 0 : 95;
      return { label: l, x: 200 + r * Math.cos(angle), y: 155 + r * Math.sin(angle), idx: i };
    });
    return (
      <svg viewBox="0 0 400 310" style={{ width: "100%", background: "#070e1c", borderRadius: 10 }}>
        {pts.slice(1).map((n, i) => (
          <line key={i} x1={pts[0].x} y1={pts[0].y} x2={n.x} y2={n.y} stroke="#1f2d4566" strokeWidth="1.5" strokeDasharray="5 3" />
        ))}
        {pts.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={i === 0 ? 22 : 16} fill={i === 0 ? "#ff4d4d22" : "#0d1626"} stroke={i === 0 ? "#ff4d4d" : "#4db8ff"} strokeWidth={i === 0 ? 2 : 1.5} />
            <text x={n.x} y={n.y + 4} textAnchor="middle" fill={i === 0 ? "#ff4d4d" : "#4db8ff"} fontSize="7" fontWeight="bold">
              {n.label.slice(0, 12)}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  // Use AI-generated movement_nodes
  return (
    <div>
      <svg viewBox="0 0 440 320" style={{ width: "100%", background: "#070e1c", borderRadius: 10 }}>
        {/* Grid */}
        {[80,160,240].map(y => <line key={y} x1={0} y1={y} x2={440} y2={y} stroke="#0d1a2e" strokeWidth="1" />)}
        {[110,220,330].map(x => <line key={x} x1={x} y1={0} x2={x} y2={320} stroke="#0d1a2e" strokeWidth="1" />)}
        {/* Edges */}
        {(edges || []).map((e, i) => {
          const from = nodes[e.from], to = nodes[e.to];
          if (!from || !to) return null;
          const fx = (from.x / 100) * 420 + 10, fy = (from.y / 100) * 300 + 10;
          const tx = (to.x / 100) * 420 + 10,   ty = (to.y / 100) * 300 + 10;
          const fc = riskColor(from.exposure || "LOW");
          return (
            <line key={i} x1={fx} y1={fy} x2={tx} y2={ty}
              stroke={fc + "66"} strokeWidth="2"
              strokeDasharray={FREQ_DASH[e.frequency] || "0"}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map((n, i) => {
          const x = (n.x / 100) * 420 + 10, y = (n.y / 100) * 300 + 10;
          const nc = NODE_TYPE_COLOR[n.type] || "#6b7a8d";
          const rc = riskColor(n.exposure || "LOW");
          const isSel = sel === i;
          const r = 12 + Math.min(n.visits_per_week || 1, 5) * 3;
          return (
            <g key={i} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: "pointer" }}>
              {isSel && <circle cx={x} cy={y} r={r + 12} fill="none" stroke={nc} strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />}
              <circle cx={x} cy={y} r={r} fill={`${rc}18`} stroke={rc} strokeWidth={isSel ? 2.5 : 1.5} />
              <circle cx={x} cy={y} r={4} fill={rc} />
              <text x={x} y={y - r - 5} textAnchor="middle" fill={nc} fontSize="8" fontWeight="bold">
                {n.label.length > 14 ? n.label.slice(0, 14) + "…" : n.label}
              </text>
              <text x={x} y={y + r + 10} textAnchor="middle" fill="#4a5568" fontSize="7">{n.type}</text>
            </g>
          );
        })}
      </svg>
      {sel !== null && nodes[sel] && (
        <div style={{ marginTop: 10, background: "#0d1626", borderRadius: 8, padding: 12, borderLeft: `3px solid ${riskColor(nodes[sel].exposure || "LOW")}` }}>
          <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 5 }}>{nodes[sel].label}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: NODE_TYPE_COLOR[nodes[sel].type] || "#6b7a8d", fontSize: 11 }}>{nodes[sel].type}</span>
            <span style={{ color: "#4a5568", fontSize: 11 }}>·</span>
            <span style={{ color: "#9ca3af", fontSize: 11 }}>{nodes[sel].visits_per_week}× / week</span>
            <span style={{ color: "#4a5568", fontSize: 11 }}>·</span>
            <BADGE text={nodes[sel].exposure || "LOW"} color={riskBadge(nodes[sel].exposure)} />
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        {Object.entries(NODE_TYPE_COLOR).map(([t, c]) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
            <span style={{ color: "#4a5568", fontSize: 9 }}>{t}</span>
          </div>
        ))}
        <span style={{ color: "#2d3f55", fontSize: 9, marginLeft: 6 }}>Node size = visit frequency</span>
      </div>
    </div>
  );
}

function AssociationGraph({ associations }) {
  const [sel, setSel] = useState(null);
  if (!associations?.length) return <div style={{ color: "#4a5568", padding: 16 }}>No association data available.</div>;
  const maxN = Math.min(associations.length, 8);
  const angles = Array.from({ length: maxN }, (_, i) => (2 * Math.PI * i) / maxN - Math.PI / 2);
  const cx = 220, cy = 150, r = 105;
  return (
    <div>
      <svg viewBox="0 0 440 300" style={{ width: "100%", background: "#070e1c", borderRadius: 10 }}>
        {associations.slice(0, maxN).map((a, i) => {
          const x = cx + r * Math.cos(angles[i]), y = cy + r * Math.sin(angles[i]);
          const nc = ASSOC_TYPE_COLOR[a.type] || "#6b7a8d";
          const rc = riskColor(a.risk || "LOW");
          const isSel = sel === i;
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={rc + "44"} strokeWidth="1.5" strokeDasharray="4 3" />
            </g>
          );
        })}
        {/* Center subject node */}
        <circle cx={cx} cy={cy} r={30} fill="#ff4d4d18" stroke="#ff4d4d" strokeWidth="2" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#ff4d4d" fontSize="8" fontWeight="bold">SUBJECT</text>
        <text x={cx} y={cy + 7} textAnchor="middle" fill="#ff4d4d" fontSize="7">HVT</text>
        {associations.slice(0, maxN).map((a, i) => {
          const x = cx + r * Math.cos(angles[i]), y = cy + r * Math.sin(angles[i]);
          const nc = ASSOC_TYPE_COLOR[a.type] || "#6b7a8d";
          const rc = riskColor(a.risk || "LOW");
          const isSel = sel === i;
          return (
            <g key={i} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: "pointer" }}>
              {isSel && <circle cx={x} cy={y} r={26} fill="none" stroke={nc} strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />}
              <circle cx={x} cy={y} r={isSel ? 22 : 19} fill={isSel ? `${nc}20` : "#0f1826"} stroke={nc} strokeWidth={isSel ? 2 : 1.5} />
              <circle cx={x} cy={y} r={isSel ? 6 : 4} fill={rc} />
              <text x={x} y={y - 27} textAnchor="middle" fill={nc} fontSize="8" fontWeight="bold">
                {a.name.slice(0, 12)}
              </text>
              <text x={x} y={y + 5} textAnchor="middle" fill="#6b7a8d" fontSize="6">{a.type}</text>
            </g>
          );
        })}
      </svg>
      {sel !== null && associations[sel] && (
        <div style={{ marginTop: 10, background: "#0d1626", borderRadius: 8, padding: 12, borderLeft: `3px solid ${ASSOC_TYPE_COLOR[associations[sel].type] || "#6b7a8d"}` }}>
          <div style={{ fontWeight: 700, color: "#e2e8f0", marginBottom: 5 }}>{associations[sel].name}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <BADGE text={associations[sel].type} color="blue" />
            <BADGE text={associations[sel].risk || "LOW"} color={riskBadge(associations[sel].risk)} />
            <span style={{ color: "#9ca3af", fontSize: 12 }}>Relation: <span style={{ color: "#ffd700" }}>{associations[sel].relation}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

function PatternRow({ r }) {
  const [hovered, setHovered] = useState(false);
  const expC = r.exposure === "HIGH" ? "#ff4d4d" : r.exposure === "MEDIUM" ? "#ffd700" : "#00ff9d";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", gap: 10, alignItems: "center", padding: "7px 10px",
        borderRadius: 6, background: hovered ? "#0f1a2e" : "transparent",
        borderLeft: `2px solid ${hovered ? expC : "transparent"}`,
        marginBottom: 4, transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ minWidth: 60, color: "#9ca3af", fontSize: 11 }}>{r.day}</div>
      <div style={{ minWidth: 48, color: "#e2e8f0", fontFamily: "monospace", fontSize: 11 }}>{r.time}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: hovered ? "#e2e8f0" : "#9ca3af", fontSize: 12, transition: "color 0.15s", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.location}</div>
        {r.activity && <div style={{ color: "#4a5568", fontSize: 11 }}>{r.activity}</div>}
      </div>
      <BADGE text={r.exposure} color={r.exposure === "HIGH" ? "red" : r.exposure === "MEDIUM" ? "yellow" : "green"} />
    </div>
  );
}

function BulletItem({ text, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", gap: 8, padding: "5px 8px", borderRadius: 5, background: hovered ? "#0f1a2e" : "transparent", transition: "background 0.15s", marginBottom: 4 }}>
      <span style={{ color, marginTop: 2, flexShrink: 0 }}>•</span>
      <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function PredictabilityGauge({ value }) {
  const r = 44, cx = 60, cy = 60;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const startAngle = -Math.PI * 0.8;
  const endAngle = Math.PI * 0.8;
  const angle = startAngle + pct * (endAngle - startAngle);
  const totalArc = endAngle - startAngle;
  const arcEnd = { x: cx + r * Math.cos(endAngle), y: cy + r * Math.sin(endAngle) };
  const arcStart = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
  const fillEnd = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  const color = pct > 0.75 ? "#ff4d4d" : pct > 0.5 ? "#ffd700" : "#00ff9d";
  const largeArc = pct * (endAngle - startAngle) > Math.PI ? 1 : 0;
  return (
    <svg viewBox="0 0 120 90" style={{ width: 130, height: 90 }}>
      <path d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`} fill="none" stroke="#1f2d45" strokeWidth="8" strokeLinecap="round" />
      {value > 0 && <path d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />}
      <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize="20" fontWeight="900">{value}%</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="#4a5568" fontSize="7" letterSpacing="1">PREDICTABILITY</text>
      <text x={cx} y={cy - 40} textAnchor="middle" fill="#2d3f55" fontSize="7">100</text>
      <text x={cx - r - 4} y={cy + 10} textAnchor="middle" fill="#2d3f55" fontSize="7">0</text>
      <text x={cx + r + 4} y={cy + 10} textAnchor="middle" fill="#2d3f55" fontSize="7">100</text>
    </svg>
  );
}

export default function PatLife() {
  const [apiKey] = useApiKey();
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const { stamp } = useLastAnalysis("patlife");
  function handleKey(e) { if (e.ctrlKey && e.key === "Enter") analyze(); }

  async function analyze() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!subject) { setError("Enter a subject identifier."); return; }
    setError(""); setLoading(true); setResult(null); setTab("overview");
    try {
      const r = await callClaude(apiKey, `You are a senior intelligence analyst. Perform a pattern-of-life analysis for the subject below. Return ONLY a JSON object (no markdown, no backticks).

Subject: ${subject}

Return exactly this JSON:
{
  "predictability": 0_to_100,
  "risk_assessment": "LOW|MEDIUM|HIGH|CRITICAL",
  "sources_count": number,
  "high_exposure_events": number,
  "intelligence_summary": "2-3 sentence assessment",
  "routine_patterns": [
    {"day": "e.g. Mon–Fri", "time": "HH:MM", "location": "string", "exposure": "LOW|MEDIUM|HIGH", "activity": "string"}
  ],
  "heatmap": [[0or1 × 7days] × 6timeSlots],
  "vulnerabilities": ["string"],
  "counter_surveillance_indicators": ["string"],
  "anomalies": [
    {"date": "string", "description": "string", "significance": "LOW|MEDIUM|HIGH"}
  ],
  "associations": [
    {"name": "string", "type": "Person|Vehicle|Location|Organization", "relation": "string", "risk": "LOW|MEDIUM|HIGH|CRITICAL"}
  ],
  "movement_nodes": [
    {"label": "string", "type": "Residential|Work|Transit|Recreation|Unknown", "visits_per_week": 1_to_7, "exposure": "LOW|MEDIUM|HIGH", "x": 0_to_100, "y": 0_to_100}
  ],
  "movement_edges": [
    {"from": nodeIndex, "to": nodeIndex, "frequency": "Daily|Regular|Occasional", "time_typical": "string"}
  ]
}

Include: 5-7 routine patterns, 6×7 heatmap (6 time slots: 06-09 09-12 12-15 15-18 18-21 21-24 × 7 days), 2-4 anomalies, 4-6 associations, 4-7 movement nodes with varied x/y 0-100 coordinates spread across the map, and movement edges linking nodes.`);
      setResult(r); stamp();
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader icon="📍" title="Pattern-of-Life Analyzer" sub="Spatio-temporal behaviour reconstruction, movement mapping, and association network analysis." accent="#4db8ff" dataMode="ai" />

      <Card>
        <Input label="🎯 Subject Identifier" value={subject} onChange={setSubject}
          placeholder="Subject Alpha, plate LK-4422, @username, vessel MMSI, IP address..."
          maxLength={200} onClear={() => { setSubject(""); setResult(null); }} onKeyDown={handleKey}
          hint="Ctrl+Enter to analyze" />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn onClick={analyze} disabled={loading}>{loading ? "⏳ Analyzing..." : "📍 Analyze Pattern-of-Life"}</Btn>
          <LastAnalysisTag toolId="patlife" />
        </div>
      </Card>

      {result && (
        <>
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))", gap: 10, marginBottom: 12 }}>
            {[
              ["Risk",               result.risk_assessment,              riskColor(result.risk_assessment)],
              ["Sources",            String(result.sources_count),         "#4db8ff"],
              ["High-Exposure",      String(result.high_exposure_events),  "#ffd700"],
              ["Anomalies",          String(result.anomalies?.length || 0), "#ff9d00"],
              ["Associations",       String(result.associations?.length || 0), "#b47fff"],
            ].map(([l, v, c]) => (
              <Card key={l} style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: v.length > 6 ? 14 : 22, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ color: "#4a5568", fontSize: 11, marginTop: 4, letterSpacing: 0.5 }}>{l}</div>
              </Card>
            ))}
          </div>

          {/* Intelligence summary */}
          <Card style={{ borderLeft: `3px solid ${riskColor(result.risk_assessment)}`, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <ST icon="🧠" label="Intelligence Summary" color="#4db8ff" />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <BADGE text={result.risk_assessment} color={riskBadge(result.risk_assessment)} />
                <ExportBtn data={result} filename={`sentinel-patlife-${subject.replace(/\s/g, "-").slice(0, 20)}`} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <PredictabilityGauge value={result.predictability} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.65 }}>{result.intelligence_summary}</div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1f2d45", marginBottom: 14, overflowX: "auto" }}>
            {[
              { id: "overview",     label: "🗓️ Heatmap",       color: "#4db8ff"  },
              { id: "movement",     label: "🗺️ Movement Map",  color: "#ff9d00"  },
              { id: "associations", label: "🕸️ Associations",  color: "#b47fff"  },
              { id: "anomalies",    label: "⚠️ Anomalies",     color: "#ff4d4d"  },
              { id: "intel",        label: "🛡️ Intel",         color: "#00ff9d"  },
            ].map(({ id, label, color }) => (
              <button key={id} onClick={() => setTab(id)} style={tabStyle(tab === id, color)}>{label}</button>
            ))}
          </div>

          {tab === "overview" && (
            <div>
              <Card>
                <ST icon="🗓️" label="Activity Heatmap" color="#4db8ff" sub="Time slot × day · hover cells for detail" style={{ marginBottom: 14 }} />
                {result.heatmap && <HeatmapGrid heatmap={result.heatmap} />}
              </Card>
              <Card>
                <ST icon="🕐" label="Routine Pattern Timeline" color="#ffd700" sub={`${result.routine_patterns?.length || 0} patterns identified`} style={{ marginBottom: 8 }} />
                <div style={{ borderTop: "1px solid #0d1626", paddingTop: 8 }}>
                  {result.routine_patterns?.map((r, i) => <PatternRow key={i} r={r} />)}
                </div>
              </Card>
            </div>
          )}

          {tab === "movement" && (
            <Card>
              <ST icon="🗺️" label="Movement & Location Map" color="#ff9d00" sub="Location nodes · edge thickness = frequency · click node for details" style={{ marginBottom: 12 }} />
              <MovementMap nodes={result.movement_nodes} edges={result.movement_edges} patterns={result.routine_patterns} />
            </Card>
          )}

          {tab === "associations" && (
            <Card>
              <ST icon="🕸️" label="Association Network" color="#b47fff" sub={`${result.associations?.length || 0} entities linked to subject`} style={{ marginBottom: 12 }} />
              <AssociationGraph associations={result.associations} />
              <div style={{ marginTop: 14 }}>
                {result.associations?.map((a, i) => {
                  const nc = ASSOC_TYPE_COLOR[a.type] || "#6b7a8d";
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "8px 10px", borderRadius: 6, borderLeft: `2px solid ${nc}`, marginBottom: 5, background: "#0d1626" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{a.name}</div>
                        <div style={{ color: "#4a5568", fontSize: 11 }}>{a.relation}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <BADGE text={a.type} color="blue" />
                        <BADGE text={a.risk || "LOW"} color={riskBadge(a.risk)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {tab === "anomalies" && (
            <Card>
              <ST icon="⚠️" label="Behavioural Anomalies" color="#ff4d4d" sub="Deviations from established pattern baseline" style={{ marginBottom: 14 }} />
              {result.anomalies?.length > 0 ? result.anomalies.map((a, i) => {
                const c = ANOM_COLOR[a.significance] || "#ffd700";
                return (
                  <div key={i} style={{ background: `${c}0a`, border: `1px solid ${c}33`, borderLeft: `3px solid ${c}`, borderRadius: 7, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ color: c, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>{a.significance} SIGNIFICANCE</span>
                      <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "monospace" }}>{a.date}</span>
                    </div>
                    <div style={{ color: "#c9d1da", fontSize: 12, lineHeight: 1.5 }}>{a.description}</div>
                  </div>
                );
              }) : <div style={{ color: "#4a5568", fontSize: 13, padding: 8 }}>No anomalies detected.</div>}
            </Card>
          )}

          {tab === "intel" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
              <Card>
                <ST icon="⚠️" label="Vulnerabilities" color="#ff4d4d" style={{ marginBottom: 8 }} />
                {result.vulnerabilities?.map((v, i) => <BulletItem key={i} text={v} color="#ff4d4d" />)}
              </Card>
              <Card>
                <ST icon="👁️" label="Counter-Surveillance Indicators" color="#ffd700" style={{ marginBottom: 8 }} />
                {result.counter_surveillance_indicators?.map((c, i) => <BulletItem key={i} text={c} color="#ffd700" />)}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
