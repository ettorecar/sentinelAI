import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1400, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
}

const days  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const slots = ["06–09","09–12","12–15","15–18","18–21","21–24"];

const expColor = e => e === "HIGH" ? "red" : e === "MEDIUM" ? "yellow" : "green";
const riskColor = r => r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";

// Time-slot color: morning=yellow, midday=orange, evening=red, night=blue
const slotAccent = i => ["#ffd700","#ff9d00","#ff9d00","#ff4d4d","#ff4d4d","#4db8ff"][i] || "#4db8ff";

function HeatmapCell({ active, slotIdx, day, slot }) {
  const [hovered, setHovered] = useState(false);
  const ac = slotAccent(slotIdx);
  return (
    <td style={{ padding: 2, position: "relative" }}>
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
  // Row totals (active days per slot)
  const rowTotals = slots.map((_, si) => days.reduce((s, _, di) => s + (heatmap[si]?.[di] === 1 ? 1 : 0), 0));
  // Column totals (active slots per day)
  const colTotals = days.map((_, di) => slots.reduce((s, _, si) => s + (heatmap[si]?.[di] === 1 ? 1 : 0), 0));
  const maxRow = Math.max(...rowTotals, 1);
  const maxCol = Math.max(...colTotals, 1);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ color: "#4a5568", padding: "2px 8px", fontWeight: 400, textAlign: "left", fontSize: 10, minWidth: 52 }}></th>
            {days.map((d, di) => (
              <th key={d} style={{ color: colTotals[di] > 0 ? "#e2e8f0" : "#4a5568", padding: "2px 2px 6px", fontWeight: colTotals[di] > 0 ? 700 : 400, minWidth: 38, textAlign: "center", fontSize: 11 }}>{d}</th>
            ))}
            <th style={{ color: "#4a5568", padding: "2px 8px", fontSize: 9, letterSpacing: 1 }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s, si) => (
            <tr key={s}>
              <td style={{ color: rowTotals[si] > 0 ? slotAccent(si) : "#4a5568", padding: "2px 8px", fontSize: 10, whiteSpace: "nowrap", fontWeight: rowTotals[si] > 0 ? 700 : 400 }}>{s}</td>
              {days.map((d, di) => (
                <HeatmapCell key={di} active={heatmap[si]?.[di] === 1} slotIdx={si} day={d} slot={s} />
              ))}
              <td style={{ padding: "2px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ height: 8, borderRadius: 2, background: slotAccent(si), width: Math.max(4, (rowTotals[si] / maxRow) * 40) }} />
                  <span style={{ color: slotAccent(si), fontSize: 10, fontWeight: 700 }}>{rowTotals[si]}</span>
                </div>
              </td>
            </tr>
          ))}
          {/* Column totals row */}
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
      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        {[["Morning (06–09)", 0],["Midday (09–15)", 1],["Afternoon (15–18)", 3],["Evening (18–21)", 4],["Night (21–24)", 5]].map(([label, idx]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: slotAccent(idx) }} />
            <span style={{ color: "#4a5568", fontSize: 10 }}>{label}</span>
          </div>
        ))}
      </div>
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
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "7px 10px",
        borderRadius: 6,
        background: hovered ? "#0f1a2e" : "transparent",
        borderLeft: `2px solid ${hovered ? expC : "transparent"}`,
        marginBottom: 4,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ minWidth: 60, color: "#9ca3af", fontSize: 11 }}>{r.day}</div>
      <div style={{ minWidth: 48, color: "#e2e8f0", fontFamily: "monospace", fontSize: 11 }}>{r.time}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: hovered ? "#e2e8f0" : "#9ca3af", fontSize: 12, transition: "color 0.15s" }}>{r.location}</div>
        {r.activity && <div style={{ color: "#4a5568", fontSize: 11 }}>{r.activity}</div>}
      </div>
      <BADGE text={r.exposure} color={expColor(r.exposure)} />
    </div>
  );
}

function BulletItem({ text, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", gap: 8, padding: "5px 8px", borderRadius: 5,
        background: hovered ? "#0f1a2e" : "transparent",
        transition: "background 0.15s",
        marginBottom: 4,
      }}
    >
      <span style={{ color, marginTop: 2, flexShrink: 0 }}>•</span>
      <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

export default function PatLife() {
  const [apiKey] = useApiKey();
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { stamp } = useLastAnalysis("patlife");
  function handleKey(e) { if (e.ctrlKey && e.key === "Enter") analyze(); }

  async function analyze() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!subject) { setError("Enter a subject identifier."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const prompt = `You are a senior intelligence analyst performing a pattern-of-life analysis for a government surveillance operation. Generate a realistic spatio-temporal behaviour reconstruction for the following subject identifier. Return ONLY a JSON object (no markdown, no backticks, no commentary).

Subject identifier: ${subject}

Return exactly this JSON structure:
{
  "predictability": number_0_to_100,
  "risk_assessment": "LOW|MEDIUM|HIGH|CRITICAL",
  "sources_count": number,
  "high_exposure_events": number,
  "intelligence_summary": "string (2-3 sentence assessment)",
  "routine_patterns": [
    {"day": "string e.g. Mon–Fri", "time": "HH:MM", "location": "string", "exposure": "LOW|MEDIUM|HIGH", "activity": "string"}
  ],
  "heatmap": [[number 0 or 1 for each of 7 days], ...repeat for 6 time slots],
  "vulnerabilities": ["string"],
  "counter_surveillance_indicators": ["string"]
}

Include 5-7 routine patterns. The heatmap must be a 6×7 matrix (6 time slots × 7 days) with 0 or 1 values.`;
      setResult(await callClaude(apiKey, prompt)); stamp();
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader icon="📍" title="Pattern-of-Life Analyzer" sub="Spatio-temporal behaviour reconstruction and exposure analysis." accent="#4db8ff" dataMode="ai" />

      <Card>
        <Input label="🎯 Subject Identifier" value={subject} onChange={setSubject} placeholder="Subject Alpha, plate LK-4422, @username, IP 91.x.x.x..." maxLength={200} onClear={() => setSubject("")} onKeyDown={handleKey} hint="Ctrl+Enter per avviare analisi" />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn onClick={analyze} disabled={loading}>{loading ? "⏳ Analyzing..." : "Analyze Pattern-of-Life"}</Btn>
          <LastAnalysisTag toolId="patlife" />
        </div>
      </Card>

      {result && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <ExportBtn data={result} filename={`sentinel-patlife-${subject.replace(/\s/g,"-").slice(0,20)}`} />
          </div>
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 120px), 1fr))", gap: 10, marginBottom: 12 }}>
            {[
              ["Predictability",     `${result.predictability}%`,       "#ff4d4d"],
              ["Sources",            String(result.sources_count),        "#4db8ff"],
              ["High-Exposure Events",String(result.high_exposure_events),"#ffd700"],
            ].map(([l, v, c]) => (
              <Card key={l} style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ color: "#4a5568", fontSize: 11, marginTop: 4, letterSpacing: 0.5 }}>{l}</div>
              </Card>
            ))}
          </div>

          {/* Intelligence summary */}
          <Card style={{ borderColor: riskColor(result.risk_assessment) + "44", borderLeft: `3px solid ${riskColor(result.risk_assessment)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <ST icon="🧠" label="Intelligence Summary" color="#4db8ff" />
              <BADGE text={result.risk_assessment}
                color={result.risk_assessment === "CRITICAL" || result.risk_assessment === "HIGH" ? "red" : result.risk_assessment === "MEDIUM" ? "yellow" : "green"} />
            </div>
            <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.65 }}>{result.intelligence_summary}</div>
          </Card>

          {/* Activity heatmap */}
          {result.heatmap && (
            <Card>
              <ST icon="🗓️" label="Activity Heatmap" color="#4db8ff" sub="Time slot × day — hover for details" />
              <HeatmapGrid heatmap={result.heatmap} />
            </Card>
          )}

          {/* Routine patterns */}
          <Card>
            <ST icon="🕐" label="Routine Pattern Timeline" color="#4db8ff" sub={`${result.routine_patterns?.length} patterns identified`} />
            <div style={{ borderTop: "1px solid #0d1626", paddingTop: 8 }}>
              {result.routine_patterns?.map((r, i) => (
                <PatternRow key={i} r={r} />
              ))}
            </div>
          </Card>

          {/* Vulnerabilities & counter-surveillance */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
            <Card>
              <ST icon="⚠️" label="Vulnerabilities" color="#ff4d4d" />
              {result.vulnerabilities?.map((v, i) => (
                <BulletItem key={i} text={v} color="#ff4d4d" />
              ))}
            </Card>
            <Card>
              <ST icon="👁️" label="Counter-Surveillance Indicators" color="#ffd700" />
              {result.counter_surveillance_indicators?.map((c, i) => (
                <BulletItem key={i} text={c} color="#ffd700" />
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
