import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BADGE, Card, ST, PageHeader, StatBar, Spark, Btn, LiveBadge, riskColor, riskBadgeColor } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 750, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
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

function MapClickHandler({ onDeselect }) {
  useMapEvents({ click: onDeselect });
  return null;
}

export default function Chokepoint() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function analyzeChokepoint(cp) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey, `You are a geopolitical energy analyst. Analyze this strategic chokepoint in 3-4 sentences covering: current geopolitical situation, threat actors and their intent, economic impact of a closure, and recommended diplomatic/military posture. Chokepoint: ${cp.name} (${cp.location}, Flow: ${cp.flow} = ${cp.pct} of global trade, Tension: ${cp.tension}). Active threats: ${cp.threats.join("; ")}.`);
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  return (
    <div>
      <PageHeader icon="🚢" title="Strategic Chokepoint Monitor" sub="Global maritime energy chokepoints — flow, tension and disruption risk." accent="#ff9d00" dataMode={apiKey ? "hybrid" : "mock"} />

      <StatBar stats={[
        { label: "Monitored",          value: String(chokepoints.length),                                               color: "#ff9d00" },
        { label: "Critical",           value: String(chokepoints.filter(c => c.risk === "CRITICAL").length),            color: "#ff4d4d" },
        { label: "Extreme Tension",    value: String(chokepoints.filter(c => c.tension === "Extreme").length),          color: "#ff4d4d" },
        { label: "Rerouting Events",   value: "3",                                                                      color: "#ffd700" },
      ]} />

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
          {chokepoints.map(cp => {
            const color = riskColor(cp.risk);
            const isSel = sel?.id === cp.id;
            return (
              <CircleMarker
                key={cp.id}
                center={[cp.lat, cp.lon]}
                radius={isSel ? 12 : cp.risk === "CRITICAL" ? 10 : cp.risk === "HIGH" ? 8 : 6}
                pathOptions={{
                  color, fillColor: color,
                  fillOpacity: isSel ? 0.9 : 0.8,
                  weight: isSel ? 2 : 1,
                }}
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
          {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
          {aiResult && (
            <div style={{ background: "#0a0c00", border: "1px solid #ff9d0033", borderLeft: "3px solid #ff9d00", borderRadius: 6, padding: 12, marginTop: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <LiveBadge />
                <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI CHOKEPOINT ANALYSIS · {sel.id}</span>
              </div>
              <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7 }}>{aiResult}</div>
            </div>
          )}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
        {chokepoints.map(cp => (
          <Card key={cp.id} style={{ cursor: "pointer", borderColor: sel?.id === cp.id ? riskColor(cp.risk) : "#1f2d45", padding: 14 }}
            onClick={() => setSel(sel?.id === cp.id ? null : cp)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{cp.name}</div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>{cp.location}</div>
              </div>
              <BADGE text={cp.risk} color={riskBadgeColor(cp.risk)} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ color: "#ff9d00", fontWeight: 800, fontSize: 18 }}>{cp.flow}</div>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>{cp.pct} of global trade</div>
              </div>
              <Spark data={cp.history} color={riskColor(cp.risk)} />
            </div>
            <div style={{ background: "#1f2d45", borderRadius: 3, height: 5, marginTop: 8 }}>
              <div style={{ background: riskColor(cp.risk), height: 5, borderRadius: 3, width: cp.risk === "CRITICAL" ? "95%" : cp.risk === "HIGH" ? "75%" : cp.risk === "MEDIUM" ? "50%" : "25%" }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
