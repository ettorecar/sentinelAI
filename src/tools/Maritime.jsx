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

const VESSELS = [
  { mmsi: "247123456", name: "ADRIATICA SUN",  flag: "🇮🇹", anomaly: "AIS blackout 6h",            risk: "HIGH",   type: "Cargo",     speed: "0.0 kn",  course: "N/A",  lat: 40.5, lon: 18.5 },
  { mmsi: "212987654", name: "AEGEAN STAR",    flag: "🇬🇷", anomaly: "Unusual anchorage",           risk: "MEDIUM", type: "Tanker",    speed: "0.4 kn",  course: "217°", lat: 37.5, lon: 23.5 },
  { mmsi: "538001234", name: "PACIFIC WOLF",   flag: "🇲🇭", anomaly: "Speed anomaly +8 kn",         risk: "MEDIUM", type: "Bulk",      speed: "19.2 kn", course: "084°", lat: 39.0, lon: 20.0 },
  { mmsi: "636091234", name: "LIBERIA MOON",   flag: "🇱🇷", anomaly: "None",                        risk: "LOW",    type: "Container", speed: "14.1 kn", course: "262°", lat: 37.0, lon: 12.0 },
  { mmsi: "311000450", name: "ATLAS PRIME",    flag: "🇧🇸", anomaly: "Dark ship rendezvous",        risk: "HIGH",   type: "Tanker",    speed: "1.1 kn",  course: "008°", lat: 33.5, lon: -7.5 },
  { mmsi: "477123789", name: "ORIENT TIGER",   flag: "🇨🇳", anomaly: "Identity spoofing suspected", risk: "HIGH",   type: "Tanker",    speed: "8.2 kn",  course: "135°", lat: 36.5, lon: 28.0 },
  { mmsi: "319001234", name: "CAYMAN GHOST",   flag: "🇰🇾", anomaly: "AIS blackout 18h",            risk: "HIGH",   type: "Cargo",     speed: "0.0 kn",  course: "N/A",  lat: 35.5, lon: 14.0 },
  { mmsi: "255801234", name: "NOVA MERCATOR",  flag: "🇵🇹", anomaly: "Unusual speed reduction",     risk: "LOW",    type: "Container", speed: "9.1 kn",  course: "022°", lat: 36.5, lon:  5.5 },
  { mmsi: "229034567", name: "MARE NERO",      flag: "🇲🇹", anomaly: "Loitering near chokepoint",   risk: "MEDIUM", type: "Tanker",    speed: "2.3 kn",  course: "180°", lat: 36.0, lon: 21.5 },
  { mmsi: "441012345", name: "SEOUL DAWN",     flag: "🇰🇷", anomaly: "None",                        risk: "LOW",    type: "Container", speed: "18.7 kn", course: "280°", lat: 36.5, lon: 29.5 },
  { mmsi: "355012345", name: "PANAMA GHOST",   flag: "🇵🇦", anomaly: "Shadow fleet suspected",      risk: "HIGH",   type: "Tanker",    speed: "11.4 kn", course: "310°", lat: 36.0, lon: -5.5 },
  { mmsi: "205012345", name: "BALTIC EAGLE",   flag: "🇧🇪", anomaly: "Possible GNSS spoofing",      risk: "MEDIUM", type: "Bulk",      speed: "5.6 kn",  course: "045°", lat: 42.0, lon: 16.0 },
];

function MapClickHandler({ onDeselect }) {
  useMapEvents({ click: onDeselect });
  return null;
}

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
      try { localStorage.setItem("sentinel_prefill_maritime", text.slice(0, 300)); } catch {}
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
          <span style={{ color: "#4a5568", fontSize: 10 }}>LIVE AIS</span>
        </div>
        <MapContainer
          center={[36, 14]}
          zoom={5}
          minZoom={3}
          maxZoom={10}
          style={{ height: 340, background: "#050d1a" }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={10}
          />
          <MapClickHandler onDeselect={() => { setSel(null); setAiResult(null); }} />
          {VESSELS.map(v => {
            const color = rc(v.risk);
            const isSel = sel?.mmsi === v.mmsi;
            return (
              <CircleMarker
                key={v.mmsi}
                center={[v.lat, v.lon]}
                radius={isSel ? 10 : v.risk === "HIGH" ? 7 : 5}
                pathOptions={{
                  color, fillColor: color,
                  fillOpacity: isSel ? 0.9 : 0.75,
                  weight: isSel ? 2 : 1,
                }}
                eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); selectVessel(v); } }}
              />
            );
          })}
        </MapContainer>

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
