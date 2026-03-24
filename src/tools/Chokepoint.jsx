import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BADGE, Card, ST, PageHeader, StatBar, Spark, Btn, LiveBadge, riskColor, riskBadgeColor, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";
import { beFetch } from "../utils/beClient";

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

const chokepoints = [
  { id: "CP-01", name: "Strait of Hormuz",    location: "Persian Gulf",          lat:  26.5, lon:  56.5, risk: "CRITICAL", flow: "21Mb/d",  pct: "21%", tension: "Extreme",  threats: ["Iranian naval exercises", "Mine laying reports", "Drone harassment of tankers"],        altRoute: "None — no viable alternative",                        history: [18, 19, 20, 21, 20, 19, 21] },
  { id: "CP-02", name: "Strait of Malacca",   location: "SE Asia",               lat:   2.0, lon: 101.5, risk: "HIGH",     flow: "16Mb/d",  pct: "16%", tension: "Elevated", threats: ["Piracy incidents up 40%", "Territorial disputes", "Cyber attacks on port systems"],    altRoute: "Lombok Strait (+4 days transit)",                      history: [14, 15, 15, 16, 16, 15, 16] },
  { id: "CP-03", name: "Bab-el-Mandeb",       location: "Red Sea / Yemen",       lat:  12.5, lon:  43.5, risk: "CRITICAL", flow: "8.8Mb/d", pct: "9%",  tension: "Extreme",  threats: ["Houthi missile attacks", "Drone boats", "Coalition naval response"],                  altRoute: "Cape of Good Hope (+15 days, +$1.2M/voyage)",          history: [9, 8, 7, 6, 5, 4, 4] },
  { id: "CP-04", name: "Suez Canal",          location: "Egypt",                 lat:  30.5, lon:  32.5, risk: "MEDIUM",   flow: "5.5Mb/d", pct: "5%",  tension: "Moderate", threats: ["Diversion due to Houthi threat", "Congestion incidents"],                            altRoute: "Cape of Good Hope or SUMED pipeline",                  history: [7, 7, 6, 6, 5, 5, 6] },
  { id: "CP-05", name: "Turkish Straits",     location: "Bosphorus/Dardanelles", lat:  41.0, lon:  29.0, risk: "MEDIUM",   flow: "2.4Mb/d", pct: "2%",  tension: "Moderate", threats: ["Russian Black Sea fleet movements", "Sanctions complications"],                      altRoute: "Trans-Anatolian Pipeline (TANAP)",                     history: [3, 3, 2, 2, 2, 2, 2] },
  { id: "CP-06", name: "Danish Straits",      location: "North Sea",             lat:  56.0, lon:  10.5, risk: "LOW",      flow: "1.5Mb/d", pct: "1%",  tension: "Low",      threats: ["Occasional Russian submarine activity"],                                              altRoute: "Pipeline alternatives available",                      history: [1, 1, 2, 1, 1, 2, 1] },
  { id: "CP-07", name: "Strait of Gibraltar", location: "Atlantic / Med",        lat:  35.9, lon:  -5.5, risk: "LOW",      flow: "1.8Mb/d", pct: "2%",  tension: "Low",      threats: ["Occasional migrant crisis spillover", "Russian sub activity"],                       altRoute: "North Africa overland pipelines",                      history: [2, 2, 1, 2, 2, 1, 2] },
  { id: "CP-08", name: "Cape of Good Hope",   location: "South Africa",          lat: -34.4, lon:  18.5, risk: "LOW",      flow: "3.2Mb/d", pct: "3%",  tension: "Low",      threats: ["Weather-driven routing disruptions", "Piracy uptick near Cape"],                     altRoute: "Suez Canal (normal route)",                            history: [2, 3, 3, 4, 4, 5, 6] },
  { id: "CP-09", name: "Panama Canal",        location: "Central America",       lat:   9.0, lon: -79.5, risk: "MEDIUM",   flow: "1.0Mb/d", pct: "1%",  tension: "Moderate", threats: ["Water shortage reducing daily transits", "US-China geopolitical pressure", "Cartel activity near locks"], altRoute: "Suez Canal or US land bridge", history: [1, 1, 1, 1, 1, 1, 1] },
  { id: "CP-10", name: "Luzon Strait",        location: "Philippines / Taiwan",  lat:  20.0, lon: 121.0, risk: "HIGH",     flow: "2.0Mb/d", pct: "2%",  tension: "Elevated", threats: ["PLA Navy exercises", "Taiwan Strait tensions spillover", "Submarine cable vulnerability"], altRoute: "Lombok Strait (+2 days transit)", history: [1, 2, 2, 3, 3, 4, 5] },
];

function tabStyle(active, color = "#ff9d00") {
  return {
    padding: "6px 14px", borderRadius: "5px 5px 0 0", fontSize: 12, fontWeight: active ? 700 : 500,
    cursor: "pointer", border: "none", outline: "none", background: "transparent",
    color: active ? color : "#4a5568",
    borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
  };
}

function MapClickHandler({ onDeselect }) {
  useMapEvents({ click: onDeselect });
  return null;
}

// Multi-chokepoint 7-day flow trend comparison
function GlobalFlowTrendChart({ data, selected }) {
  const W = 380, H = 80;
  const shown = data.filter(cp => cp.risk === "CRITICAL" || cp.risk === "HIGH");
  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>
        7-DAY FLOW TREND — HIGH/CRITICAL CHOKEPOINTS
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: "100%", minWidth: 280, height: H + 18 }}>
          {[0, 50, 100].map(v => (
            <line key={v} x1={0} y1={H - (v / 100) * H} x2={W} y2={H - (v / 100) * H}
              stroke="#1f2d45" strokeWidth="0.4" />
          ))}
          {["D-6","D-5","D-4","D-3","D-2","D-1","Today"].map((d, i) => (
            <text key={d} x={(i / 6) * (W - 20) + 10} y={H + 13}
              textAnchor="middle" fill="#2d3f55" fontSize="7">{d}</text>
          ))}
          {shown.map(cp => {
            const color = riskColor(cp.risk);
            const maxV = Math.max(...cp.history, 1);
            const pts = cp.history.map((v, i) => {
              const x = (i / 6) * (W - 20) + 10;
              const y = H - (v / maxV) * (H - 8);
              return `${x},${y}`;
            }).join(" ");
            const lastV = cp.history[cp.history.length - 1];
            const lastX = W - 10;
            const lastY = H - (lastV / maxV) * (H - 8);
            const isSelected = selected?.id === cp.id;
            return (
              <g key={cp.id}>
                <polyline points={pts} fill="none" stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5} opacity={isSelected ? 1 : 0.6}
                  strokeLinejoin="round" />
                <circle cx={lastX} cy={lastY} r={isSelected ? 3.5 : 2.5} fill={color} />
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
        {shown.map(cp => (
          <div key={cp.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: selected?.id === cp.id ? 16 : 12, height: selected?.id === cp.id ? 2.5 : 2, background: riskColor(cp.risk), borderRadius: 1 }} />
            <span style={{ color: selected?.id === cp.id ? "#e2e8f0" : "#4a5568", fontSize: 9, fontWeight: selected?.id === cp.id ? 700 : 400 }}>
              {cp.name.split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Structured AI assessment panel
function ChokepointAssessment({ result, cp }) {
  if (!result) return null;
  const capColor = c => c === "HIGH" ? "#ff4d4d" : c === "MEDIUM" ? "#ffd700" : "#4db8ff";
  const priorityColor = p => p === "IMMEDIATE" ? "#ff4d4d" : p === "SHORT-TERM" ? "#ffd700" : "#4db8ff";
  return (
    <>
      <Card style={{ borderColor: "#ff9d0033", borderLeft: "3px solid #ff9d00" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <LiveBadge />
          <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI CHOKEPOINT ANALYSIS · {cp?.id}</span>
          <ExportBtn data={result} filename="sentinel-chokepoint" />
        </div>
        <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>{result.geopolitical_situation}</div>

        {result.market_impact && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,130px),1fr))", gap: 8 }}>
            {[
              ["OIL PRICE EFFECT", "+" + result.market_impact.oil_price_increase_pct + "%", "#ff4d4d"],
              ["REROUTING COST", "$" + result.market_impact.rerouting_cost_M + "M/voyage", "#ffd700"],
              ["ADDITIONAL DELAY", result.market_impact.delay_days + " days", "#4db8ff"],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: "#0a1628", borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>{l}</div>
                <div style={{ color: c, fontSize: 16, fontWeight: 900 }}>{v}</div>
              </div>
            ))}
            {result.closure_probability_6mo !== undefined && (
              <div style={{ background: "#0a1628", borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>CLOSURE PROB. (6mo)</div>
                <div style={{ color: result.closure_probability_6mo >= 50 ? "#ff4d4d" : "#ffd700", fontSize: 16, fontWeight: 900 }}>{result.closure_probability_6mo}%</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {result.threat_actors?.length > 0 && (
        <Card>
          <ST icon="🎭" label="Threat Actors" color="#ff4d4d" sub={`${result.threat_actors.length} actors assessed`} style={{ marginBottom: 10 }} />
          {result.threat_actors.map((actor, i) => (
            <div key={i} style={{
              background: "#0d1626", borderRadius: 6, padding: "9px 12px", marginBottom: 7,
              border: "1px solid #1f2d45", borderLeft: `3px solid ${capColor(actor.capability)}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{actor.name}</span>
                <span style={{ color: capColor(actor.capability), fontSize: 10, fontWeight: 700 }}>CAP: {actor.capability}</span>
              </div>
              <div style={{ color: "#9ca3af", fontSize: 11 }}>{actor.intent}</div>
            </div>
          ))}
        </Card>
      )}

      {result.recommendations?.length > 0 && (
        <Card>
          <ST icon="🛡️" label="Recommended Posture" color="#00ff9d" style={{ marginBottom: 10 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,200px),1fr))", gap: 8 }}>
            {result.recommendations.map((r, i) => (
              <div key={i} style={{
                background: "#0a1628", borderRadius: 7, padding: "10px 12px",
                border: "1px solid #1f2d45", borderTop: `2px solid ${priorityColor(r.priority)}`,
              }}>
                <div style={{ color: priorityColor(r.priority), fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>{r.priority}</div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{r.action}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

export default function Chokepoint() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const { stamp } = useLastAnalysis("chokepoint");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [tab, setTab] = useState("map");
  const [cpData, setCpData] = useState(chokepoints);
  const [cpSource, setCpSource] = useState("static");

  useEffect(() => {
    beFetch("/api/maritime/chokepoints")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.chokepoints?.length) {
          setCpData(d.chokepoints);
          setCpSource(d.source || "live");
        }
      })
      .catch(() => {/* keep static fallback */});
  }, []);

  async function analyzeChokepoint(cp) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const result = await callClaude(apiKey,
        `You are a geopolitical energy analyst. Analyze this strategic chokepoint. Return ONLY a JSON object (no markdown, no backticks).

Chokepoint: ${cp.name} (${cp.location}, Flow: ${cp.flow} = ${cp.pct} of global trade, Tension: ${cp.tension})
Active threats: ${cp.threats.join("; ")}
Alternative route: ${cp.altRoute}

Return exactly:
{"geopolitical_situation":"2-3 sentence analysis of current geopolitical context and threat actors","closure_probability_6mo":number_0_to_100,"market_impact":{"oil_price_increase_pct":number,"rerouting_cost_M":number,"delay_days":number},"threat_actors":[{"name":"string","capability":"HIGH|MEDIUM|LOW","intent":"string"}],"recommendations":[{"action":"string","priority":"IMMEDIATE|SHORT-TERM|LONG-TERM"}]}

Include 2-3 threat_actors and 3-4 recommendations.`
      );
      setAiResult(result); setTab("analysis");
      stamp();
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  const TABS = [
    { id: "map", label: "Global Map" },
    { id: "monitor", label: "Monitor" },
    { id: "trend", label: "Flow Trends" },
    ...(aiResult ? [{ id: "analysis", label: "AI Analysis" }] : []),
  ];

  return (
    <div>
      <PageHeader icon="🚢" title="Strategic Chokepoint Monitor" sub="Global maritime energy chokepoints — flow, tension and disruption risk." accent="#ff9d00" dataMode={cpSource === "live" ? "live" : apiKey ? "hybrid" : "mock"} />

      <StatBar stats={[
        { label: "Monitored",          value: String(cpData.length),                                               color: "#ff9d00" },
        { label: "Critical",           value: String(cpData.filter(c => c.risk === "CRITICAL").length),            color: "#ff4d4d" },
        { label: "Extreme Tension",    value: String(cpData.filter(c => c.tension === "Extreme").length),          color: "#ff4d4d" },
        { label: "Rerouting Events",   value: "3",                                                                      color: "#ffd700" },
      ]} />

      {/* Tab navigation */}
      <div style={{ display: "flex", borderBottom: "1px solid #1f2d45", marginBottom: 14, gap: 2, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "map" && (
        <>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px 0", fontWeight: 700, color: "#4db8ff" }}>🗺️ Global Chokepoint Map — Click for detail</div>
            <MapContainer
              center={[20, 15]}
              zoom={2}
              minZoom={1}
              maxZoom={8}
              style={{ height: 380, background: "#050d1a" }}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                maxZoom={8}
              />
              <MapClickHandler onDeselect={() => setSel(null)} />
              {cpData.map(cp => {
                const color = riskColor(cp.risk);
                const isSel = sel?.id === cp.id;
                return (
                  <CircleMarker
                    key={cp.id}
                    center={[cp.lat, cp.lon]}
                    radius={isSel ? 12 : cp.risk === "CRITICAL" ? 10 : cp.risk === "HIGH" ? 8 : 6}
                    pathOptions={{ color, fillColor: color, fillOpacity: isSel ? 0.9 : 0.8, weight: isSel ? 2 : 1 }}
                    eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); setSel(sel?.id === cp.id ? null : cp); } }}
                  />
                );
              })}
            </MapContainer>
          </Card>

          {sel && (
            <Card style={{ borderColor: riskColor(sel.risk), borderWidth: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: "#e2e8f0" }}>{sel.name}</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>{sel.location}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <BADGE text={sel.risk} color={riskBadgeColor(sel.risk)} />
                  <div style={{ color: "#ff9d00", fontWeight: 800, fontSize: 20, marginTop: 4 }}>{sel.flow}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>{sel.pct} of global oil trade</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12, marginBottom: 12 }}>
                <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>ACTIVE THREATS</div>
                  {sel.threats.map((t, i) => <div key={i} style={{ color: "#ffd700", fontSize: 12, marginBottom: 3 }}>• {t}</div>)}
                </div>
                <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>ALTERNATIVE ROUTE</div>
                  <div style={{ color: "#e2e8f0", fontSize: 12 }}>{sel.altRoute}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 8, marginBottom: 2 }}>7-DAY FLOW TREND (Mb/d)</div>
                  <Spark data={sel.history} color={riskColor(sel.risk)} />
                  {sel.acled_events_30d != null && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1f2d45" }}>
                      <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>
                        ACLED — CONFLICT EVENTS (30d)&nbsp;
                        <span style={{ color: sel.acled_events_30d > 10 ? "#ff4d4d" : sel.acled_events_30d > 3 ? "#ffd700" : "#4db8ff", fontWeight: 700 }}>{sel.acled_events_30d}</span>
                      </div>
                      {sel.latest_incident && (
                        <div style={{ color: "#9ca3af", fontSize: 10, fontStyle: "italic", lineHeight: 1.4 }}>{sel.latest_incident}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: 10, marginBottom: 12 }}>
                <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>TENSION LEVEL</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, background: "#1f2d45", borderRadius: 4, height: 10 }}>
                    <div style={{ background: riskColor(sel.risk), height: 10, borderRadius: 4, width: sel.risk === "CRITICAL" ? "95%" : sel.risk === "HIGH" ? "75%" : sel.risk === "MEDIUM" ? "50%" : "25%", transition: "width 1s" }} />
                  </div>
                  <span style={{ color: riskColor(sel.risk), fontWeight: 700, fontSize: 14 }}>{sel.tension}</span>
                </div>
              </div>
              {apiKey && (
                <Btn onClick={() => analyzeChokepoint(sel)} disabled={aiLoading} color="#ff9d00" size="sm">
                  {aiLoading ? "⏳ Analyzing..." : "🤖 AI Geopolitical Analysis"}
                </Btn>
              )}
              <LastAnalysisTag toolId="chokepoint" />
              {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
            </Card>
          )}
        </>
      )}

      {tab === "monitor" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {cpData.map(cp => (
            <Card key={cp.id}
              style={{ cursor: "pointer", borderColor: sel?.id === cp.id ? riskColor(cp.risk) : "#1f2d45", padding: 14 }}
              onClick={() => { setSel(sel?.id === cp.id ? null : cp); setTab("map"); }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{cp.name}</div>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>{cp.location}</div>
                </div>
                <BADGE text={cp.risk} color={riskBadgeColor(cp.risk)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                <div>
                  <div style={{ color: "#ff9d00", fontWeight: 800, fontSize: 18 }}>{cp.flow}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>{cp.pct} of global trade</div>
                </div>
                <Spark data={cp.history} color={riskColor(cp.risk)} />
              </div>
              <div style={{ background: "#1f2d45", borderRadius: 3, height: 5 }}>
                <div style={{ background: riskColor(cp.risk), height: 5, borderRadius: 3, width: cp.risk === "CRITICAL" ? "95%" : cp.risk === "HIGH" ? "75%" : cp.risk === "MEDIUM" ? "50%" : "25%" }} />
              </div>
              <div style={{ color: "#4a5568", fontSize: 10, marginTop: 6 }}>
                {cp.tension} tension · {cp.threats.length} active threat{cp.threats.length !== 1 ? "s" : ""}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "trend" && (
        <>
          <Card>
            <ST icon="📈" label="Global Flow Trend Comparison" color="#ff9d00"
              sub="7-day flow for high/critical chokepoints · bold = selected" style={{ marginBottom: 14 }} />
            <GlobalFlowTrendChart data={cpData} selected={sel} />
          </Card>
          {/* Rerouting cost matrix */}
          <Card>
            <ST icon="🔀" label="Closure Impact Summary" color="#ff4d4d"
              sub="Disruption severity at a glance" style={{ marginBottom: 12 }} />
            {cpData.filter(cp => cp.risk === "CRITICAL" || cp.risk === "HIGH").map(cp => (
              <div key={cp.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "#0d1626", borderRadius: 6, padding: "8px 12px", marginBottom: 6,
                borderLeft: `3px solid ${riskColor(cp.risk)}`,
              }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{cp.name}</div>
                  <div style={{ color: "#4a5568", fontSize: 10 }}>{cp.location}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#ff9d00", fontWeight: 800 }}>{cp.flow}</div>
                  <div style={{ color: "#9ca3af", fontSize: 10 }}>{cp.altRoute.split(" ")[0] === "None" ? "No alternative" : cp.altRoute.split("(")[1]?.replace(")", "") || cp.altRoute.slice(0, 20)}</div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {tab === "analysis" && aiResult && (
        <ChokepointAssessment result={aiResult} cp={sel} />
      )}
    </div>
  );
}
