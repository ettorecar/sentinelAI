import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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

  async function analyzeAsset(a) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey,
        `You are an energy security analyst. Assess this oil & gas infrastructure threat in 3-4 sentences covering: attack vector analysis, geopolitical context, supply impact, and recommended protective measures. Asset: ${a.name} (${a.country}, Type: ${a.type}, Flow: ${a.barrel}, Risk: ${a.risk}). Incident: ${a.incident}.`
      );
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  function selectAsset(a) {
    setSel(sel?.id === a.id ? null : a);
    setAiResult(null); setAiError("");
  }

  const filtered = filter === "ALL" ? ASSETS : ASSETS.filter(a => a.risk === filter);

  return (
    <div>
      <PageHeader icon="🛢️" title="Oil & Gas Infrastructure Monitor" sub="Real-time threat assessment for critical energy infrastructure worldwide." accent="#ff9d00" dataMode={apiKey ? "hybrid" : "mock"} />

      <StatBar stats={[
        { label: "Monitored Assets", value: "47",       color: "#ff9d00" },
        { label: "Critical Threats", value: "2",        color: "#ff4d4d" },
        { label: "At-Risk Flow",     value: "18.1Mb/d", color: "#ffd700" },
        { label: "Incidents (24h)",  value: "7",        color: "#4db8ff" },
      ]} />

      {/* Map */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
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
                pathOptions={{
                  color, fillColor: color,
                  fillOpacity: isSel ? 0.9 : 0.8,
                  weight: isSel ? 2 : 1,
                }}
                eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); selectAsset(a); } }}
              />
            );
          })}
        </MapContainer>

        {/* Selected asset detail */}
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
            {aiResult && (
              <div style={{ background: "#0a0c00", border: "1px solid #ff9d0033", borderLeft: "3px solid #ff9d00", borderRadius: 6, padding: 12, marginTop: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <LiveBadge />
                  <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI ASSET THREAT ASSESSMENT · {sel.id}</span>
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.7 }}>{aiResult}</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Incident log */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <ST icon="⚠️" label="Incident Log" color="#ff9d00" sub={`${filtered.length} assets · sorted by date`} />
          <div style={{ display: "flex", gap: 5 }}>
            {["ALL","CRITICAL","HIGH","MEDIUM","LOW"].map(f => (
              <FilterBtn key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
            ))}
          </div>
        </div>
        {filtered.map(a => (
          <IncidentRow key={a.id} a={a} selected={sel?.id === a.id} onClick={() => selectAsset(a)} />
        ))}
      </Card>
    </div>
  );
}
