import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BADGE, Card, ST, PageHeader, StatBar, Btn, LiveBadge } from "../components/shared";
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

// ── Restricted airspace zones (conflict / NOTAM closures) ─────────────────
const RESTRICTED_ZONES = [
  { id: "UA", name: "Ukraine FIR (UKBV/UKDV)", reason: "Armed conflict — full closure", level: "CLOSED", center: [49.0, 32.0], radius: 550000, color: "#ff4d4d", since: "Feb 2022" },
  { id: "YE", name: "Yemen FIR (OYSC)", reason: "Houthi drone/missile activity", level: "CLOSED", center: [15.5, 44.0], radius: 350000, color: "#ff4d4d", since: "Jan 2024" },
  { id: "SY", name: "Syria (OSTT)", reason: "Active conflict zone — military ops", level: "CLOSED", center: [35.0, 38.5], radius: 300000, color: "#ff4d4d", since: "2012" },
  { id: "IQ-W", name: "Western Iraq (ORBB partial)", reason: "Iranian missile corridor risk", level: "RESTRICTED", center: [33.5, 42.0], radius: 200000, color: "#ff9d00", since: "Oct 2023" },
  { id: "SD", name: "Sudan FIR (HSSS)", reason: "Civil conflict — RSF/SAF clashes", level: "CLOSED", center: [15.6, 32.5], radius: 400000, color: "#ff4d4d", since: "Apr 2023" },
  { id: "IR-E", name: "Eastern Iran (OIIX partial)", reason: "Drone/UAV activity — border ops", level: "RESTRICTED", center: [31.0, 60.5], radius: 180000, color: "#ff9d00", since: "Jan 2024" },
  { id: "LY", name: "Libya FIR (HLLL)", reason: "Militia conflict — unstable airspace", level: "RESTRICTED", center: [28.0, 17.0], radius: 350000, color: "#ff9d00", since: "2019" },
  { id: "SO", name: "Somalia (HCSM)", reason: "Al-Shabaab threat — limited ATC", level: "RESTRICTED", center: [5.0, 46.0], radius: 300000, color: "#ffd700", since: "2007" },
];

// ── Affected air routes ──────────────────────────────────────────────────────
const ROUTES = [
  {
    id: "EK-DXB-LHR", callsign: "EK003", airline: "Emirates", from: "Dubai (DXB)", to: "London (LHR)",
    status: "REROUTED", risk: "MEDIUM", reason: "Ukraine/Iraq closure — southern corridor via Egypt-Tunisia",
    original: [[25.25, 55.36], [30.0, 47.0], [38.0, 40.0], [45.0, 33.0], [49.0, 25.0], [51.47, -0.46]],
    actual:   [[25.25, 55.36], [24.0, 50.0], [22.0, 40.0], [25.0, 33.0], [30.0, 20.0], [35.0, 10.0], [42.0, 3.0], [48.0, -2.0], [51.47, -0.46]],
    addedTime: "+45 min", addedFuel: "+12%",
  },
  {
    id: "SQ-SIN-FRA", callsign: "SQ326", airline: "Singapore Air", from: "Singapore (SIN)", to: "Frankfurt (FRA)",
    status: "REROUTED", risk: "MEDIUM", reason: "Ukraine closure — Central Asian corridor via Kazakhstan",
    original: [[1.35, 103.99], [15.0, 85.0], [30.0, 65.0], [42.0, 50.0], [48.0, 35.0], [50.03, 8.57]],
    actual:   [[1.35, 103.99], [18.0, 85.0], [32.0, 68.0], [42.0, 62.0], [48.0, 55.0], [52.0, 40.0], [52.0, 25.0], [50.03, 8.57]],
    addedTime: "+35 min", addedFuel: "+9%",
  },
  {
    id: "QR-DOH-CDG", callsign: "QR039", airline: "Qatar Airways", from: "Doha (DOH)", to: "Paris (CDG)",
    status: "REROUTED", risk: "LOW", reason: "Syria/Iraq avoidance — Egyptian corridor",
    original: [[25.26, 51.56], [32.0, 44.0], [37.0, 35.0], [42.0, 28.0], [49.01, 2.55]],
    actual:   [[25.26, 51.56], [28.0, 46.0], [27.0, 38.0], [30.0, 32.0], [35.0, 20.0], [40.0, 10.0], [45.0, 5.0], [49.01, 2.55]],
    addedTime: "+25 min", addedFuel: "+7%",
  },
  {
    id: "TK-IST-JFK", callsign: "TK001", airline: "Turkish Airlines", from: "Istanbul (IST)", to: "New York (JFK)",
    status: "NORMAL", risk: "LOW", reason: "No conflict impact — North Atlantic track",
    original: [[41.28, 28.75], [45.0, 15.0], [50.0, -5.0], [52.0, -25.0], [48.0, -50.0], [40.64, -73.78]],
    actual:   [[41.28, 28.75], [45.0, 15.0], [50.0, -5.0], [52.0, -25.0], [48.0, -50.0], [40.64, -73.78]],
    addedTime: "—", addedFuel: "—",
  },
  {
    id: "ET-ADD-DXB", callsign: "ET600", airline: "Ethiopian", from: "Addis Ababa (ADD)", to: "Dubai (DXB)",
    status: "REROUTED", risk: "HIGH", reason: "Yemen/Red Sea closure — Oman coastal corridor",
    original: [[8.98, 38.80], [12.0, 43.0], [14.0, 47.0], [20.0, 52.0], [25.25, 55.36]],
    actual:   [[8.98, 38.80], [5.0, 42.0], [1.0, 48.0], [5.0, 55.0], [12.0, 58.0], [20.0, 57.0], [25.25, 55.36]],
    addedTime: "+55 min", addedFuel: "+18%",
  },
  {
    id: "LH-FRA-DEL", callsign: "LH760", airline: "Lufthansa", from: "Frankfurt (FRA)", to: "Delhi (DEL)",
    status: "REROUTED", risk: "MEDIUM", reason: "Ukraine/Iran airspace — Caucasus-Turkmenistan corridor",
    original: [[50.03, 8.57], [47.0, 20.0], [43.0, 32.0], [38.0, 45.0], [32.0, 58.0], [28.55, 77.10]],
    actual:   [[50.03, 8.57], [47.0, 20.0], [43.0, 28.0], [42.0, 44.0], [40.0, 52.0], [38.0, 58.0], [34.0, 65.0], [28.55, 77.10]],
    addedTime: "+30 min", addedFuel: "+8%",
  },
  {
    id: "MS-CAI-KRT", callsign: "MS811", airline: "EgyptAir", from: "Cairo (CAI)", to: "Khartoum (KRT)",
    status: "CANCELLED", risk: "HIGH", reason: "Sudan FIR closed — destination airspace unsafe",
    original: [[30.12, 31.40], [25.0, 32.0], [15.60, 32.55]],
    actual:   [],
    addedTime: "N/A", addedFuel: "N/A",
  },
  {
    id: "SV-JED-IST", callsign: "SV260", airline: "Saudia", from: "Jeddah (JED)", to: "Istanbul (IST)",
    status: "NORMAL", risk: "LOW", reason: "Red Sea west coast corridor — clear",
    original: [[21.67, 39.16], [25.0, 38.0], [30.0, 35.0], [35.0, 32.0], [41.28, 28.75]],
    actual:   [[21.67, 39.16], [25.0, 38.0], [30.0, 35.0], [35.0, 32.0], [41.28, 28.75]],
    addedTime: "—", addedFuel: "—",
  },
];

// ── Active NOTAMs ────────────────────────────────────────────────────────────
const NOTAMS = [
  { id: "A0847/26", region: "UKBV", summary: "Ukraine FIR — total airspace closure extended indefinitely", severity: "CRITICAL", issued: "2026-03-01", expires: "NOTAM(C)" },
  { id: "A0312/26", region: "OYSC", summary: "Yemen FIR — prohibited zone FL000-UNL, drone/missile threat", severity: "CRITICAL", issued: "2026-02-15", expires: "2026-06-15" },
  { id: "A0219/26", region: "HSSS", summary: "Khartoum FIR — all airports closed, conflict escalation", severity: "CRITICAL", issued: "2026-01-20", expires: "NOTAM(C)" },
  { id: "A0156/26", region: "ORBB", summary: "Baghdad FIR — western sector FL240+ restricted, military ops", severity: "HIGH", issued: "2026-03-10", expires: "2026-04-10" },
  { id: "A0098/26", region: "OIIX", summary: "Tehran FIR — eastern sector GPS jamming reported", severity: "HIGH", issued: "2026-03-05", expires: "2026-03-25" },
  { id: "A0445/26", region: "HLLL", summary: "Tripoli FIR — intermittent closures, militia activity near MITIGA", severity: "MEDIUM", issued: "2026-02-28", expires: "2026-04-01" },
];

function MapClickHandler({ onDeselect }) {
  useMapEvents({ click: onDeselect });
  return null;
}

const statusColor = s => s === "CANCELLED" ? "#ff4d4d" : s === "REROUTED" ? "#ff9d00" : "#00ff9d";
const statusBadge = s => s === "CANCELLED" ? "red" : s === "REROUTED" ? "yellow" : "green";
const sevColor = s => s === "CRITICAL" ? "#ff4d4d" : s === "HIGH" ? "#ff9d00" : "#ffd700";

function RouteCard({ r, selected, onClick }) {
  const [hovered, setHovered] = useState(false);
  const accent = statusColor(r.status);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? "#141e30" : hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 8, padding: "11px 14px", cursor: "pointer",
        border: `1px solid ${selected ? accent + "55" : hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${accent}`,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontWeight: 700, color: selected ? "#ffffff" : "#e2e8f0", fontSize: 13 }}>
          {r.callsign} · {r.airline}
        </div>
        <BADGE text={r.status} color={statusBadge(r.status)} />
      </div>
      <div style={{ color: "#9ca3af", fontSize: 11 }}>{r.from} → {r.to}</div>
      {r.status === "REROUTED" && (
        <div style={{ color: "#ff9d00", fontSize: 10, marginTop: 3, fontFamily: "monospace" }}>
          {r.addedTime} · fuel {r.addedFuel}
        </div>
      )}
      {r.status === "CANCELLED" && (
        <div style={{ color: "#ff4d4d", fontSize: 10, marginTop: 3 }}>Flight suspended</div>
      )}
    </div>
  );
}

export default function AirRoutes() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("routes"); // routes | notams
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  function selectRoute(r) {
    setSel(sel?.id === r.id ? null : r);
    setAiResult(null);
    setAiError("");
  }

  async function analyzeRoute(r) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey,
        `You are an aviation intelligence analyst specializing in conflict-zone airspace management. Analyze this air route disruption and provide a 4-5 sentence intelligence assessment covering: (1) root cause and current threat environment, (2) operational impact on airline operations, (3) economic cost estimate of rerouting, (4) outlook and recommended monitoring actions.\n\nRoute: ${r.callsign} (${r.airline}), ${r.from} → ${r.to}\nStatus: ${r.status}\nReason: ${r.reason}\nAdded flight time: ${r.addedTime}\nAdded fuel consumption: ${r.addedFuel}\nContext: Multiple conflict-zone airspace closures active globally including Ukraine, Yemen, Syria, Sudan, parts of Iraq and Iran.`
      );
      setAiResult(text);
      try { localStorage.setItem("sentinel_prefill_airroutes", text.slice(0, 300)); } catch {}
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  const reroutedCount = ROUTES.filter(r => r.status === "REROUTED").length;
  const cancelledCount = ROUTES.filter(r => r.status === "CANCELLED").length;
  const closedZones = RESTRICTED_ZONES.filter(z => z.level === "CLOSED").length;

  return (
    <div>
      <PageHeader
        icon="✈️"
        title="Airspace Monitor"
        sub="Conflict-zone airspace closures, NOTAMs, and rerouted air corridors — global theatre."
        accent="#38bdf8"
        dataMode={apiKey ? "hybrid" : "mock"}
        classification="SECRET"
      />

      <StatBar stats={[
        { label: "Routes Tracked",   value: String(ROUTES.length), color: "#38bdf8" },
        { label: "Rerouted",         value: String(reroutedCount),  color: "#ff9d00" },
        { label: "Cancelled",        value: String(cancelledCount), color: "#ff4d4d" },
        { label: "Closed Airspaces", value: String(closedZones),    color: "#ff4d4d" },
        { label: "Active NOTAMs",    value: String(NOTAMS.length),  color: "#ffd700" },
      ]} />

      {/* Map */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "10px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 13 }}>🗺️ Global Airspace Status</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4d4d33", border: "1px solid #ff4d4d", display: "inline-block" }} />
              <span style={{ color: "#4a5568", fontSize: 9 }}>CLOSED</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff9d0033", border: "1px solid #ff9d00", display: "inline-block" }} />
              <span style={{ color: "#4a5568", fontSize: 9 }}>RESTRICTED</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 2, background: "#ff9d00", display: "inline-block", borderRadius: 1 }} />
              <span style={{ color: "#4a5568", fontSize: 9 }}>REROUTED</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 12, height: 2, background: "#4a556844", display: "inline-block", borderRadius: 1, borderTop: "1px dashed #4a5568" }} />
              <span style={{ color: "#4a5568", fontSize: 9 }}>ORIGINAL</span>
            </span>
          </div>
        </div>
        <MapContainer
          center={[30, 35]}
          zoom={3}
          minZoom={2}
          maxZoom={8}
          style={{ height: 420, background: "#050d1a" }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={10}
          />
          <MapClickHandler onDeselect={() => { setSel(null); setAiResult(null); }} />

          {/* Restricted zones */}
          {RESTRICTED_ZONES.map(z => (
            <Circle
              key={z.id}
              center={z.center}
              radius={z.radius}
              pathOptions={{
                color: z.color,
                fillColor: z.color,
                fillOpacity: z.level === "CLOSED" ? 0.12 : 0.06,
                weight: 1,
                dashArray: z.level === "RESTRICTED" ? "6 4" : undefined,
              }}
            />
          ))}

          {/* Routes */}
          {ROUTES.map(r => {
            const isSel = sel?.id === r.id;
            return (
              <span key={r.id}>
                {/* Original route (dashed gray) — only if rerouted */}
                {r.status === "REROUTED" && r.original.length > 0 && (
                  <Polyline
                    positions={r.original}
                    pathOptions={{
                      color: "#4a5568",
                      weight: isSel ? 2 : 1,
                      opacity: isSel ? 0.5 : 0.2,
                      dashArray: "4 6",
                    }}
                  />
                )}
                {/* Actual route */}
                {r.actual.length > 0 && (
                  <Polyline
                    positions={r.actual}
                    pathOptions={{
                      color: statusColor(r.status),
                      weight: isSel ? 3 : 2,
                      opacity: isSel ? 1 : 0.6,
                    }}
                    eventHandlers={{ click: () => selectRoute(r) }}
                  />
                )}
                {/* Origin marker */}
                <CircleMarker
                  center={r.original[0]}
                  radius={isSel ? 6 : 4}
                  pathOptions={{
                    color: "#38bdf8", fillColor: "#38bdf8",
                    fillOpacity: isSel ? 1 : 0.7, weight: 1,
                  }}
                  eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); selectRoute(r); } }}
                />
                {/* Destination marker */}
                {r.original.length > 1 && r.status !== "CANCELLED" && (
                  <CircleMarker
                    center={r.actual.length > 0 ? r.actual[r.actual.length - 1] : r.original[r.original.length - 1]}
                    radius={isSel ? 6 : 4}
                    pathOptions={{
                      color: statusColor(r.status), fillColor: statusColor(r.status),
                      fillOpacity: isSel ? 1 : 0.7, weight: 1,
                    }}
                  />
                )}
              </span>
            );
          })}
        </MapContainer>

        {/* Selected route detail */}
        {sel && (
          <div style={{ margin: "0 14px 14px", background: "#0a1628", borderRadius: 8, padding: 14, border: `1px solid ${statusColor(sel.status)}33`, borderLeft: `3px solid ${statusColor(sel.status)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 4 }}>ROUTE INTELLIGENCE</div>
                <div style={{ fontWeight: 900, color: "#e2e8f0", fontSize: 15 }}>✈️ {sel.callsign} — {sel.airline}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <BADGE text={sel.status} color={statusBadge(sel.status)} />
                <button onClick={() => setSel(null)} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>✕</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))", gap: 8, marginBottom: 12 }}>
              {[
                ["FROM",       sel.from,       "#38bdf8"],
                ["TO",         sel.to,         "#38bdf8"],
                ["STATUS",     sel.status,     statusColor(sel.status)],
                ["ADDED TIME", sel.addedTime,  sel.status === "REROUTED" ? "#ff9d00" : "#4a5568"],
                ["ADDED FUEL", sel.addedFuel,  sel.status === "REROUTED" ? "#ff9d00" : "#4a5568"],
                ["RISK",       sel.risk,       sel.risk === "HIGH" ? "#ff4d4d" : sel.risk === "MEDIUM" ? "#ffd700" : "#00ff9d"],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: "#0d1626", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                  <div style={{ color, fontSize: 12, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#0d1626", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
              <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>REASON</div>
              <div style={{ color: "#e2e8f0", fontSize: 12 }}>{sel.reason}</div>
            </div>

            {apiKey && (
              <Btn onClick={() => analyzeRoute(sel)} disabled={aiLoading} color="#38bdf8" size="sm">
                {aiLoading ? "Analyzing..." : "AI Route Assessment"}
              </Btn>
            )}
            {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
            {aiResult && (
              <div style={{ background: "#051220", border: "1px solid #38bdf833", borderLeft: "3px solid #38bdf8", borderRadius: 6, padding: 12, marginTop: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <LiveBadge />
                  <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI AIRSPACE ASSESSMENT · {sel.callsign}</span>
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.7 }}>{aiResult}</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 0, marginBottom: 10 }}>
        {[["routes", "Routes", ROUTES.length], ["notams", "NOTAMs", NOTAMS.length]].map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: tab === key ? "#141e30" : "#0d1626",
              border: `1px solid ${tab === key ? "#38bdf844" : "#1f2d45"}`,
              borderBottom: tab === key ? "2px solid #38bdf8" : "2px solid transparent",
              color: tab === key ? "#38bdf8" : "#6b7a8d",
              padding: "9px 18px", cursor: "pointer",
              fontSize: 12, fontWeight: tab === key ? 700 : 400,
              borderRadius: "6px 6px 0 0",
            }}
          >
            {label} <span style={{ opacity: 0.6, fontSize: 10 }}>({count})</span>
          </button>
        ))}
      </div>

      {/* Routes list */}
      {tab === "routes" && (
        <>
          <div style={{ marginBottom: 8 }}>
            <ST icon="✈️" label="Monitored Routes" color="#38bdf8" sub={`${ROUTES.length} routes · ${reroutedCount} rerouted · ${cancelledCount} cancelled`} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
            {ROUTES.map(r => (
              <RouteCard key={r.id} r={r} selected={sel?.id === r.id} onClick={() => selectRoute(r)} />
            ))}
          </div>
        </>
      )}

      {/* NOTAMs list */}
      {tab === "notams" && (
        <>
          <div style={{ marginBottom: 8 }}>
            <ST icon="📋" label="Active NOTAMs" color="#ffd700" sub={`${NOTAMS.length} active notices — conflict-related airspace restrictions`} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {NOTAMS.map(n => (
              <div key={n.id} style={{
                background: "#0d1626", borderRadius: 8, padding: "12px 16px",
                border: "1px solid #1f2d45",
                borderLeft: `3px solid ${sevColor(n.severity)}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#38bdf8", fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{n.id}</span>
                    <span style={{ color: "#4a5568", fontSize: 10 }}>{n.region}</span>
                  </div>
                  <BADGE text={n.severity} color={sevColor(n.severity)} />
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 12, marginBottom: 6 }}>{n.summary}</div>
                <div style={{ display: "flex", gap: 12, color: "#4a5568", fontSize: 10 }}>
                  <span>Issued: {n.issued}</span>
                  <span>Expires: {n.expires}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
