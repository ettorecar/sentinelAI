import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BADGE, Card, PageHeader, StatBar, Btn, LiveBadge, Pulse } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

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

// lat/lon added for Leaflet rendering
const hotspots = [
  { id: 1,  lat: 48.5,  lon: 37.5,   label: "Eastern Ukraine",    type: "Kinetic",       level: "CRITICAL", actors: "APT-1887 + ground forces" },
  { id: 2,  lat: 14.0,  lon: 113.0,  label: "South China Sea",    type: "Maritime",      level: "HIGH",     actors: "PLAN vessels, AIS spoofing" },
  { id: 3,  lat: 14.5,  lon: 2.0,    label: "Sahel Region",       type: "Terrorism",     level: "HIGH",     actors: "Multiple non-state actors" },
  { id: 4,  lat: 57.5,  lon: 19.0,   label: "Baltic Sea",         type: "Hybrid",        level: "HIGH",     actors: "Undersea cable interference" },
  { id: 5,  lat: 10.5,  lon: 44.0,   label: "Horn of Africa",     type: "Bio+Piracy",    level: "MEDIUM",   actors: "BT-2026-003 + maritime" },
  { id: 6,  lat: 24.0,  lon: 120.5,  label: "Taiwan Strait",      type: "Cyber+Naval",   level: "CRITICAL", actors: "IRON CARDINAL + PLAN" },
  { id: 7,  lat: 26.0,  lon: 53.0,   label: "Persian Gulf",       type: "Maritime",      level: "MEDIUM",   actors: "Tanker harassment ops" },
  { id: 8,  lat: 42.5,  lon: 26.0,   label: "Eastern Balkans",    type: "Bio+Disinfo",   level: "HIGH",     actors: "BT-2026-031 + EMBER WOLF" },
  { id: 9,  lat: 7.0,   lon: -66.0,  label: "Venezuela",          type: "Cyber",         level: "MEDIUM",   actors: "Criminal syndicate APT" },
  { id: 10, lat: 40.0,  lon: 127.0,  label: "North Korea",        type: "Cyber+ICBM",    level: "CRITICAL", actors: "State APT cluster" },
  { id: 11, lat: 34.5,  lon: 38.5,   label: "Syria / Levant",     type: "Hybrid",        level: "HIGH",     actors: "Multiple armed factions" },
  { id: 12, lat: 27.5,  lon: 17.0,   label: "Libya",              type: "Terrorism",     level: "MEDIUM",   actors: "Rival militias, foreign mercenaries" },
  { id: 13, lat: 34.0,  lon: 74.5,   label: "Kashmir LoC",        type: "Kinetic",       level: "HIGH",     actors: "Pak-India border incidents" },
  { id: 14, lat: 19.5,  lon: 96.5,   label: "Myanmar",            type: "Hybrid",        level: "HIGH",     actors: "Military junta, resistance forces" },
  { id: 15, lat: 14.5,  lon: 46.5,   label: "Yemen / Aden",       type: "Maritime",      level: "CRITICAL", actors: "Houthi naval units" },
  { id: 16, lat: -1.5,  lon: 28.5,   label: "DRC / Kivu",         type: "Terrorism",     level: "HIGH",     actors: "M23, FDLR, armed actors" },
  { id: 17, lat: 15.5,  lon: 31.5,   label: "Sudan",              type: "Kinetic",       level: "HIGH",     actors: "SAF vs RSF — active civil war" },
  { id: 18, lat: -15.5, lon: 37.5,   label: "Mozambique",         type: "Terrorism",     level: "MEDIUM",   actors: "ASWJ insurgency, Cabo Delgado" },
  { id: 19, lat: 4.5,   lon: -74.0,  label: "Colombia",           type: "Terrorism",     level: "MEDIUM",   actors: "FARC dissidents, ELN remnants" },
  { id: 20, lat: 78.5,  lon: 17.0,   label: "Arctic / Svalbard",  type: "Hybrid",        level: "MEDIUM",   actors: "Russian Arctic brigade" },
  { id: 21, lat: 40.5,  lon: 47.0,   label: "Armenia-Azerbaijan", type: "Kinetic",       level: "MEDIUM",   actors: "Post-Karabakh tensions" },
  { id: 22, lat: 32.5,  lon: 51.5,   label: "Iran Nuclear Sites", type: "Cyber+Kinetic", level: "HIGH",     actors: "State actors, covert ops" },
  { id: 23, lat: 12.0,  lon: 121.0,  label: "Philippines / WPS",  type: "Maritime",      level: "HIGH",     actors: "PLA Navy, BRP standoff" },
  { id: 24, lat: 47.5,  lon: 29.5,   label: "Transnistria",       type: "Hybrid",        level: "MEDIUM",   actors: "Russian forces, border friction" },
  { id: 25, lat: 30.5,  lon: 33.5,   label: "Sinai Peninsula",    type: "Terrorism",     level: "MEDIUM",   actors: "IS-Sinai remnants" },
];

const typeColor = t =>
  t === "Kinetic"                          ? "#ff4d4d"
  : t === "Cyber" || t.startsWith("Cyber") ? "#4db8ff"
  : t === "Maritime"                        ? "#00cfff"
  : t === "Terrorism"                       ? "#ff9d00"
  : t.startsWith("Bio")                     ? "#00ff9d"
  : "#b47fff";

const levelColor = l =>
  l === "CRITICAL" ? "#ff4d4d" : l === "HIGH" ? "#ff9d00" : l === "MEDIUM" ? "#ffd700" : "#00ff9d";

const TYPE_FILTERS = [
  { id: "ALL",       label: "All",       color: "#9ca3af" },
  { id: "Kinetic",   label: "Kinetic",   color: "#ff4d4d" },
  { id: "Cyber",     label: "Cyber",     color: "#4db8ff" },
  { id: "Maritime",  label: "Maritime",  color: "#00cfff" },
  { id: "Terrorism", label: "Terror",    color: "#ff9d00" },
  { id: "Bio",       label: "Bio",       color: "#00ff9d" },
  { id: "Hybrid",    label: "Hybrid",    color: "#b47fff" },
];
const LEVEL_FILTERS = ["ALL", "CRITICAL", "HIGH", "MEDIUM"];

function matchType(type, filter) {
  if (filter === "ALL") return true;
  if (filter === "Cyber") return type === "Cyber" || type.startsWith("Cyber");
  if (filter === "Bio") return type.startsWith("Bio");
  return type === filter || type.startsWith(filter + "+");
}

// Deselects hotspot when user clicks the map background
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: onMapClick });
  return null;
}

export default function ThreatMap() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [filterType, setFilterType] = useState(() => {
    try { return localStorage.getItem("sentinel-threatmap-type") || "ALL"; } catch { return "ALL"; }
  });
  const [filterLevel, setFilterLevel] = useState(() => {
    try { return localStorage.getItem("sentinel-threatmap-level") || "ALL"; } catch { return "ALL"; }
  });

  const visible = hotspots.filter(h =>
    matchType(h.type, filterType) && (filterLevel === "ALL" || h.level === filterLevel)
  );

  function selectHotspot(h) {
    setSel(sel?.id === h.id ? null : h);
    setAiResult(null); setAiError("");
  }

  async function analyzeHotspot(h) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey,
        `You are a senior intelligence analyst. Provide a concise threat assessment for: ${h.label} (Type: ${h.type}, Level: ${h.level}, Actors: ${h.actors}). Return plain text — 3-4 sentences covering: current situation, key actors, immediate risks, and recommended posture.`
      );
      setAiResult(text);
      try { localStorage.setItem("sentinel_prefill_threatmap", text.slice(0, 300)); } catch {}
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  return (
    <div>
      <PageHeader
        icon="🌍"
        title="Global Threat Map"
        sub="Real-time geolocation of active threat incidents worldwide."
        accent="#ff4d4d"
        dataMode={apiKey ? "hybrid" : "mock"}
        classification="SECRET"
        badges={[{ text: "25 Hotspots", color: "#ff4d4d" }, { text: "Live", color: "#00ff9d" }]}
      />

      <StatBar stats={[
        { label: "Active Conflicts", value: "7",   color: "#ff4d4d" },
        { label: "Cyber Incidents",  value: "143", color: "#4db8ff" },
        { label: "Maritime Alerts",  value: "12",  color: "#00cfff" },
        { label: "Bio Signals",      value: "14",  color: "#00ff9d" },
      ]} />

      {/* Leaflet Map */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ background: "#0d1626", borderBottom: "1px solid #1f2d45", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <Pulse color="#ff4d4d" size={7} />
          <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>LIVE THREAT OVERLAY</span>
          <span style={{ marginLeft: "auto", color: "#3a4a5c", fontSize: 10 }}>Scroll = zoom · drag = pan · click marker = dettaglio</span>
        </div>
        <div style={{ height: 420 }}>
          <MapContainer
            center={[20, 15]}
            zoom={2}
            minZoom={1}
            maxZoom={8}
            style={{ height: "100%", width: "100%", background: "#050d1a" }}
            scrollWheelZoom
          >
            {/* CartoDB Dark Matter — free, no token */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              subdomains="abcd"
            />
            <MapClickHandler onMapClick={() => setSel(null)} />

            {/* Filtered-out hotspots: dim */}
            {hotspots.filter(h => !visible.find(v => v.id === h.id)).map(h => (
              <CircleMarker
                key={`dim-${h.id}`}
                center={[h.lat, h.lon]}
                radius={4}
                pathOptions={{ color: "#1a2535", fillColor: "#1a2535", fillOpacity: 0.5, weight: 0 }}
              />
            ))}

            {/* Visible hotspots */}
            {visible.map(h => {
              const c = typeColor(h.type);
              const isSel = sel?.id === h.id;
              const r = h.level === "CRITICAL" ? 9 : h.level === "HIGH" ? 7 : 5;
              return [
                // Outer pulse ring for CRITICAL
                h.level === "CRITICAL" && (
                  <Circle
                    key={`ring-${h.id}`}
                    center={[h.lat, h.lon]}
                    radius={isSel ? 350000 : 280000}
                    pathOptions={{ color: c, fillColor: c, fillOpacity: 0.04, weight: 1, opacity: 0.45 }}
                  />
                ),
                // Main marker
                <CircleMarker
                  key={h.id}
                  center={[h.lat, h.lon]}
                  radius={isSel ? r + 3 : r}
                  pathOptions={{
                    color: c,
                    fillColor: c,
                    fillOpacity: isSel ? 0.95 : 0.75,
                    weight: isSel ? 2.5 : 1.5,
                  }}
                  eventHandlers={{
                    click: e => { e.originalEvent.stopPropagation(); selectHotspot(h); },
                  }}
                />,
                // Selected label ring
                isSel && (
                  <Circle
                    key={`sel-${h.id}`}
                    center={[h.lat, h.lon]}
                    radius={150000}
                    pathOptions={{ color: c, fillColor: "none", fillOpacity: 0, weight: 1.5, dashArray: "4 3", opacity: 0.7 }}
                  />
                ),
              ].filter(Boolean);
            })}
          </MapContainer>
        </div>

        {/* Legend */}
        <div style={{ background: "#0d1626", borderTop: "1px solid #1f2d45", padding: "7px 14px", display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[["Kinetic","#ff4d4d"],["Cyber","#4db8ff"],["Maritime","#00cfff"],["Bio","#00ff9d"],["Terrorism","#ff9d00"],["Hybrid","#b47fff"]].map(([l,c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.85 }} />
              <span style={{ color: "#4a5568", fontSize: 9 }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected hotspot detail */}
      {sel && (
        <Card style={{ borderLeft: `3px solid ${typeColor(sel.type)}`, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 3, marginBottom: 4 }}>HOTSPOT DETAIL</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#e2e8f0" }}>{sel.label}</div>
              <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{ color: "#4a5568", fontSize: 11 }}>Type <span style={{ color: typeColor(sel.type), fontWeight: 700 }}>{sel.type}</span></span>
                <span style={{ color: "#4a5568", fontSize: 11 }}>Actors <span style={{ color: "#ffd700", fontWeight: 600 }}>{sel.actors}</span></span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <BADGE text={sel.level} color={levelColor(sel.level)} />
              <button onClick={() => setSel(null)} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#4a5568", fontSize: 10, padding: "2px 8px", cursor: "pointer" }}>✕ close</button>
            </div>
          </div>
          {apiKey && (
            <Btn onClick={() => analyzeHotspot(sel)} disabled={aiLoading} color="#4db8ff">
              {aiLoading ? "Analyzing..." : "AI Threat Assessment"}
            </Btn>
          )}
          {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
          {aiResult && (
            <div style={{ background: "#0d1626", borderRadius: 6, padding: 14, marginTop: 12, borderLeft: "3px solid #00ff9d" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                <LiveBadge />
                <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI ASSESSMENT</span>
              </div>
              <div style={{ color: "#c9d1da", fontSize: 13, lineHeight: 1.7 }}>{aiResult}</div>
            </div>
          )}
        </Card>
      )}

      {/* Filters */}
      <Card style={{ padding: "12px 14px", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginRight: 2 }}>TYPE</span>
            {TYPE_FILTERS.map(f => {
              const active = filterType === f.id;
              return (
                <button key={f.id} onClick={() => { setFilterType(f.id); setSel(null); try { localStorage.setItem("sentinel-threatmap-type", f.id); } catch {} }} style={{
                  background: active ? f.color : "#1f2d45",
                  color: active ? "#0a0f1e" : "#9ca3af",
                  border: `1px solid ${active ? f.color : "transparent"}`,
                  borderRadius: 4, padding: "3px 9px", cursor: "pointer", fontSize: 10, fontWeight: active ? 700 : 400,
                  transition: "all 0.15s",
                }}>{f.label}</button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginRight: 2 }}>LEVEL</span>
            {LEVEL_FILTERS.map(f => {
              const active = filterLevel === f;
              const fc = f === "CRITICAL" ? "#ff4d4d" : f === "HIGH" ? "#ff9d00" : f === "MEDIUM" ? "#ffd700" : "#9ca3af";
              return (
                <button key={f} onClick={() => { setFilterLevel(f); setSel(null); try { localStorage.setItem("sentinel-threatmap-level", f); } catch {} }} style={{
                  background: active ? fc : "#1f2d45",
                  color: active ? "#0a0f1e" : "#9ca3af",
                  border: `1px solid ${active ? fc : "transparent"}`,
                  borderRadius: 4, padding: "3px 9px", cursor: "pointer", fontSize: 10, fontWeight: active ? 700 : 400,
                  transition: "all 0.15s",
                }}>{f}</button>
              );
            })}
          </div>
          <span style={{ marginLeft: "auto", color: "#4a5568", fontSize: 11 }}>
            {visible.length} / {hotspots.length} hotspots
          </span>
        </div>
      </Card>

      {/* Hotspot list */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 6 }}>
        {visible.map(h => (
          <HotspotRow key={h.id} h={h} sel={sel} setSel={v => { setSel(v); setAiResult(null); setAiError(""); }} />
        ))}
        {visible.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "28px 0", color: "#4a5568" }}>
            No hotspots match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}

function HotspotRow({ h, sel, setSel }) {
  const [hovered, setHovered] = useState(false);
  const isSel = sel?.id === h.id;
  const tc = typeColor(h.type);
  const lc = levelColor(h.level);
  return (
    <div
      onClick={() => setSel(isSel ? null : h)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered || isSel ? "#141e30" : "#0d1626",
        borderRadius: 6, padding: "8px 12px", cursor: "pointer",
        borderLeft: `3px solid ${tc}`,
        border: isSel ? `1px solid ${tc}55` : "1px solid transparent",
        borderLeftColor: tc,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div>
        <div style={{ fontWeight: 600, color: isSel ? "#e2e8f0" : "#c9d1da", fontSize: 12 }}>{h.label}</div>
        <div style={{ color: tc, fontSize: 10, marginTop: 2, fontWeight: 600 }}>{h.type}</div>
      </div>
      <BADGE text={h.level} color={lc} />
    </div>
  );
}
