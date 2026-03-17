import { useState } from "react";
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
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
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
  const [country, setCountry] = useState("Germany");
  const [ran, setRan] = useState(false);
  const [simScenario, setSimScenario] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const d = GRID_DATA[country];

  function runSimulation(scenario) {
    setSimScenario(scenario);
    setAiResult(null);
  }

  async function analyzeCascade(scenario) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey, `You are a critical infrastructure analyst. Analyze this grid cascade failure scenario in 3-4 sentences covering: cascading effect chain, economic and social impact, recovery challenges, and resilience recommendations. Country: ${country}. Scenario trigger: ${scenario.trigger}. Affected zones: ${scenario.affected.join(", ")}. Estimated blackout: ${scenario.blackout_pct}% of population. Recovery: ${scenario.recovery}.`);
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  const mixColors = { renewables: "#00ff9d", fossil: "#ff9d00", nuclear: "#b47fff", import: "#4db8ff" };

  return (
    <div>
      <PageHeader icon="⚡" title="Energy Grid Resilience Simulator" sub="Simulate cascading failures and assess resilience of national energy grids." accent="#ff9d00" mock />

      {/* Country selector */}
      <Card>
        <ST icon="🌍" label="Select Grid" color="#ff9d00" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COUNTRIES.map(c => (
            <button key={c} onClick={() => { setCountry(c); setRan(false); setSimScenario(null); }}
              style={{ background: country === c ? "#ff9d00" : "#1f2d45", color: country === c ? "#0a0f1e" : "#9ca3af", border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: country === c ? 700 : 400 }}>{c}</button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <Btn onClick={() => { setRan(true); setSimScenario(null); }} color="#ff9d00">⚡ Load Grid Model</Btn>
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 14, marginBottom: 14 }}>
            {/* Grid topology */}
            <Card>
              <ST icon="🔌" label="Grid Topology" color="#ff9d00" />
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
                <text x={140} y={242} textAnchor="middle" fill="#9ca3af" fontSize="7">Node load % shown · Click scenario to simulate</text>
              </svg>
            </Card>

            {/* Energy mix */}
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
              <ST icon="⚠️" label="Vulnerabilities" color="#ff4d4d" />
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

          {/* Cascade simulator */}
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
              <div style={{ background: "#1a0a00", border: "1px solid #ff4d4d", borderRadius: 8, padding: 16 }}>
                <div style={{ fontWeight: 800, color: "#ff4d4d", fontSize: 15, marginBottom: 10 }}>🔴 SIMULATION ACTIVE — {simScenario.trigger}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))", gap: 12, marginBottom: 14 }}>
                  <div style={{ background: "#0d1626", borderRadius: 6, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#ff4d4d" }}>{simScenario.blackout_pct}%</div>
                    <div style={{ color: "#9ca3af", fontSize: 11 }}>Population Affected</div>
                  </div>
                  <div style={{ background: "#0d1626", borderRadius: 6, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#ffd700" }}>{simScenario.recovery}</div>
                    <div style={{ color: "#9ca3af", fontSize: 11 }}>Est. Recovery Time</div>
                  </div>
                  <div style={{ background: "#0d1626", borderRadius: 6, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#ff9d00" }}>{simScenario.affected.length}</div>
                    <div style={{ color: "#9ca3af", fontSize: 11 }}>Zones Impacted</div>
                  </div>
                </div>
                <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 6 }}>IMPACTED ZONES:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {simScenario.affected.map((z, i) => <BADGE key={i} text={z} color="red" />)}
                </div>
                {apiKey && (
                  <div style={{ marginBottom: 14 }}>
                    <Btn onClick={() => analyzeCascade(simScenario)} disabled={aiLoading} color="#ff9d00" size="sm">
                      {aiLoading ? "⏳ Analyzing..." : "🤖 AI Cascade Analysis"}
                    </Btn>
                    {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
                    {aiResult && (
                      <div style={{ background: "#0a0c00", border: "1px solid #ff9d0033", borderLeft: "3px solid #ff9d00", borderRadius: 6, padding: 12, marginTop: 10 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                          <LiveBadge />
                          <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI CASCADE ANALYSIS · {country}</span>
                        </div>
                        <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.7 }}>{aiResult}</div>
                      </div>
                    )}
                  </div>
                )}
                {/* Recovery progress bar */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 6 }}>GRID STABILITY INDEX (post-event)</div>
                  <div style={{ background: "#1f2d45", borderRadius: 6, height: 14 }}>
                    <div style={{ background: "#ff4d4d", height: 14, borderRadius: 6, width: `${100 - simScenario.blackout_pct}%`, transition: "width 1s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ color: "#9ca3af", fontSize: 11 }}>Stable: {100 - simScenario.blackout_pct}%</span>
                    <span style={{ color: "#ff4d4d", fontSize: 11 }}>Disrupted: {simScenario.blackout_pct}%</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
