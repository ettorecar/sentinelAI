import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BADGE, Card, ST, PageHeader, StatBar, Btn, LiveBadge } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

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

const rc = r => r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";
const rb = r => r === "CRITICAL" || r === "HIGH" ? "red" : r === "MEDIUM" ? "yellow" : "green";
const typeIcons = { Refinery: "⚗️", Pipeline: "〰️", Terminal: "⚓" };

const ASSETS = [
  { id: "OG-001", name: "Abqaiq Processing Facility",         country: "Saudi Arabia",     type: "Refinery", risk: "CRITICAL", lat:  25.9, lon:  49.7, incident: "Drone swarm threat detected in perimeter",          lastEvt: "14/03", barrel: "7.0Mb/d" },
  { id: "OG-002", name: "Druzhba Pipeline — Western Segment", country: "Russia/EU",        type: "Pipeline", risk: "HIGH",     lat:  51.0, lon:  24.0, incident: "Unexplained pressure anomaly, 3rd segment",         lastEvt: "13/03", barrel: "1.2Mb/d" },
  { id: "OG-003", name: "Ras Tanura Marine Terminal",         country: "Saudi Arabia",     type: "Terminal", risk: "HIGH",     lat:  26.6, lon:  50.1, incident: "Suspicious vessel loitering 12nm offshore",         lastEvt: "12/03", barrel: "6.5Mb/d" },
  { id: "OG-004", name: "Kharg Island Terminal",              country: "Iran",             type: "Terminal", risk: "MEDIUM",   lat:  29.2, lon:  50.3, incident: "Elevated military activity nearby",                 lastEvt: "11/03", barrel: "2.5Mb/d" },
  { id: "OG-005", name: "Nord Stream Monitoring Zone",        country: "Baltic Sea",       type: "Pipeline", risk: "HIGH",     lat:  55.5, lon:  15.0, incident: "Seismic anomaly detected near route",               lastEvt: "10/03", barrel: "0Mb/d"   },
  { id: "OG-006", name: "Kirkuk-Ceyhan Pipeline",             country: "Iraq/Turkey",      type: "Pipeline", risk: "MEDIUM",   lat:  36.5, lon:  43.0, incident: "Armed group activity near pumping station",         lastEvt: "09/03", barrel: "0.6Mb/d" },
  { id: "OG-007", name: "Sumed Pipeline",                     country: "Egypt",            type: "Pipeline", risk: "LOW",      lat:  30.0, lon:  32.5, incident: "Routine maintenance in progress",                   lastEvt: "08/03", barrel: "2.3Mb/d" },
  { id: "OG-008", name: "Haradh Gas Processing Plant",        country: "Saudi Arabia",     type: "Refinery", risk: "HIGH",     lat:  24.0, lon:  49.0, incident: "Cyber intrusion detected in SCADA systems",         lastEvt: "07/03", barrel: "1.6Mb/d" },
  { id: "OG-009", name: "Azerbaijan BTC Pipeline",            country: "Azerbaijan/Turkey",type: "Pipeline", risk: "MEDIUM",   lat:  40.4, lon:  47.0, incident: "PKK-linked threat on Turkish segment assessed",      lastEvt: "06/03", barrel: "1.2Mb/d" },
  { id: "OG-010", name: "Basra Oil Terminal",                 country: "Iraq",             type: "Terminal", risk: "MEDIUM",   lat:  29.5, lon:  48.5, incident: "Rocket fire reported near facility perimeter",       lastEvt: "05/03", barrel: "3.8Mb/d" },
  { id: "OG-011", name: "Trans-Arabian Pipeline",             country: "Saudi Arabia",     type: "Pipeline", risk: "LOW",      lat:  26.5, lon:  42.5, incident: "No active incidents — routine monitoring",           lastEvt: "04/03", barrel: "0.5Mb/d" },
  { id: "OG-012", name: "El Sharara Oil Field",               country: "Libya",            type: "Refinery", risk: "HIGH",     lat:  27.9, lon:  10.5, incident: "Militia group blockade threat reported",             lastEvt: "03/03", barrel: "0.3Mb/d" },
  { id: "OG-013", name: "TurkStream Pipeline",                country: "Russia/Turkey",    type: "Pipeline", risk: "HIGH",     lat:  41.5, lon:  32.5, incident: "Undersea sabotage threat assessed as credible",      lastEvt: "02/03", barrel: "0.8Mb/d" },
  { id: "OG-014", name: "Buzios Offshore Field",              country: "Brazil",           type: "Terminal", risk: "LOW",      lat: -23.0, lon: -40.0, incident: "Hurricane season monitoring — no current threat",    lastEvt: "01/03", barrel: "2.0Mb/d" },
  { id: "OG-015", name: "Tengiz Oil Field",                   country: "Kazakhstan",       type: "Refinery", risk: "MEDIUM",   lat:  45.5, lon:  53.0, incident: "CPC export route disruption — tanker queue build-up", lastEvt: "28/02", barrel: "1.5Mb/d" },
];

const RISK_LEVELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const ASSET_TYPES = ["Refinery", "Pipeline", "Terminal"];

function tabStyle(active, color = "#ff9d00") {
  return {
    padding: "6px 14px", borderRadius: "5px 5px 0 0", fontSize: 12, fontWeight: active ? 700 : 500,
    cursor: "pointer", border: "none", outline: "none", background: "transparent",
    color: active ? color : "#4a5568",
    borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
  };
}

// Threat distribution matrix: risk level × asset type
function ThreatMatrix({ assets }) {
  const W = 300, cellW = 62, cellH = 36, labelW = 68, labelH = 24;
  const SVG_W = labelW + ASSET_TYPES.length * cellW + 10;
  const SVG_H = labelH + RISK_LEVELS.length * cellH + 8;

  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>
        THREAT DISTRIBUTION MATRIX — Risk × Asset Type
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: "100%", minWidth: 260, height: SVG_H }}>
          {/* Column headers */}
          {ASSET_TYPES.map((t, ci) => (
            <text key={t} x={labelW + ci * cellW + cellW / 2} y={16}
              textAnchor="middle" fill="#4a5568" fontSize="8.5" fontWeight="600">
              {typeIcons[t]} {t}
            </text>
          ))}
          {/* Row headers + cells */}
          {RISK_LEVELS.map((risk, ri) => {
            const rowY = labelH + ri * cellH;
            const color = rc(risk);
            return (
              <g key={risk}>
                <text x={labelW - 4} y={rowY + cellH / 2 + 3}
                  textAnchor="end" fill={color} fontSize="8" fontWeight="700">{risk}</text>
                {ASSET_TYPES.map((type, ci) => {
                  const count = assets.filter(a => a.risk === risk && a.type === type).length;
                  const intensity = count > 0 ? Math.min(1, count / 3) : 0;
                  const cx = labelW + ci * cellW;
                  return (
                    <g key={type}>
                      <rect x={cx + 2} y={rowY + 2} width={cellW - 4} height={cellH - 4}
                        rx={4} fill={count > 0 ? color : "#0d1626"}
                        fillOpacity={count > 0 ? 0.1 + intensity * 0.4 : 0.3}
                        stroke={count > 0 ? color : "#1f2d45"} strokeWidth="0.8" />
                      {count > 0 && (
                        <>
                          <text x={cx + cellW / 2} y={rowY + cellH / 2 - 3}
                            textAnchor="middle" dominantBaseline="middle"
                            fill={color} fontSize="15" fontWeight="900">{count}</text>
                          <text x={cx + cellW / 2} y={rowY + cellH - 8}
                            textAnchor="middle" fill={color} fontSize="7" opacity="0.7">
                            {count === 1 ? "asset" : "assets"}
                          </text>
                        </>
                      )}
                      {count === 0 && (
                        <text x={cx + cellW / 2} y={rowY + cellH / 2 + 3}
                          textAnchor="middle" fill="#2d3f55" fontSize="11">—</text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// Asset count and barrel-flow summary per risk level
function FlowAtRiskChart({ assets }) {
  const parseBarrel = b => parseFloat(b?.replace("Mb/d", "") || 0);
  const groups = RISK_LEVELS.map(risk => ({
    risk,
    count: assets.filter(a => a.risk === risk).length,
    flow: assets.filter(a => a.risk === risk).reduce((s, a) => s + parseBarrel(a.barrel), 0),
  }));
  const maxFlow = Math.max(...groups.map(g => g.flow), 1);

  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>
        FLOW VOLUME AT RISK BY THREAT LEVEL
      </div>
      {groups.map(({ risk, count, flow }) => {
        const color = rc(risk);
        const pct = (flow / maxFlow) * 100;
        return (
          <div key={risk} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color, fontSize: 11, fontWeight: 700, minWidth: 56 }}>{risk}</span>
                <span style={{ color: "#4a5568", fontSize: 10 }}>{count} asset{count !== 1 ? "s" : ""}</span>
              </div>
              <span style={{ color, fontWeight: 800, fontSize: 13 }}>{flow.toFixed(1)} Mb/d</span>
            </div>
            <div style={{ background: "#1f2d45", borderRadius: 4, height: 10 }}>
              <div style={{
                background: color, height: 10, borderRadius: 4,
                width: `${pct}%`, transition: "width 0.8s",
                boxShadow: pct > 0 ? `0 0 6px ${color}60` : "none",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Structured AI assessment panel
function AssessmentPanel({ result, assetId }) {
  if (!result) return null;
  const priorityColor = p => p === "IMMEDIATE" ? "#ff4d4d" : p === "SHORT-TERM" ? "#ffd700" : "#4db8ff";
  const likeColor = l => l === "HIGH" ? "#ff4d4d" : l === "MEDIUM" ? "#ffd700" : "#00ff9d";
  return (
    <>
      <Card style={{ borderColor: "#ff9d0033", borderLeft: "3px solid #ff9d00" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <LiveBadge />
          <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI THREAT ASSESSMENT · {assetId}</span>
        </div>
        <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>{result.assessment}</div>
        {result.supply_impact && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,140px),1fr))", gap: 8 }}>
            {[
              ["FLOW AT RISK", result.supply_impact.flow_mb_d_at_risk + " Mb/d", "#ff9d00"],
              ["PRICE EFFECT", "+" + result.supply_impact.market_price_effect_pct + "%", "#ff4d4d"],
            ].map(([l,v,c]) => (
              <div key={l} style={{ background: "#0a1628", borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>{l}</div>
                <div style={{ color: c, fontSize: 18, fontWeight: 900 }}>{v}</div>
              </div>
            ))}
            {result.supply_impact.alternatives && (
              <div style={{ background: "#0a1628", borderRadius: 6, padding: "8px 12px", gridColumn: "1 / -1" }}>
                <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>ALTERNATIVES</div>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>{result.supply_impact.alternatives}</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {result.attack_vectors?.length > 0 && (
        <Card>
          <ST icon="🎯" label="Attack Vectors" color="#ff4d4d" sub={`${result.attack_vectors.length} identified`} style={{ marginBottom: 10 }} />
          {result.attack_vectors.map((v, i) => (
            <div key={i} style={{
              background: "#0d1626", borderRadius: 6, padding: "9px 12px", marginBottom: 7,
              border: "1px solid #1f2d45", borderLeft: `3px solid ${likeColor(v.likelihood)}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{v.vector}</span>
                <span style={{ color: likeColor(v.likelihood), fontSize: 10, fontWeight: 700 }}>{v.likelihood}</span>
              </div>
              <div style={{ color: "#9ca3af", fontSize: 11 }}>{v.impact}</div>
            </div>
          ))}
        </Card>
      )}

      {result.recommendations?.length > 0 && (
        <Card>
          <ST icon="🛡️" label="Recommendations" color="#00ff9d" style={{ marginBottom: 10 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,200px),1fr))", gap: 8 }}>
            {result.recommendations.map((r, i) => (
              <div key={i} style={{
                background: "#0a1628", borderRadius: 7, padding: "10px 12px",
                border: "1px solid #1f2d45", borderTop: `2px solid ${priorityColor(r.priority)}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ color: priorityColor(r.priority), fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{r.priority}</span>
                  {r.agency && <span style={{ color: "#4a5568", fontSize: 9 }}>{r.agency}</span>}
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{r.action}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function MapClickHandler({ onDeselect }) {
  useMapEvents({ click: onDeselect });
  return null;
}

function FilterBtn({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  const accent = label === "CRITICAL" ? "#ff0000" : label === "HIGH" ? "#ff4d4d" : label === "MEDIUM" ? "#ffd700" : label === "LOW" ? "#00ff9d" : "#ff9d00";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? accent : hovered ? accent + "22" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? accent : "#9ca3af",
        border: `1px solid ${active ? accent : hovered ? accent + "44" : "transparent"}`,
        borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function IncidentRow({ a, onClick, selected }) {
  const [hovered, setHovered] = useState(false);
  const color = rc(a.risk);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? "#141e30" : hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 7, padding: "10px 14px", marginBottom: 7,
        border: `1px solid ${selected ? color + "55" : hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${color}`,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "monospace" }}>{a.id} · {a.lastEvt}</span>
          <div style={{ fontWeight: 700, color: selected ? "#ffffff" : "#e2e8f0", marginTop: 2 }}>
            {typeIcons[a.type]} {a.name}
          </div>
          <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>
            {a.country} · Flow: <span style={{ color: "#ff9d00", fontWeight: 600 }}>{a.barrel}</span>
          </div>
          <div style={{ color: "#ffd700", fontSize: 12, marginTop: 4 }}>⚠ {a.incident}</div>
        </div>
        <BADGE text={a.risk} color={rb(a.risk)} />
      </div>
    </div>
  );
}

export default function OilInfra() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [tab, setTab] = useState("map");

  async function analyzeAsset(a) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const result = await callClaude(apiKey,
        `You are an energy security analyst. Assess this oil & gas infrastructure threat. Return ONLY a JSON object (no markdown, no backticks).

Asset: ${a.name} (${a.country}, Type: ${a.type}, Flow: ${a.barrel}, Risk: ${a.risk})
Incident: ${a.incident}

Return exactly:
{"assessment":"3-4 sentence analysis covering attack vector, geopolitical context, and supply impact","attack_vectors":[{"vector":"string","likelihood":"HIGH|MEDIUM|LOW","impact":"string"}],"supply_impact":{"flow_mb_d_at_risk":number,"market_price_effect_pct":number,"alternatives":"string"},"recommendations":[{"action":"string","priority":"IMMEDIATE|SHORT-TERM|LONG-TERM","agency":"string"}]}

Include 2-3 attack_vectors and 3-4 recommendations.`
      );
      setAiResult(result); setTab("assessment");
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  function selectAsset(a) {
    setSel(sel?.id === a.id ? null : a);
    setAiResult(null); setAiError("");
  }

  const filtered = filter === "ALL" ? ASSETS : ASSETS.filter(a => a.risk === filter);

  const TABS = [
    { id: "map", label: "Global Map" },
    { id: "incidents", label: "Incidents" },
    { id: "stats", label: "Statistics" },
    ...(aiResult ? [{ id: "assessment", label: "AI Assessment" }] : []),
  ];

  return (
    <div>
      <PageHeader icon="🛢️" title="Oil & Gas Infrastructure Monitor" sub="Real-time threat assessment for critical energy infrastructure worldwide." accent="#ff9d00" dataMode={apiKey ? "hybrid" : "mock"} />

      <StatBar stats={[
        { label: "Monitored Assets", value: "47",       color: "#ff9d00" },
        { label: "Critical Threats", value: "2",        color: "#ff4d4d" },
        { label: "At-Risk Flow",     value: "18.1Mb/d", color: "#ffd700" },
        { label: "Incidents (24h)",  value: "7",        color: "#4db8ff" },
      ]} />

      {/* Tab navigation */}
      <div style={{ display: "flex", borderBottom: "1px solid #1f2d45", marginBottom: 14, gap: 2, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "map" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, color: "#ff9d00", fontSize: 13 }}>🗺️ Global Asset Map</div>
            <span style={{ color: "#4a5568", fontSize: 10 }}>Click asset to inspect</span>
          </div>
          <MapContainer
            center={[30, 38]}
            zoom={3}
            minZoom={2}
            maxZoom={10}
            style={{ height: 360, background: "#050d1a" }}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={10}
            />
            <MapClickHandler onDeselect={() => { setSel(null); setAiResult(null); }} />
            {ASSETS.map(a => {
              const color = rc(a.risk);
              const isSel = sel?.id === a.id;
              return (
                <CircleMarker
                  key={a.id}
                  center={[a.lat, a.lon]}
                  radius={isSel ? 11 : a.risk === "CRITICAL" ? 9 : a.risk === "HIGH" ? 7 : 5}
                  pathOptions={{ color, fillColor: color, fillOpacity: isSel ? 0.9 : 0.8, weight: isSel ? 2 : 1 }}
                  eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); selectAsset(a); } }}
                />
              );
            })}
          </MapContainer>

          {sel && (
            <div style={{ margin: "0 14px 14px", background: "#0a1628", borderRadius: 8, padding: 14, border: `1px solid ${rc(sel.risk)}33`, borderLeft: `3px solid ${rc(sel.risk)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 3 }}>ASSET INTELLIGENCE</div>
                  <div style={{ fontWeight: 800, color: "#e2e8f0", fontSize: 14 }}>{typeIcons[sel.type]} {sel.name}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <BADGE text={sel.risk} color={rb(sel.risk)} />
                  <button onClick={() => setSel(null)} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>✕</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 110px), 1fr))", gap: 8, marginBottom: 10 }}>
                {[["COUNTRY", sel.country, "#e2e8f0"], ["TYPE", sel.type, "#e2e8f0"], ["FLOW", sel.barrel, "#ff9d00"], ["LAST EVENT", sel.lastEvt, "#4db8ff"]].map(([l,v,c]) => (
                  <div key={l} style={{ background: "#0d1626", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>{l}</div>
                    <div style={{ color: c, fontSize: 12, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#1a0e00", border: "1px solid #ffd70033", borderRadius: 6, padding: "8px 12px", marginBottom: 10 }}>
                <span style={{ color: "#ffd700", fontSize: 13 }}>⚠ {sel.incident}</span>
              </div>
              {apiKey && (
                <Btn onClick={() => analyzeAsset(sel)} disabled={aiLoading} color="#ff9d00" size="sm">
                  {aiLoading ? "⏳ Analyzing..." : "🤖 AI Threat Assessment"}
                </Btn>
              )}
              {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
            </div>
          )}
        </Card>
      )}

      {tab === "incidents" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <ST icon="⚠️" label="Incident Log" color="#ff9d00" sub={`${filtered.length} assets · sorted by date`} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {["ALL","CRITICAL","HIGH","MEDIUM","LOW"].map(f => (
                <FilterBtn key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
              ))}
            </div>
          </div>
          {filtered.map(a => (
            <IncidentRow key={a.id} a={a} selected={sel?.id === a.id} onClick={() => { selectAsset(a); }} />
          ))}
          {sel && apiKey && (
            <div style={{ marginTop: 4 }}>
              <Btn onClick={() => analyzeAsset(sel)} disabled={aiLoading} color="#ff9d00" size="sm">
                {aiLoading ? "⏳ Analyzing..." : "🤖 AI Threat Assessment"}
              </Btn>
            </div>
          )}
          {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
        </Card>
      )}

      {tab === "stats" && (
        <>
          <Card>
            <ST icon="📊" label="Threat Distribution" color="#ff9d00" sub="Asset count by risk level and type" style={{ marginBottom: 14 }} />
            <ThreatMatrix assets={ASSETS} />
          </Card>
          <Card>
            <ST icon="🛢️" label="Flow Volume at Risk" color="#ff4d4d" sub="Mb/d exposed by threat level" style={{ marginBottom: 14 }} />
            <FlowAtRiskChart assets={ASSETS} />
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,140px),1fr))", gap: 10 }}>
            {RISK_LEVELS.map(r => {
              const count = ASSETS.filter(a => a.risk === r).length;
              const color = rc(r);
              return (
                <Card key={r} style={{ textAlign: "center", padding: 12 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color }}>{count}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>{r}</div>
                  <div style={{ background: "#1f2d45", borderRadius: 2, height: 3, marginTop: 6 }}>
                    <div style={{ background: color, height: 3, width: `${(count / ASSETS.length) * 100}%`, borderRadius: 2 }} />
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab === "assessment" && aiResult && (
        <AssessmentPanel result={aiResult} assetId={sel?.id} />
      )}
    </div>
  );
}
