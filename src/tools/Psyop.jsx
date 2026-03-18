import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, LiveBadge, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { RC } from "../constants";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1600, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
}

function tabStyle(active, color = "#b47fff") {
  return {
    padding: "6px 14px", borderRadius: "5px 5px 0 0", fontSize: 12, fontWeight: active ? 700 : 500,
    cursor: "pointer", border: "none", outline: "none", background: "transparent",
    color: active ? color : "#4a5568",
    borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
  };
}

function TechniqueItem({ t }) {
  const [hovered, setHovered] = useState(false);
  const color = RC[t.severity] || "#555";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 7, padding: "10px 12px", marginBottom: 7,
        border: `1px solid ${hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${color}`,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ fontWeight: 700, color: hovered ? "#ffffff" : "#e2e8f0", fontSize: 13 }}>{t.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: "#ffd700", fontSize: 12, fontWeight: 700 }}>{t.val}%</span>
          <BADGE text={t.severity} color={t.severity === "HIGH" ? "red" : t.severity === "MEDIUM" ? "yellow" : "green"} />
        </div>
      </div>
      <div style={{ background: "#111827", borderRadius: 3, height: 5, marginBottom: 5 }}>
        <div style={{ background: color, height: 5, borderRadius: 3, width: `${t.val}%`, transition: "width 0.4s" }} />
      </div>
      <div style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5 }}>{t.desc}</div>
    </div>
  );
}

// E2 — radar chart config (6 PSYOP psychological axes)
const PSYOP_DIMS = [
  { key: "fear",          label: "Fear" },
  { key: "outrage",       label: "Outrage" },
  { key: "polarization",  label: "Polariz." },
  { key: "confusion",     label: "Confusion" },
  { key: "trust_erosion", label: "Trust Erosion" },
  { key: "social_proof",  label: "Social Proof" },
];

// E2 — Hexagonal radar chart SVG
function RadarChart({ dims }) {
  const n = PSYOP_DIMS.length;
  const cx = 100, cy = 100, R = 72;
  const angle = i => (i / n) * 2 * Math.PI - Math.PI / 2;
  const pt = (ang, r) => [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];

  const values = PSYOP_DIMS.map(d => (dims?.[d.key] ?? 0) / 100);
  const polyPts = values.map((v, i) => pt(angle(i), R * v).join(",")).join(" ");

  return (
    <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 200, height: "auto" }}>
      {[0.25, 0.5, 0.75, 1.0].map((ring, ri) => (
        <polygon key={ri}
          points={PSYOP_DIMS.map((_, i) => pt(angle(i), R * ring).join(",")).join(" ")}
          fill="none"
          stroke={ri === 3 ? "#1f2d45" : "#111d2e"}
          strokeWidth={ri === 3 ? "1" : "0.6"}
        />
      ))}
      {[25, 50, 75].map(v => (
        <text key={v} x={cx + 3} y={cy - (v / 100) * R + 3}
          fill="#2d3f55" fontSize="6" textAnchor="start">{v}</text>
      ))}
      {PSYOP_DIMS.map((_, i) => {
        const [x, y] = pt(angle(i), R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#1f2d45" strokeWidth="0.8" />;
      })}
      <polygon points={polyPts} fill="#b47fff22" stroke="#b47fff" strokeWidth="1.5" />
      {values.map((v, i) => {
        const [x, y] = pt(angle(i), R * v);
        return <circle key={i} cx={x} cy={y} r="3" fill="#b47fff" />;
      })}
      {PSYOP_DIMS.map((d, i) => {
        const [x, y] = pt(angle(i), R + 15);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill="#9ca3af" fontSize="7.5" fontWeight="600">
            {d.label}
          </text>
        );
      })}
      <circle cx={cx} cy={cy} r="3" fill="#b47fff" opacity="0.5" />
    </svg>
  );
}

// E2 — Target demographic horizontal bars
function DemographicBars({ demographics }) {
  if (!demographics?.length) return null;
  const DEMO_COLORS = ["#b47fff", "#9d6de0", "#7a52b3", "#5e3d8a"];
  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>TARGET DEMOGRAPHICS</div>
      {demographics.map((d, i) => (
        <div key={i} style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "#e2e8f0", fontSize: 11 }}>{d.group}</span>
            <span style={{ color: DEMO_COLORS[i % DEMO_COLORS.length], fontSize: 11, fontWeight: 700 }}>{d.intensity}%</span>
          </div>
          <div style={{ background: "#1f2d45", borderRadius: 3, height: 6 }}>
            <div style={{ background: DEMO_COLORS[i % DEMO_COLORS.length], height: 6, borderRadius: 3, width: `${d.intensity}%`, transition: "width 0.6s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// NEW: Vulnerability arc gauge
function VulnerabilityGauge({ value }) {
  if (value === undefined || value === null) return null;
  const W = 160, H = 96;
  const cx = W / 2, cy = H - 10;
  const R = 68;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const totalArc = endAngle - startAngle;
  const filled = (value / 100) * totalArc;

  const arcPt = (ang) => [
    cx + R * Math.cos(ang),
    cy + R * Math.sin(ang),
  ];

  const [sx, sy] = arcPt(startAngle);
  const [ex, ey] = arcPt(startAngle + filled);
  const [bx, by] = arcPt(endAngle);

  const bgArcD = `M ${sx},${sy} A ${R},${R} 0 1 1 ${bx},${by}`;
  const fgArcD = filled > 0
    ? `M ${sx},${sy} A ${R},${R} 0 ${filled > Math.PI ? 1 : 0} 1 ${ex},${ey}`
    : "";

  const color = value >= 75 ? "#ff4d4d" : value >= 45 ? "#ffd700" : "#00ff9d";
  const label = value >= 75 ? "HIGH" : value >= 45 ? "MEDIUM" : "LOW";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>VULNERABILITY INDEX</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }}>
        <path d={bgArcD} fill="none" stroke="#1f2d45" strokeWidth="10" strokeLinecap="round" />
        {fgArcD && (
          <path d={fgArcD} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
        )}
        <text x={cx} y={cy - 14} textAnchor="middle" fill={color} fontSize="24" fontWeight="900">{value}</text>
        <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize="9" fontWeight="700">{label}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="#4a5568" fontSize="8">VULNERABILITY</text>
        <text x={cx - R - 4} y={cy + 4} textAnchor="middle" fill="#2d3f55" fontSize="8">0</text>
        <text x={cx + R + 4} y={cy + 4} textAnchor="middle" fill="#2d3f55" fontSize="8">100</text>
      </svg>
    </div>
  );
}

// NEW: Message lifecycle phase chart
function MessageLifecycleChart({ phases }) {
  if (!phases?.length) return null;
  const PHASE_COLORS = {
    "Inception":     "#4db8ff",
    "Amplification": "#ffd700",
    "Saturation":    "#ff4d4d",
    "Decay":         "#4a5568",
  };

  const totalDays = phases.reduce((s, p) => s + (p.duration_days || 1), 0);
  const W = 380, H = 60;
  let xCursor = 0;

  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>MESSAGE LIFECYCLE — PHASE INTENSITY</div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H + 28}`} style={{ width: "100%", minWidth: 280, height: H + 28 }}>
          {/* Guide lines */}
          {[0, 50, 100].map(v => (
            <line key={v} x1={0} y1={H - (v / 100) * H} x2={W} y2={H - (v / 100) * H}
              stroke="#1f2d45" strokeWidth="0.4" />
          ))}

          {phases.map((phase, i) => {
            const pw = (phase.duration_days / totalDays) * W;
            const ph = (phase.intensity / 100) * H;
            const color = PHASE_COLORS[phase.phase] || "#4db8ff";
            const x = xCursor;
            xCursor += pw;

            return (
              <g key={i}>
                <rect x={x} y={H - ph} width={pw} height={ph}
                  fill={color} opacity="0.25" />
                <rect x={x} y={H - ph} width={pw} height={2}
                  fill={color} opacity="0.9" />
                {/* Phase label */}
                <text x={x + pw / 2} y={H + 12}
                  textAnchor="middle" fill={color} fontSize="7.5" fontWeight="700">
                  {phase.phase}
                </text>
                <text x={x + pw / 2} y={H + 22}
                  textAnchor="middle" fill="#4a5568" fontSize="6.5">
                  {phase.duration_days}d
                </text>
                {/* Intensity label inside bar if tall enough */}
                {ph > 18 && (
                  <text x={x + pw / 2} y={H - ph + 12}
                    textAnchor="middle" fill={color} fontSize="8" fontWeight="700">
                    {phase.intensity}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
        {phases.map(p => (
          <div key={p.phase} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: PHASE_COLORS[p.phase] || "#4db8ff" }} />
            <span style={{ color: "#9ca3af", fontSize: 10 }}>{p.phase}</span>
            <span style={{ color: PHASE_COLORS[p.phase] || "#4db8ff", fontSize: 10, fontWeight: 700 }}>{p.intensity}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// NEW: Counter-PSYOP measures panel
function CountermeasuresPanel({ items }) {
  if (!items?.length) return (
    <div style={{ color: "#4a5568", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
      No countermeasures in analysis results.
    </div>
  );
  const priorityColor = p => p === "HIGH" ? "#ff4d4d" : p === "MEDIUM" ? "#ffd700" : "#4db8ff";
  const typeIcon = t => ({
    "prebunking": "🛡️",
    "inoculation": "💉",
    "counter-narrative": "💬",
    "platform-action": "📱",
  }[t] || "⚡");

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{
          background: "#0d1626", borderRadius: 7, padding: "10px 12px", marginBottom: 8,
          border: "1px solid #1f2d45", borderLeft: `3px solid ${priorityColor(item.priority)}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 14 }}>{typeIcon(item.type)}</span>
              <span style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 700 }}>
                {(item.type || "").toUpperCase().replace("-", " ")}
              </span>
            </div>
            <span style={{ color: priorityColor(item.priority), fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
              {item.priority}
            </span>
          </div>
          <div style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.6 }}>{item.action}</div>
        </div>
      ))}
    </div>
  );
}

export default function Psyop() {
  const [apiKey] = useApiKey();
  const [content, setContent] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("detection");
  const { stamp } = useLastAnalysis("psyop");
  function handleKey(e) { if (e.ctrlKey && e.key === "Enter") analyze(); }

  async function analyze() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!content) { setError("Paste content to analyze."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const prompt = `You are a senior PSYOP analyst for a NATO intelligence unit. Analyze the following content for psychological operation techniques used to influence target audiences. Return ONLY a JSON object (no markdown, no backticks, no commentary).

Content to analyze:
${content}

Return exactly this JSON structure:
{"detected":true|false,"confidence":number_0_to_100,"target_effect":"string describing intended psychological effect on audience","origin":"string e.g. State-sponsored influence op, Hacktivist collective, Commercial propaganda, Unknown","techniques":[{"name":"string","desc":"string explaining the technique","severity":"HIGH|MEDIUM|LOW","val":number_0_to_100}],"dimensions":{"fear":0-100,"outrage":0-100,"polarization":0-100,"confusion":0-100,"trust_erosion":0-100,"social_proof":0-100},"demographics":[{"group":"string describing target segment","intensity":0-100}],"vulnerability_index":number_0_to_100,"message_lifecycle":[{"phase":"Inception|Amplification|Saturation|Decay","intensity":number_0_to_100,"duration_days":number}],"countermeasures":[{"action":"string describing a specific counter-PSYOP action","type":"prebunking|inoculation|counter-narrative|platform-action","priority":"HIGH|MEDIUM|LOW"}]}

Include 3-5 techniques, 3-4 demographics, all 4 lifecycle phases in order, and 3-4 countermeasures. vulnerability_index is a composite 0-100 score of how susceptible the target audience is to this operation.`;
      setResult(await callClaude(apiKey, prompt)); stamp(); setTab("detection");
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  const TABS = [
    { id: "detection", label: "Detection" },
    { id: "techniques", label: "Techniques" },
    { id: "radar", label: "Dimensions" },
    { id: "lifecycle", label: "Lifecycle" },
    { id: "counter", label: "Countermeasures" },
  ];

  return (
    <div>
      <PageHeader icon="🧠" title="PSYOP Content Analyzer" sub="Identify psychological operation techniques in media and influence campaigns." accent="#b47fff" dataMode="ai" />

      <Card>
        <Input label="📄 Content" value={content} onChange={setContent} placeholder="Paste text, article, broadcast transcript..." rows={5} maxLength={3000} onKeyDown={handleKey} hint="Ctrl+Enter per analizzare" />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn onClick={analyze} disabled={loading}>{loading ? "⏳ Analyzing..." : "Analyze for PSYOP"}</Btn>
          <LastAnalysisTag toolId="psyop" />
        </div>
      </Card>

      {result && (
        <>
          {/* Tab navigation */}
          <div style={{ display: "flex", borderBottom: "1px solid #1f2d45", marginBottom: 14, gap: 2, flexWrap: "wrap" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>
            ))}
          </div>

          {tab === "detection" && (
            <Card style={{ borderColor: result.detected ? "#ff4d4d55" : "#00ff9d55", borderLeft: `3px solid ${result.detected ? "#ff4d4d" : "#00ff9d"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>PSYOP DETECTION</div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: result.detected ? "#ff4d4d" : "#00ff9d" }}>
                    {result.detected ? "PSYOP DETECTED" : "NO PSYOP DETECTED"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <ExportBtn data={result} filename="sentinel-psyop" />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>CONFIDENCE</div>
                    <div style={{ color: "#ffd700", fontWeight: 800, fontSize: 26, lineHeight: 1 }}>{result.confidence}%</div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#0d1626", borderRadius: 3, height: 6, marginBottom: 12 }}>
                <div style={{ background: result.detected ? "#ff4d4d" : "#00ff9d", height: 6, borderRadius: 3, width: `${result.confidence}%`, transition: "width 0.4s" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 10, marginBottom: 14 }}>
                <div style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px" }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>TARGET EFFECT</div>
                  <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{result.target_effect}</div>
                </div>
                <div style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px" }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>ATTRIBUTED ORIGIN</div>
                  <div style={{ color: "#ffd700", fontSize: 12, lineHeight: 1.5 }}>{result.origin}</div>
                </div>
              </div>

              {/* Vulnerability gauge inline */}
              {result.vulnerability_index !== undefined && (
                <div style={{ borderTop: "1px solid #1f2d45", paddingTop: 14 }}>
                  <VulnerabilityGauge value={result.vulnerability_index} />
                </div>
              )}
            </Card>
          )}

          {tab === "techniques" && result.techniques?.length > 0 && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <ST icon="🎭" label="PSYOP Techniques" color="#ff4d4d" sub={`${result.techniques.length} techniques identified`} />
                <LiveBadge />
              </div>
              {result.techniques.map((t, i) => (
                <TechniqueItem key={i} t={t} />
              ))}
            </Card>
          )}

          {tab === "radar" && result.dimensions && (
            <Card>
              <ST icon="🎯" label="Psychological Axes & Target Demographics" color="#b47fff"
                sub="6-axis influence radar · audience segmentation" style={{ marginBottom: 14 }} />
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>
                    PSYOP DIMENSIONS RADAR
                  </div>
                  <RadarChart dims={result.dimensions} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px", marginTop: 4 }}>
                    {PSYOP_DIMS.map(d => (
                      <div key={d.key} style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                        <span style={{ color: "#4a5568", fontSize: 9 }}>{d.label}</span>
                        <span style={{ color: "#b47fff", fontSize: 9, fontWeight: 700 }}>{result.dimensions?.[d.key] ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <DemographicBars demographics={result.demographics} />
                </div>
              </div>
            </Card>
          )}

          {tab === "lifecycle" && (
            <Card>
              <ST icon="📈" label="Message Lifecycle Analysis" color="#b47fff"
                sub="Propagation phases · intensity over time" style={{ marginBottom: 14 }} />
              <MessageLifecycleChart phases={result.message_lifecycle} />
              {!result.message_lifecycle?.length && (
                <div style={{ color: "#4a5568", fontSize: 12 }}>No lifecycle data available.</div>
              )}
            </Card>
          )}

          {tab === "counter" && (
            <Card>
              <ST icon="🛡️" label="Counter-PSYOP Strategies" color="#00ff9d"
                sub="AI-generated defensive measures by type and priority" style={{ marginBottom: 14 }} />
              <CountermeasuresPanel items={result.countermeasures} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
