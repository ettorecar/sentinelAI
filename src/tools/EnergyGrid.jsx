import { useState, useEffect } from "react";
import { BADGE, Card, Btn, ST, PageHeader, LiveBadge, riskColor, riskBadgeColor } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

function ScenarioCard({ s, active, onClick, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? "#1a1200" : hovered ? "#0f1a2e" : "#0d1626",
        border: `1px solid ${active ? "#ff9d00" : hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderRadius: 8, padding: 14, cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </div>
  );
}

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
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

// Economic impact sector bars
function EconomicImpactChart({ impact }) {
  if (!impact) return null;
  const sectors = impact.affected_sectors || [];
  const sevColor = s => s === "CRITICAL" ? "#ff4d4d" : s === "HIGH" ? "#ffd700" : "#4db8ff";
  return (
    <div>
      {impact.estimate_bn_eur !== undefined && (
        <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ background: "#0a1628", borderRadius: 7, padding: "10px 16px", flex: 1 }}>
            <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>ESTIMATED ECONOMIC LOSS</div>
            <div style={{ color: "#ff4d4d", fontSize: 24, fontWeight: 900 }}>€{impact.estimate_bn_eur}B</div>
          </div>
          {impact.affected_population_pct !== undefined && (
            <div style={{ background: "#0a1628", borderRadius: 7, padding: "10px 16px", flex: 1 }}>
              <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>POPULATION AFFECTED</div>
              <div style={{ color: "#ffd700", fontSize: 24, fontWeight: 900 }}>{impact.affected_population_pct}%</div>
            </div>
          )}
        </div>
      )}
      {sectors.length > 0 && (
        <>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>SECTOR IMPACT BREAKDOWN</div>
          {sectors.map((s, i) => {
            const color = sevColor(s.severity);
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ color: "#e2e8f0", fontSize: 11 }}>{s.sector}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color, fontSize: 10, fontWeight: 700 }}>{s.severity}</span>
                    <span style={{ color, fontSize: 11, fontWeight: 700 }}>{s.impact_pct}%</span>
                  </div>
                </div>
                <div style={{ background: "#1f2d45", borderRadius: 3, height: 7 }}>
                  <div style={{ background: color, height: 7, borderRadius: 3, width: `${s.impact_pct}%`, transition: "width 0.8s" }} />
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// Recovery phase horizontal timeline
function RecoveryPhaseTimeline({ phases }) {
  if (!phases?.length) return null;
  const PHASE_COLORS = ["#ff4d4d", "#ffd700", "#4db8ff", "#00ff9d"];
  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>RECOVERY PHASES</div>
      {phases.map((phase, i) => {
        const color = PHASE_COLORS[i % PHASE_COLORS.length];
        const priorityColor = phase.priority === "CRITICAL" ? "#ff4d4d" : phase.priority === "HIGH" ? "#ffd700" : "#4db8ff";
        return (
          <div key={i} style={{
            background: "#0d1626", borderRadius: 7, padding: "10px 12px", marginBottom: 8,
            border: "1px solid #1f2d45", borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color, fontSize: 12, fontWeight: 700 }}>{phase.phase}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {phase.priority && <span style={{ color: priorityColor, fontSize: 9, fontWeight: 700 }}>{phase.priority}</span>}
                <span style={{ color: "#ffd700", fontSize: 11 }}>{phase.duration}</span>
              </div>
            </div>
            {phase.actions?.map((action, ai) => (
              <div key={ai} style={{ color: "#9ca3af", fontSize: 11, marginBottom: 2 }}>• {action}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const COUNTRIES = ["Germany", "France", "Italy", "Poland", "Ukraine", "UK"];

const GRID_DATA = {
  Germany: {
    capacity_gw: 220, renewables_pct: 58, fossil_pct: 24, nuclear_pct: 0, import_pct: 18,
    nodes: [
      { id: "N-DE-01", name: "Nord Grid Hub",       type: "Transmission", load: 87, risk: "HIGH",     x: 148, y: 60  },
      { id: "N-DE-02", name: "Ruhr Industrial Zone",type: "Load Centre",  load: 94, risk: "CRITICAL", x: 110, y: 105 },
      { id: "N-DE-03", name: "Bavaria South",        type: "Generation",  load: 62, risk: "MEDIUM",   x: 155, y: 170 },
      { id: "N-DE-04", name: "East Interconnect",   type: "Interconnect", load: 71, risk: "HIGH",     x: 210, y: 100 },
      { id: "N-DE-05", name: "Offshore Wind Hub",   type: "Generation",   load: 45, risk: "LOW",      x: 145, y: 22  },
    ],
    links: [[0,1],[0,4],[1,2],[1,3],[2,3]],
    vulnerabilities: [
      { name: "Ruhr load overload risk",          severity: "CRITICAL", prob: 78 },
      { name: "Single point — Nord Hub",           severity: "HIGH",     prob: 64 },
      { name: "Import dependency from France/CZ",  severity: "MEDIUM",   prob: 45 },
    ],
    cascade_scenarios: [
      { trigger: "Ruhr Zone failure", affected: ["Nord Hub", "East Interconnect"], blackout_pct: 34, recovery: "6–18h" },
      { trigger: "Cyber attack on SCADA", affected: ["All zones"], blackout_pct: 71, recovery: "24–72h" },
    ],
  },
  France: {
    capacity_gw: 180, renewables_pct: 25, fossil_pct: 8, nuclear_pct: 67, import_pct: 0,
    nodes: [
      { id: "N-FR-01", name: "Flamanville NPP",    type: "Generation",   load: 91, risk: "HIGH",     x: 80,  y: 80  },
      { id: "N-FR-02", name: "Paris Load Centre",  type: "Load Centre",  load: 88, risk: "HIGH",     x: 148, y: 95  },
      { id: "N-FR-03", name: "Lyon Industrial",    type: "Load Centre",  load: 75, risk: "MEDIUM",   x: 160, y: 155 },
      { id: "N-FR-04", name: "South Interconnect", type: "Interconnect", load: 55, risk: "LOW",      x: 140, y: 210 },
      { id: "N-FR-05", name: "RTE Control Centre", type: "Control",      load: 80, risk: "CRITICAL", x: 148, y: 135 },
    ],
    links: [[0,1],[1,2],[1,4],[2,3],[2,4]],
    vulnerabilities: [
      { name: "Nuclear dependency — 67% of mix",  severity: "CRITICAL", prob: 85 },
      { name: "Ageing fleet — avg reactor age 37y",severity: "HIGH",    prob: 72 },
      { name: "Drought impact on cooling",         severity: "HIGH",    prob: 58 },
    ],
    cascade_scenarios: [
      { trigger: "Simultaneous NPP shutdown (3)", affected: ["Paris", "Lyon", "South"], blackout_pct: 55, recovery: "12–48h" },
      { trigger: "RTE Control Centre compromise",  affected: ["National grid"],           blackout_pct: 90, recovery: "48–96h" },
    ],
  },
  Italy: {
    capacity_gw: 125, renewables_pct: 42, fossil_pct: 52, nuclear_pct: 0, import_pct: 16,
    nodes: [
      { id: "N-IT-01", name: "North Italy Hub",    type: "Transmission", load: 83, risk: "HIGH",     x: 130, y: 70  },
      { id: "N-IT-02", name: "Milan Load Centre",  type: "Load Centre",  load: 92, risk: "CRITICAL", x: 115, y: 95  },
      { id: "N-IT-03", name: "Central Grid",       type: "Transmission", load: 70, risk: "MEDIUM",   x: 145, y: 145 },
      { id: "N-IT-04", name: "Sicily–Continent",   type: "Interconnect", load: 61, risk: "MEDIUM",   x: 155, y: 230 },
      { id: "N-IT-05", name: "SAPEI Cable",        type: "Interconnect", load: 55, risk: "LOW",      x: 110, y: 200 },
    ],
    links: [[0,1],[0,2],[1,2],[2,3],[2,4]],
    vulnerabilities: [
      { name: "Gas dependency for 52% generation", severity: "CRITICAL", prob: 80 },
      { name: "North-South bottleneck",             severity: "HIGH",     prob: 67 },
      { name: "Import via Alps (Switzerland/France)",severity: "HIGH",    prob: 60 },
    ],
    cascade_scenarios: [
      { trigger: "Gas supply cutoff",        affected: ["Milan", "North Italy"],   blackout_pct: 45, recovery: "8–24h"  },
      { trigger: "Alpine interconnect cut",  affected: ["North Italy", "Central"], blackout_pct: 28, recovery: "4–12h"  },
    ],
  },
  Poland: {
    capacity_gw: 55, renewables_pct: 22, fossil_pct: 72, nuclear_pct: 0, import_pct: 6,
    nodes: [
      { id: "N-PL-01", name: "Warsaw Control",     type: "Control",      load: 85, risk: "HIGH",     x: 170, y: 95  },
      { id: "N-PL-02", name: "Silesia Coal Zone",  type: "Generation",   load: 96, risk: "CRITICAL", x: 130, y: 160 },
      { id: "N-PL-03", name: "Gdansk Port Hub",    type: "Transmission", load: 68, risk: "MEDIUM",   x: 150, y: 45  },
      { id: "N-PL-04", name: "East Border Interconnect",type:"Interconnect",load:72,risk:"HIGH",      x: 220, y: 120 },
      { id: "N-PL-05", name: "Offshore Baltic",    type: "Generation",   load: 30, risk: "LOW",      x: 100, y: 30  },
    ],
    links: [[0,1],[0,2],[0,3],[1,2],[2,4]],
    vulnerabilities: [
      { name: "Coal dependency — 72%",             severity: "CRITICAL", prob: 90 },
      { name: "East interconnect (Russia/Belarus)", severity: "CRITICAL", prob: 88 },
      { name: "Ageing coal plant fleet",            severity: "HIGH",    prob: 75 },
    ],
    cascade_scenarios: [
      { trigger: "Coal strike (Silesia)",           affected: ["Warsaw", "South Poland"], blackout_pct: 60, recovery: "24–72h" },
      { trigger: "East interconnect sabotage",      affected: ["East region"],            blackout_pct: 22, recovery: "4–8h"   },
    ],
  },
  Ukraine: {
    capacity_gw: 45, renewables_pct: 8, fossil_pct: 35, nuclear_pct: 52, import_pct: 5,
    nodes: [
      { id: "N-UA-01", name: "Ukrenergo Control",  type: "Control",      load: 78, risk: "CRITICAL", x: 160, y: 110 },
      { id: "N-UA-02", name: "Zaporizhzhia NPP",   type: "Generation",   load: 0,  risk: "CRITICAL", x: 200, y: 155 },
      { id: "N-UA-03", name: "Khmelnitsky NPP",    type: "Generation",   load: 85, risk: "HIGH",     x: 100, y: 120 },
      { id: "N-UA-04", name: "Kyiv Load Centre",   type: "Load Centre",  load: 82, risk: "HIGH",     x: 170, y: 75  },
      { id: "N-UA-05", name: "West EU Interconnect",type:"Interconnect",  load: 60, risk: "MEDIUM",   x: 55,  y: 110 },
    ],
    links: [[0,1],[0,2],[0,3],[2,4],[3,4]],
    vulnerabilities: [
      { name: "Active conflict — infrastructure strikes", severity: "CRITICAL", prob: 95 },
      { name: "Zaporizhzhia NPP — occupied",              severity: "CRITICAL", prob: 95 },
      { name: "Grid damage — estimated 40% degraded",     severity: "CRITICAL", prob: 92 },
    ],
    cascade_scenarios: [
      { trigger: "Missile strike on substation network", affected: ["Kyiv", "East"], blackout_pct: 65, recovery: "Days–weeks" },
      { trigger: "NPP cooling loss",                     affected: ["National"],      blackout_pct: 80, recovery: "Unknown" },
    ],
  },
  UK: {
    capacity_gw: 110, renewables_pct: 48, fossil_pct: 38, nuclear_pct: 14, import_pct: 8,
    nodes: [
      { id: "N-GB-01", name: "National Grid Control", type: "Control",     load: 78, risk: "HIGH",   x: 148, y: 100 },
      { id: "N-GB-02", name: "London Load Centre",    type: "Load Centre", load: 88, risk: "HIGH",   x: 168, y: 155 },
      { id: "N-GB-03", name: "Scotland Wind",         type: "Generation",  load: 55, risk: "LOW",    x: 130, y: 40  },
      { id: "N-GB-04", name: "IFA2 Interconnect",     type: "Interconnect",load: 70, risk: "MEDIUM", x: 200, y: 160 },
      { id: "N-GB-05", name: "Hinkley Point C",       type: "Generation",  load: 82, risk: "MEDIUM", x: 100, y: 165 },
    ],
    links: [[0,1],[0,2],[0,4],[1,3],[1,4]],
    vulnerabilities: [
      { name: "Single subsea interconnect (IFA2)",   severity: "HIGH",   prob: 60 },
      { name: "North Sea wind variability",           severity: "MEDIUM", prob: 52 },
      { name: "Gas peaker dependency in winter",      severity: "HIGH",   prob: 68 },
    ],
    cascade_scenarios: [
      { trigger: "IFA2 cable cut",            affected: ["South England"], blackout_pct: 12, recovery: "2–6h"   },
      { trigger: "Winter demand peak + low wind", affected: ["National"],  blackout_pct: 18, recovery: "6–12h"  },
    ],
  },
};

export default function EnergyGrid() {
  const [apiKey] = useApiKey();
  const [country, setCountry] = useState(() => {
    try { return localStorage.getItem("sentinel-energygrid-country") || "Germany"; } catch { return "Germany"; }
  });
  const [ran, setRan] = useState(false);
  const [gridTab, setGridTab] = useState("topology");
  const [simScenario, setSimScenario] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [simStep, setSimStep] = useState(0);
  const d = GRID_DATA[country];

  function runSimulation(scenario) {
    setSimScenario(scenario);
    setAiResult(null);
    setAiError("");
    setSimStep(1);
  }

  useEffect(() => {
    if (simStep === 0 || simStep >= 3) return;
    const t = setTimeout(() => setSimStep(s => s + 1), simStep === 1 ? 1400 : 1800);
    return () => clearTimeout(t);
  }, [simStep]);

  async function analyzeCascade(scenario) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const result = await callClaude(apiKey,
        `You are a critical infrastructure analyst. Analyze this grid cascade failure scenario. Return ONLY a JSON object (no markdown, no backticks).

Country: ${country}. Trigger: ${scenario.trigger}. Affected: ${scenario.affected.join(", ")}. Blackout: ${scenario.blackout_pct}% of population. Recovery: ${scenario.recovery}.

Return exactly:
{"cascade_analysis":"3-4 sentence analysis of cascading effects, root causes, and propagation chain","economic_impact":{"estimate_bn_eur":number,"affected_population_pct":${scenario.blackout_pct},"affected_sectors":[{"sector":"string","severity":"CRITICAL|HIGH|MEDIUM","impact_pct":number}]},"recovery_phases":[{"phase":"string","duration":"string","priority":"CRITICAL|HIGH|MEDIUM","actions":["string"]}],"resilience_recommendations":["string"]}

Include 3-4 affected sectors, 3-4 recovery phases in order, and 3-4 resilience recommendations.`
      );
      setAiResult(result); setGridTab("analysis");
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  const mixColors = { renewables: "#00ff9d", fossil: "#ff9d00", nuclear: "#b47fff", import: "#4db8ff" };

  const GRID_TABS = [
    { id: "topology", label: "Grid Topology" },
    { id: "mix", label: "Mix & Vulnerabilities" },
    { id: "cascade", label: "Cascade Simulator" },
    ...(aiResult ? [{ id: "analysis", label: "AI Analysis" }] : []),
  ];

  return (
    <div>
      <PageHeader icon="⚡" title="Energy Grid Resilience Simulator" sub="Simulate cascading failures and assess resilience of national energy grids." accent="#ff9d00" dataMode={apiKey ? "hybrid" : "mock"} />

      {/* Country selector */}
      <Card>
        <ST icon="🌍" label="Select Grid" color="#ff9d00" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COUNTRIES.map(c => (
            <button key={c} onClick={() => { setCountry(c); setRan(false); setSimScenario(null); setSimStep(0); setAiResult(null); setGridTab("topology"); try { localStorage.setItem("sentinel-energygrid-country", c); } catch {} }}
              style={{ background: country === c ? "#ff9d00" : "#1f2d45", color: country === c ? "#0a0f1e" : "#9ca3af", border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: country === c ? 700 : 400 }}>{c}</button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <Btn onClick={() => { setRan(true); setSimScenario(null); setGridTab("topology"); }} color="#ff9d00">⚡ Load Grid Model</Btn>
        </div>
      </Card>

      {ran && (
        <>
          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 110px), 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              ["Capacity", d.capacity_gw + " GW", "#ff9d00"],
              ["Renewables", d.renewables_pct + "%", "#00ff9d"],
              ["Fossil", d.fossil_pct + "%", "#ff4d4d"],
              ["Import Dep.", d.import_pct + "%", "#4db8ff"],
            ].map(([l, v, c]) => (
              <Card key={l} style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>{l}</div>
              </Card>
            ))}
          </div>

          {/* Sub-tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1f2d45", marginBottom: 14, gap: 2, flexWrap: "wrap" }}>
            {GRID_TABS.map(t => (
              <button key={t.id} onClick={() => setGridTab(t.id)} style={tabStyle(gridTab === t.id)}>{t.label}</button>
            ))}
          </div>

          {gridTab === "topology" && (
            <Card>
              <ST icon="🔌" label="Grid Topology" color="#ff9d00" sub={`${d.nodes.length} nodes · ${d.links.length} connections`} />
              <svg viewBox="0 0 280 250" style={{ width: "100%", background: "#0d1626", borderRadius: 8 }}>
                {d.links.map(([a, b], i) => (
                  <line key={i}
                    x1={d.nodes[a].x} y1={d.nodes[a].y}
                    x2={d.nodes[b].x} y2={d.nodes[b].y}
                    stroke="#1f4080" strokeWidth="2" strokeDasharray="4" />
                ))}
                {d.nodes.map((n, i) => {
                  const c = riskColor(n.risk);
                  return (
                    <g key={i}>
                      {n.risk === "CRITICAL" && <circle cx={n.x} cy={n.y} r={20} fill="none" stroke={c} strokeWidth="0.8" opacity="0.3" />}
                      <circle cx={n.x} cy={n.y} r={12} fill="#111827" stroke={c} strokeWidth="2" />
                      <text x={n.x} y={n.y + 4} textAnchor="middle" fill={c} fontSize="9" fontWeight="bold">
                        {n.type === "Generation" ? "⚡" : n.type === "Load Centre" ? "🏙" : n.type === "Control" ? "💻" : n.type === "Interconnect" ? "🔗" : "⊞"}
                      </text>
                      <text x={n.x} y={n.y - 18} textAnchor="middle" fill="#e2e8f0" fontSize="7">{n.name.split(" ")[0]}</text>
                      <text x={n.x} y={n.y + 26} textAnchor="middle" fill={c} fontSize="8" fontWeight="bold">{n.load}%</text>
                    </g>
                  );
                })}
                <text x={140} y={242} textAnchor="middle" fill="#9ca3af" fontSize="7">Node load % · Go to Cascade Simulator to run failure scenarios</text>
              </svg>
              {/* Node legend */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                {d.nodes.map(n => (
                  <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: riskColor(n.risk) }} />
                    <span style={{ color: "#9ca3af", fontSize: 9 }}>{n.name}</span>
                    <span style={{ color: riskColor(n.risk), fontSize: 9, fontWeight: 700 }}>{n.load}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {gridTab === "mix" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 14 }}>
              <Card>
                <ST icon="🔋" label="Generation Mix" color="#ff9d00" />
                <div style={{ marginBottom: 16 }}>
                  {[
                    ["Renewables", d.renewables_pct, mixColors.renewables],
                    ["Fossil Fuels", d.fossil_pct, mixColors.fossil],
                    ["Nuclear", d.nuclear_pct, mixColors.nuclear],
                    ["Net Import", d.import_pct, mixColors.import],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ color: "#e2e8f0", fontSize: 12 }}>{l}</span>
                        <span style={{ color: c, fontWeight: 700 }}>{v}%</span>
                      </div>
                      <div style={{ background: "#1f2d45", borderRadius: 4, height: 8 }}>
                        <div style={{ background: c, height: 8, borderRadius: 4, width: `${v}%`, transition: "width 0.8s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <ST icon="⚠️" label="Grid Vulnerabilities" color="#ff4d4d" sub="Probability-weighted risk factors" />
                {d.vulnerabilities.map((v, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d1626", borderRadius: 6, padding: "7px 10px", marginBottom: 6, borderLeft: `3px solid ${riskColor(v.severity)}` }}>
                    <div style={{ color: "#e2e8f0", fontSize: 12, flex: 1 }}>{v.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
                      <span style={{ color: "#ffd700", fontSize: 11, fontWeight: 700 }}>{v.prob}%</span>
                      <BADGE text={v.severity} color={riskBadgeColor(v.severity)} />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {gridTab === "cascade" && (
            <Card>
              <ST icon="💥" label="Cascade Failure Simulator" color="#ff4d4d" />
              <p style={{ color: "#9ca3af", fontSize: 13, marginTop: -6, marginBottom: 14 }}>
                Select a scenario to simulate the cascading effect on the national grid.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12, marginBottom: 16 }}>
                {d.cascade_scenarios.map((s, i) => (
                  <ScenarioCard key={i} s={s} active={simScenario?.trigger === s.trigger} onClick={() => runSimulation(s)}>
                    <div style={{ fontWeight: 700, color: "#ffd700", marginBottom: 6 }}>💥 {s.trigger}</div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>Affected: <span style={{ color: "#e2e8f0" }}>{s.affected.join(", ")}</span></div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div><span style={{ color: "#9ca3af", fontSize: 10 }}>BLACKOUT EST. </span><span style={{ color: "#ff4d4d", fontWeight: 700 }}>{s.blackout_pct}%</span></div>
                      <div><span style={{ color: "#9ca3af", fontSize: 10 }}>RECOVERY </span><span style={{ color: "#ffd700" }}>{s.recovery}</span></div>
                    </div>
                  </ScenarioCard>
                ))}
              </div>

              {simScenario && (
                <div style={{ background: "#1a0a00", border: "1px solid #ff4d4d55", borderRadius: 8, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 16 }}>
                    {[["⚡ Trigger", 1], ["🔗 Cascade", 2], ["📊 Impact", 3]].map(([label, step], i) => {
                      const done = simStep >= step;
                      const current = simStep === step;
                      return (
                        <div key={step} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                              background: done ? "#ff4d4d" : "#1f2d45",
                              color: done ? "#fff" : "#4a5568",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 12, fontWeight: 700,
                              boxShadow: current ? "0 0 10px #ff4d4d44" : "none",
                              border: current && simStep < 3 ? "2px solid #ff4d4d" : "2px solid transparent",
                              transition: "all 0.3s",
                            }}>{done ? "✓" : step}</div>
                            <span style={{ color: done ? "#ff9d00" : "#4a5568", fontSize: 9, fontWeight: done ? 700 : 400, whiteSpace: "nowrap" }}>{label}</span>
                          </div>
                          {i < 2 && <div style={{ flex: 1, height: 2, background: simStep > step ? "#ff4d4d" : "#1f2d45", marginBottom: 16, transition: "background 0.4s" }} />}
                        </div>
                      );
                    })}
                  </div>

                  {simStep >= 1 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: "#ff4d4d", fontWeight: 800, fontSize: 14, marginBottom: 6 }}>🔴 {simStep < 3 ? "TRIGGER DETECTED" : "SIMULATION COMPLETE"} — {simScenario.trigger}</div>
                      <div style={{ color: "#9ca3af", fontSize: 12 }}>Cascade propagation initiated in <span style={{ color: "#ff9d00", fontWeight: 700 }}>{country}</span> grid.</div>
                    </div>
                  )}

                  {simStep >= 2 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ color: "#9ca3af", fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>CASCADE ZONES AFFECTED:</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {simScenario.affected.map((z, i) => (
                          <BADGE key={i} text={`⚡ ${z}`} color="red" />
                        ))}
                      </div>
                    </div>
                  )}

                  {simStep >= 3 && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 120px), 1fr))", gap: 10, marginBottom: 14, marginTop: 14 }}>
                        <div style={{ background: "#0d1626", borderRadius: 6, padding: 10, textAlign: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#ff4d4d" }}>{simScenario.blackout_pct}%</div>
                          <div style={{ color: "#9ca3af", fontSize: 11 }}>Population Affected</div>
                        </div>
                        <div style={{ background: "#0d1626", borderRadius: 6, padding: 10, textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#ffd700" }}>{simScenario.recovery}</div>
                          <div style={{ color: "#9ca3af", fontSize: 11 }}>Est. Recovery Time</div>
                        </div>
                        <div style={{ background: "#0d1626", borderRadius: 6, padding: 10, textAlign: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#ff9d00" }}>{100 - simScenario.blackout_pct}%</div>
                          <div style={{ color: "#9ca3af", fontSize: 11 }}>Grid Stability</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>GRID STABILITY INDEX</span>
                          <span style={{ color: "#ff4d4d", fontSize: 11 }}>Disrupted: {simScenario.blackout_pct}%</span>
                        </div>
                        <div style={{ background: "#1f2d45", borderRadius: 6, height: 12, overflow: "hidden" }}>
                          <div style={{ background: "linear-gradient(90deg, #ff4d4d, #ff9d00)", height: 12, borderRadius: 6, width: `${100 - simScenario.blackout_pct}%`, transition: "width 1.2s ease-out" }} />
                        </div>
                      </div>
                      {apiKey && (
                        <div style={{ marginBottom: 6 }}>
                          <Btn onClick={() => analyzeCascade(simScenario)} disabled={aiLoading} color="#ff9d00" size="sm">
                            {aiLoading ? "⏳ Analyzing cascade..." : "🤖 AI Cascade Analysis"}
                          </Btn>
                          {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          )}

          {gridTab === "analysis" && aiResult && (
            <>
              <Card style={{ borderColor: "#ff9d0033", borderLeft: "3px solid #ff9d00" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <LiveBadge />
                  <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI CASCADE ANALYSIS · {country}</span>
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>{aiResult.cascade_analysis}</div>
                <EconomicImpactChart impact={aiResult.economic_impact} />
              </Card>
              {aiResult.recovery_phases?.length > 0 && (
                <Card>
                  <ST icon="🔄" label="Recovery Plan" color="#4db8ff" sub="Phase-by-phase restoration roadmap" style={{ marginBottom: 12 }} />
                  <RecoveryPhaseTimeline phases={aiResult.recovery_phases} />
                </Card>
              )}
              {aiResult.resilience_recommendations?.length > 0 && (
                <Card>
                  <ST icon="🛡️" label="Resilience Recommendations" color="#00ff9d" style={{ marginBottom: 10 }} />
                  {aiResult.resilience_recommendations.map((r, i) => (
                    <div key={i} style={{ color: "#e2e8f0", fontSize: 12, marginBottom: 6 }}>• {r}</div>
                  ))}
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
