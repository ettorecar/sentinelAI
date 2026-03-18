import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BADGE, Card, ST, PageHeader, StatBar, Spark, Btn, LiveBadge } from "../components/shared";
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

// E3 — lat/lon + R₀ added to alert data
const ALERTS = [
  { id: "BT-2026-031", region: "Eastern Balkans", signal: "Unusual pneumonia cluster",        sources: 4,  confidence: 72, level: "HIGH",     date: "13/03", type: "Respiratory",  trend: [12,15,14,18,22,28,35], lat: 42,  lon: 25,  r0: 1.8 },
  { id: "BT-2026-028", region: "Central Asia",    signal: "Livestock mass mortality",         sources: 6,  confidence: 65, level: "MEDIUM",   date: "11/03", type: "Zoonotic",     trend: [8,8,10,9,12,11,14],    lat: 43,  lon: 68,  r0: 0.9 },
  { id: "BT-2026-019", region: "West Africa",     signal: "Haemorrhagic fever signals",      sources: 8,  confidence: 81, level: "HIGH",     date: "07/03", type: "Haemorrhagic", trend: [30,35,40,38,45,50,48], lat: 12,  lon: -10, r0: 2.4 },
  { id: "BT-2026-003", region: "Horn of Africa",  signal: "Cholera, elevated fatality rate", sources: 11, confidence: 93, level: "CRITICAL", date: "21/02", type: "Enteric",      trend: [60,70,80,75,90,95,100],lat: 10,  lon: 44,  r0: 3.1 },
];

const lc = level => level === "CRITICAL" ? "#ff0000" : level === "HIGH" ? "#ff4d4d" : level === "MEDIUM" ? "#ffd700" : "#00ff9d";
const lb = level => level === "CRITICAL" || level === "HIGH" ? "red" : level === "MEDIUM" ? "yellow" : "green";

function ConfidenceBar({ value, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1 }}>CONFIDENCE</span>
        <span style={{ color, fontSize: 10, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ background: "#111827", borderRadius: 2, height: 4 }}>
        <div style={{ background: color, height: 4, borderRadius: 2, width: `${value}%`, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// E3 — R₀ gauge with color bands
function R0Gauge({ r0 }) {
  const pct = Math.min(100, (r0 / 5) * 100);
  const color = r0 >= 2.5 ? "#ff4d4d" : r0 >= 1.5 ? "#ffd700" : "#00ff9d";
  const label = r0 >= 2.5 ? "EPIDEMIC POTENTIAL" : r0 >= 1.5 ? "SPREADING" : "CONTAINED";
  return (
    <div style={{ background: "#0a1628", borderRadius: 6, padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1 }}>ESTIMATED R₀</span>
        <div>
          <span style={{ color, fontWeight: 900, fontSize: 20, lineHeight: 1 }}>{r0.toFixed(1)}</span>
          <span style={{ color, fontSize: 9, marginLeft: 6, fontWeight: 700 }}>{label}</span>
        </div>
      </div>
      <div style={{ position: "relative", background: "#111827", borderRadius: 4, height: 10, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: "30%", height: "100%", background: "#00ff9d18" }} />
        <div style={{ position: "absolute", left: "30%", top: 0, width: "20%", height: "100%", background: "#ffd70018" }} />
        <div style={{ position: "absolute", left: "50%", top: 0, width: "50%", height: "100%", background: "#ff4d4d18" }} />
        <div style={{ background: color, height: "100%", width: `${pct}%`, borderRadius: 4, transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        {["R₀=0", "1.0", "2.5", "5.0"].map(l => (
          <span key={l} style={{ color: "#2d3f55", fontSize: 8 }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function AlertRow({ a, selected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const color = lc(a.level);
  const active = selected || hovered;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? "#141e30" : hovered ? "#0f1a2e" : "#0d1626",
        border: `1px solid ${selected ? color + "55" : hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${active ? color : color + "66"}`,
        borderRadius: 8, padding: "11px 12px", marginBottom: 7,
        cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>{a.id} · {a.date}</div>
          <div style={{ fontWeight: 700, color: selected ? "#ffffff" : "#e2e8f0", fontSize: 14, marginBottom: 2 }}>{a.region}</div>
          <div style={{ color: "#9ca3af", fontSize: 12 }}>{a.signal}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, marginLeft: 12 }}>
          <BADGE text={a.level} color={lb(a.level)} />
          <Spark data={a.trend} color={color} />
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "monospace" }}>{a.confidence}% conf</span>
        </div>
      </div>

      {selected && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1f2d45" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 120px), 1fr))", gap: 8, marginBottom: 12 }}>
            {[["TYPE", a.type, "#4db8ff"], ["SOURCES", String(a.sources), "#e2e8f0"], ["STATUS", "Monitoring", "#ffd700"]].map(([label, value, textColor]) => (
              <div key={label} style={{ background: "#0a1628", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                <div style={{ color: textColor, fontSize: 12, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <ConfidenceBar value={a.confidence} color={color} />
          </div>
          {/* E3 — R₀ gauge in expanded row */}
          <R0Gauge r0={a.r0} />
        </div>
      )}
    </div>
  );
}

function MapClickHandler({ onDeselect }) {
  useMapEvents({ click: onDeselect });
  return null;
}

function BioWorldMap({ alerts, selected, onSelect }) {
  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #1f2d45" }}>
      <MapContainer
        center={[20, 15]}
        zoom={2}
        minZoom={1}
        maxZoom={8}
        style={{ height: 340, background: "#050c1a" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={8}
        />
        <MapClickHandler onDeselect={() => onSelect(null)} />
        {alerts.map(a => {
          const color = lc(a.level);
          const isSel = selected?.id === a.id;
          return (
            <CircleMarker
              key={a.id}
              center={[a.lat, a.lon]}
              radius={isSel ? 10 : a.level === "CRITICAL" ? 8 : a.level === "HIGH" ? 6 : 5}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isSel ? 0.9 : 0.7,
                weight: isSel ? 2 : 1,
                opacity: 1,
              }}
              eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); onSelect(a); } }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}

// E3 — 7-day multi-alert intensity timeline
function AlertTimeline({ alerts }) {
  const W = 340, H = 65;
  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>7-DAY SIGNAL INTENSITY TIMELINE</div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: "100%", minWidth: 240, height: H + 18 }}>
          {[0, 50, 100].map(v => (
            <line key={v} x1={0} y1={H - (v / 100) * H} x2={W} y2={H - (v / 100) * H}
              stroke="#1f2d45" strokeWidth="0.4" />
          ))}
          {["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Today"].map((d, i) => (
            <text key={d} x={(i / 6) * (W - 20) + 10} y={H + 13}
              textAnchor="middle" fill="#2d3f55" fontSize="7">{d}</text>
          ))}
          {alerts.map(a => {
            const color = lc(a.level);
            const pts = a.trend.map((v, i) => {
              const x = (i / 6) * (W - 20) + 10;
              const y = H - (v / 100) * (H - 6);
              return `${x},${y}`;
            }).join(" ");
            const lastV = a.trend[a.trend.length - 1];
            const lastX = W - 10;
            const lastY = H - (lastV / 100) * (H - 6);
            return (
              <g key={a.id}>
                <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" opacity="0.85" strokeLinejoin="round" />
                <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
        {alerts.map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 14, height: 2, background: lc(a.level), borderRadius: 1 }} />
            <span style={{ color: "#4a5568", fontSize: 9 }}>{a.id} — {a.region}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BioThreat() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  function selectAlert(a) {
    setSel(sel?.id === a.id ? null : a);
    setAiResult(null);
    setAiError("");
  }

  async function analyzeAlert(a) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey,
        `You are a biosurveillance intelligence analyst. Assess this epidemiological signal in 3-4 sentences covering: likely pathogen profile, transmission risk, weaponization potential, and recommended health security posture. Signal: ${a.id} — ${a.region}: ${a.signal} (Type: ${a.type}, Confidence: ${a.confidence}%, Level: ${a.level}, R₀ estimate: ${a.r0}).`
      );
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  return (
    <div>
      <PageHeader
        icon="🦠"
        title="Bio-Threat Early Warning"
        sub="Epidemiological signal aggregation, biosurveillance, and pathogen intelligence."
        accent="#00ff9d"
        dataMode={apiKey ? "hybrid" : "mock"}
      />

      <StatBar stats={[
        { label: "Active Alerts", value: "14",   color: "#ff4d4d" },
        { label: "Critical",      value: "1",    color: "#ff0000" },
        { label: "Regions",       value: "47",   color: "#4db8ff" },
        { label: "Sources",       value: "230+", color: "#00ff9d" },
      ]} />

      {/* E3 — SVG world map */}
      <Card>
        <ST icon="🌍" label="Global Biosurveillance Map" color="#00ff9d"
          sub="Click alert dots or list rows to expand · pulsing = active signal" style={{ marginBottom: 10 }} />
        <BioWorldMap alerts={ALERTS} selected={sel} onSelect={selectAlert} />
        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          {[["CRITICAL", "#ff0000"], ["HIGH", "#ff4d4d"], ["MEDIUM", "#ffd700"]].map(([l, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
              <span style={{ color: "#4a5568", fontSize: 10 }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <ST icon="🚨" label="Active Signals" color="#ff4d4d" sub="Ranked by threat level · click to expand" />
        {ALERTS.map(a => (
          <AlertRow key={a.id} a={a} selected={sel?.id === a.id} onSelect={() => selectAlert(a)} />
        ))}

        {sel && apiKey && (
          <div style={{ marginTop: 4, paddingLeft: 3 }}>
            <Btn onClick={() => analyzeAlert(sel)} disabled={aiLoading} color="#00ff9d" size="sm">
              {aiLoading ? "⏳ Analyzing..." : "🤖 AI Bio Assessment"}
            </Btn>
          </div>
        )}
        {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
      </Card>

      {aiResult && (
        <Card style={{ borderColor: "#00ff9d33", borderLeft: "3px solid #00ff9d" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <LiveBadge />
            <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>
              AI BIOSURVEILLANCE ASSESSMENT · {sel?.id}
            </span>
          </div>
          <div style={{ color: "#4a5568", fontSize: 11, marginBottom: 10 }}>
            {sel?.region} — {sel?.signal}
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7 }}>{aiResult}</div>
        </Card>
      )}

      {/* E3 — 7-day timeline */}
      <Card>
        <AlertTimeline alerts={ALERTS} />
      </Card>
    </div>
  );
}
