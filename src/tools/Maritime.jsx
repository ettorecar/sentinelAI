import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Circle, Tooltip, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BADGE, Card, ST, PageHeader, StatBar, Btn, LiveBadge, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";
import { BE_URL, beFetch } from "../utils/beClient";

async function callClaude(apiKey, prompt, maxTokens = 900) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

function interpolatePolyline(pts, t) {
  if (!pts || pts.length < 2) return pts?.[0] ?? [0, 0];
  const c = Math.max(0, Math.min(0.9999, t));
  const segs = pts.length - 1;
  const idx = Math.min(Math.floor(c * segs), segs - 1);
  const st = c * segs - idx;
  const [lat1, lng1] = pts[idx];
  const [lat2, lng2] = pts[idx + 1];
  return [lat1 + (lat2 - lat1) * st, lng1 + (lng2 - lng1) * st];
}

// ── Threat zones ─────────────────────────────────────────────────────────────
const THREAT_ZONES = [
  { id: "YE-RS", name: "Houthi Anti-Ship Corridor", region: "Red Sea / Bab el-Mandeb", threat: "Anti-ship missiles + drone boats — Houthi operational range", level: "CRITICAL", center: [13.5, 43.5], radius: 380000, color: "#ff4d4d", since: "Dec 2023", aisBlackouts: 23 },
  { id: "IR-HZ", name: "Strait of Hormuz", region: "Persian Gulf", threat: "IRGC seizure risk — naval mines, fast boat harassment", level: "HIGH", center: [26.5, 56.5], radius: 200000, color: "#ff9d00", since: "Ongoing", aisBlackouts: 8 },
  { id: "UA-BS", name: "Black Sea (Ukrainian zone)", region: "Black Sea NW", threat: "Naval drones + mines — Ukrainian maritime exclusion zone", level: "HIGH", center: [45.5, 32.5], radius: 280000, color: "#ff9d00", since: "Feb 2022", aisBlackouts: 14 },
  { id: "SO-GA", name: "Gulf of Aden / Somalia", region: "Gulf of Aden", threat: "Piracy resurgence — armed boarding risk below 12°N", level: "MEDIUM", center: [11.5, 47.5], radius: 300000, color: "#ffd700", since: "2024", aisBlackouts: 5 },
  { id: "LY-MC", name: "Libya Coastal Waters", region: "Central Mediterranean", threat: "Militia interdiction — illegal weapons smuggling corridor", level: "MEDIUM", center: [32.5, 14.0], radius: 200000, color: "#ffd700", since: "2019", aisBlackouts: 4 },
];

// ── Vessels ───────────────────────────────────────────────────────────────────
const VESSELS = [
  {
    mmsi: "247123456", name: "ADRIATICA SUN", flag: "🇮🇹", type: "Cargo", darkFleet: false,
    anomaly: "AIS blackout 8h — resumed near Libyan coastal waters", risk: "HIGH",
    speed: "0.0 kn", course: "N/A", draft: "7.2m", dwt: "18,400t",
    lastPort: "Benghazi (LY)", nextPort: "Unknown",
    status: "ANCHORED", zone: "LY-MC",
    track: [[40.5, 18.5], [40.5, 18.5]],
    sigint: "VHF intercept — Arabic comms, non-standard call signs, Libyan militia freq",
  },
  {
    mmsi: "212987654", name: "AEGEAN STAR", flag: "🇬🇷", type: "Tanker", darkFleet: false,
    anomaly: "Unusual anchorage — Peloponnese coast, no cargo declared", risk: "MEDIUM",
    speed: "0.4 kn", course: "217°", draft: "11.1m", dwt: "74,200t",
    lastPort: "Piraeus (GR)", nextPort: "Alexandria (EG)",
    status: "DRIFTING", zone: null,
    track: [[37.5, 23.5], [37.3, 23.8], [37.1, 24.2], [36.9, 24.7]],
    sigint: null,
  },
  {
    mmsi: "538001234", name: "PACIFIC WOLF", flag: "🇲🇭", type: "Bulk", darkFleet: true,
    anomaly: "Speed anomaly +8 kn — exceeds class limit, AIS gaps noted", risk: "MEDIUM",
    speed: "19.2 kn", course: "084°", draft: "9.8m", dwt: "52,000t",
    lastPort: "Novorossiysk (RU)", nextPort: "Port Said (EG)",
    status: "UNDERWAY", zone: null,
    track: [[39.0, 20.0], [38.8, 22.0], [38.5, 24.5], [38.2, 27.0], [37.8, 29.5]],
    sigint: "Encrypted satcomm burst — unusual frequency pattern, IRGC profile",
  },
  {
    mmsi: "636091234", name: "LIBERIA MOON", flag: "🇱🇷", type: "Container", darkFleet: false,
    anomaly: "None detected", risk: "LOW",
    speed: "14.1 kn", course: "262°", draft: "12.5m", dwt: "42,000t",
    lastPort: "Port Said (EG)", nextPort: "Rotterdam (NL)",
    status: "UNDERWAY", zone: null,
    track: [[37.0, 12.0], [37.5, 9.0], [38.0, 5.0], [38.5, 1.0], [39.0, -3.0]],
    sigint: null,
  },
  {
    mmsi: "308765432", name: "SAMOS PIONEER", flag: "🇵🇦", type: "Tanker", darkFleet: true,
    anomaly: "AIS spoofing — GPS position inconsistent with satellite imagery", risk: "HIGH",
    speed: "8.3 kn", course: "155°", draft: "14.2m", dwt: "105,000t",
    lastPort: "Bandar Abbas (IR)", nextPort: "Undeclared",
    status: "UNDERWAY", zone: "IR-HZ",
    track: [[26.8, 56.2], [26.5, 56.8], [26.2, 57.5], [25.8, 58.2]],
    sigint: "OFAC SDN match — operator Bandar Kish Shipping LLC, Iranian crude network",
  },
  {
    mmsi: "341876543", name: "BOREALIS SKY", flag: "🇵🇦", type: "Cargo", darkFleet: true,
    anomaly: "Dark fleet — 14d AIS blackout, reappeared Red Sea sector", risk: "HIGH",
    speed: "11.6 kn", course: "335°", draft: "8.4m", dwt: "26,700t",
    lastPort: "Unknown (last: Jeddah)", nextPort: "Unknown",
    status: "UNDERWAY", zone: "YE-RS",
    track: [[12.5, 43.8], [13.1, 43.5], [13.8, 43.1], [14.5, 42.8]],
    sigint: "Vessel linked to IRGC-Q logistics network — OFAC watch list priority",
  },
  {
    mmsi: "249112233", name: "KAVKAZ", flag: "🇷🇺", type: "Tanker", darkFleet: true,
    anomaly: "Shadow fleet — STS transfer Black Sea, sanctions evasion suspected", risk: "HIGH",
    speed: "6.1 kn", course: "012°", draft: "13.8m", dwt: "92,000t",
    lastPort: "Novorossiysk (RU)", nextPort: "Unknown",
    status: "UNDERWAY", zone: "UA-BS",
    track: [[44.8, 33.0], [45.2, 32.8], [45.6, 32.5], [46.0, 32.2]],
    sigint: "STS operation detected — radar contact 43.9°N 33.7°E, unknown tanker",
  },
  {
    mmsi: "518000987", name: "SOUTHERN CROSS", flag: "🇸🇬", type: "Container", darkFleet: false,
    anomaly: "Red Sea avoidance — Cape of Good Hope diversion, +11 days transit", risk: "MEDIUM",
    speed: "17.4 kn", course: "290°", draft: "11.9m", dwt: "67,000t",
    lastPort: "Singapore (SG)", nextPort: "Cape Town (ZA) — DIVERTED",
    status: "UNDERWAY", zone: null,
    track: [[1.3, 104.0], [5.0, 98.0], [8.0, 88.0], [11.0, 75.0], [14.0, 62.0]],
    sigint: null,
  },
  {
    mmsi: "636098765", name: "MARITIME JUSTICE", flag: "🇱🇷", type: "Bulk", darkFleet: false,
    anomaly: "Loitering — 36h outside Hormuz, no declared destination", risk: "MEDIUM",
    speed: "1.2 kn", course: "Variable", draft: "10.3m", dwt: "58,000t",
    lastPort: "Dubai (AE)", nextPort: "None declared",
    status: "DRIFTING", zone: "IR-HZ",
    track: [[25.5, 57.0], [25.6, 57.2], [25.5, 57.4], [25.4, 57.2]],
    sigint: null,
  },
  {
    mmsi: "212345678", name: "HERMES", flag: "🇬🇷", type: "Tanker", darkFleet: false,
    anomaly: "None — convoy escort active (NATO Op. ASPIDES)", risk: "LOW",
    speed: "13.8 kn", course: "096°", draft: "12.0m", dwt: "80,000t",
    lastPort: "Rota (ES)", nextPort: "Alexandria (EG)",
    status: "UNDERWAY", zone: null,
    track: [[35.9, -5.6], [35.8, -1.0], [35.6, 4.0], [35.4, 9.0], [35.2, 14.0]],
    sigint: null,
  },
  {
    mmsi: "477123789", name: "ORIENT FORTUNE", flag: "🇭🇰", type: "Container", darkFleet: false,
    anomaly: "Cape of Good Hope diversion — Red Sea avoidance, +11 days", risk: "MEDIUM",
    speed: "15.2 kn", course: "245°", draft: "13.1m", dwt: "89,000t",
    lastPort: "Shanghai (CN)", nextPort: "Cape Town (ZA) — DIVERTED",
    status: "UNDERWAY", zone: null,
    track: [[22.0, 115.0], [18.0, 111.0], [12.0, 105.0], [5.0, 101.0], [0.0, 102.0]],
    sigint: null,
  },
  {
    mmsi: "538012345", name: "DARK PHANTOM", flag: "🇲🇭", type: "Tanker", darkFleet: true,
    anomaly: "No AIS since Jan 2026 — VLCC reacquired by SAR satellite, Bab el-Mandeb", risk: "HIGH",
    speed: "9.0 kn", course: "190°", draft: "16.0m", dwt: "280,000t",
    lastPort: "Unknown (last known: Kharg Island, IR)", nextPort: "Unknown",
    status: "UNDERWAY", zone: "YE-RS",
    track: [[14.0, 44.5], [13.5, 44.2], [12.8, 43.9], [12.0, 43.5]],
    sigint: "VLCC — linked to Iranian crude exports via Kish Maritime LLC (OFAC designated)",
  },
];

// ── SIGINT feed ───────────────────────────────────────────────────────────────
const SIGINT_FEED = [
  { ts: "14:47", mmsi: "538001234", vessel: "PACIFIC WOLF",  type: "ELINT",  msg: "Encrypted burst comms — 400MHz range, IRGC pattern match", sev: "HIGH" },
  { ts: "14:31", mmsi: "341876543", vessel: "BOREALIS SKY",  type: "HUMINT", msg: "Agent report: vessel loading at undisclosed Yemen anchorage, arms cargo suspected", sev: "CRITICAL" },
  { ts: "14:12", mmsi: "247123456", vessel: "ADRIATICA SUN", type: "SIGINT", msg: "Arabic VHF — non-IMO call sign, Libyan militia frequency confirmed", sev: "HIGH" },
  { ts: "13:58", mmsi: "249112233", vessel: "KAVKAZ",        type: "IMINT",  msg: "Satellite imagery confirms STS transfer with unknown tanker — 45.2°N 32.8°E", sev: "HIGH" },
  { ts: "13:44", mmsi: "308765432", vessel: "SAMOS PIONEER", type: "OSINT",  msg: "OFAC SDN match confirmed — operator Bandar Kish Shipping LLC, Tehran nexus", sev: "CRITICAL" },
  { ts: "13:22", mmsi: "538012345", vessel: "DARK PHANTOM",  type: "ELINT",  msg: "VLCC reacquired via SAR satellite — 13.8°N 44.4°E, no AIS broadcast", sev: "CRITICAL" },
  { ts: "12:55", mmsi: null,        vessel: "UNKNOWN",        type: "ACINT",  msg: "Underwater acoustic contact — Hormuz narrows, submarine probable, Type 209 profile", sev: "HIGH" },
  { ts: "12:30", mmsi: null,        vessel: "YE-RS zone",     type: "RADINT", msg: "Houthi C2 radar emission — 14.2°N 43.1°E, Silkworm/YJ-12 variant lock-on sequence", sev: "CRITICAL" },
];

// ── Ports ─────────────────────────────────────────────────────────────────────
const PORTS = [
  { id: "BBS", name: "Bab el-Mandeb Strait", country: "Djibouti / Yemen", status: "DANGER",      traffic: "-73%", lat: 11.6, lon: 43.3, detail: "Houthi missile/drone threat — major carriers rerouting via Cape of Good Hope. Daily transits down from ~50 to ~14 vessels. $6B/week in trade at risk." },
  { id: "HMZ", name: "Strait of Hormuz",     country: "Iran / Oman",      status: "CAUTION",     traffic: "-18%", lat: 26.6, lon: 56.3, detail: "IRGC harassment ops — periodic vessel seizures. 21% of global oil trade passes through. US/UK naval presence increased post-January incidents." },
  { id: "SKZ", name: "Suez Canal",           country: "Egypt",             status: "CAUTION",     traffic: "-42%", lat: 30.5, lon: 32.3, detail: "Capacity reduced due to Red Sea diversion. Revenue down $800M/month for SCA. Container shipping rates +340% vs pre-crisis baseline." },
  { id: "KRT", name: "Port Sudan",           country: "Sudan",             status: "CLOSED",      traffic: "-95%", lat: 19.6, lon: 37.2, detail: "RSF occupation — commercial operations suspended. Only UNMISS-authorized humanitarian aid vessels operating on 48h clearance windows." },
  { id: "NVS", name: "Novorossiysk",         country: "Russia",            status: "CAUTION",     traffic: "-31%", lat: 44.7, lon: 37.8, detail: "Ukrainian drone attacks — CPC terminal damage Q4 2025. Shadow fleet ops ongoing, P&I insurance void on all war-risk transits." },
  { id: "ODR", name: "Odesa / Pivdennyi",    country: "Ukraine",           status: "RESTRICTED",  traffic: "-61%", lat: 46.5, lon: 30.7, detail: "Ukrainian grain corridor under naval escort. Russian mining threat — 8 safe passage violations in 2025. Insurance surcharge +420% vs 2021." },
];

// ── AIS provider catalogue ────────────────────────────────────────────────────
const PROVIDERS_UI = [
  { key: "barentsWatch",   label: "BarentsWatch",   icon: "🛰️",  color: "#00ff9d", region: "Global",     free: true,  live: true  },
  { key: "noaa",           label: "NOAA Cadastre",  icon: "🇺🇸",  color: "#38bdf8", region: "USA Waters", free: true,  live: true  },
  { key: "marineTraffic",  label: "MarineTraffic",  icon: "📡",  color: "#a78bfa", region: "Global",     free: false, live: false },
  { key: "vesselFinder",   label: "VesselFinder",   icon: "🔭",  color: "#ffd700", region: "Global",     free: false, live: false },
  { key: "myShipTracking", label: "MyShipTracking", icon: "📍",  color: "#ff9d00", region: "Global",     free: false, live: false },
  { key: "fleetMon",       label: "FleetMon",       icon: "🌐",  color: "#4db8ff", region: "Global",     free: false, live: false },
  { key: "spire",          label: "Spire Maritime", icon: "🛸",  color: "#c084fc", region: "SAT-AIS",    free: false, live: false },
  { key: "exactEarth",     label: "exactEarth",     icon: "🌍",  color: "#fb923c", region: "SAT-AIS",    free: false, live: false },
];

// ── Style helpers ─────────────────────────────────────────────────────────────
const riskColor   = r => r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";
const statusColor = s => s === "CLOSED" || s === "DANGER" ? "#ff4d4d" : s === "CAUTION" || s === "RESTRICTED" ? "#ff9d00" : "#00ff9d";
const statusBadge = s => s === "CLOSED" || s === "DANGER" ? "red" : s === "CAUTION" || s === "RESTRICTED" ? "yellow" : "green";
const typeColor   = t => ({ ELINT: "#38bdf8", HUMINT: "#b47fff", SIGINT: "#00ff9d", IMINT: "#ff9d00", OSINT: "#22d3ee", ACINT: "#ffd700", RADINT: "#ff4d4d" }[t] || "#9ca3af");
const sevColor    = s => s === "CRITICAL" ? "#ff4d4d" : "#ff9d00";

// ── Composite risk score ──────────────────────────────────────────────────────
function vesselScore(v) {
  return Math.min(100,
    (v.darkFleet ? 40 : v.risk === "HIGH" ? 30 : v.risk === "MEDIUM" ? 18 : 5) +
    (v.sigint ? 25 : 0) +
    (v.zone ? 20 : 0) +
    (v.status === "DRIFTING" ? 10 : v.status === "ANCHORED" ? 5 : 0)
  );
}

function VesselRiskBar({ v }) {
  const score = vesselScore(v);
  const col = score >= 70 ? "#ff4d4d" : score >= 40 ? "#ff9d00" : "#ffd700";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: "#1a2740", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: col, borderRadius: 2, transition: "width 0.5s" }} />
      </div>
      <span style={{ color: col, fontSize: 10, fontFamily: "monospace", minWidth: 26 }}>{score}</span>
    </div>
  );
}

function MapClickHandler({ onDeselect }) { useMapEvents({ click: onDeselect }); return null; }

function VesselCard({ v, selected, onClick }) {
  const rc = riskColor(v.risk);
  return (
    <div onClick={onClick} style={{
      background: selected ? "#141e30" : "#0d1626",
      borderRadius: 8, padding: "11px 14px", cursor: "pointer",
      border: `1px solid ${selected ? rc + "55" : "#1f2d45"}`,
      borderLeft: `3px solid ${rc}`, transition: "background 0.15s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 12 }}>{v.flag} {v.name}</span>
          {v.darkFleet && <span style={{ marginLeft: 6, fontSize: 9, color: "#ff4d4d", border: "1px solid #ff4d4d44", padding: "1px 5px", borderRadius: 3, letterSpacing: 1 }}>DARK</span>}
        </div>
        <BADGE text={v.risk} color={v.risk === "HIGH" ? "red" : v.risk === "MEDIUM" ? "yellow" : "green"} />
      </div>
      <div style={{ color: "#4a5568", fontSize: 10, marginBottom: 4 }}>{v.type} · {v.mmsi} · {v.status}</div>
      <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6, lineHeight: 1.35 }}>{v.anomaly}</div>
      <VesselRiskBar v={v} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
// ── Data source badge ─────────────────────────────────────────────────────────
const DS_CFG = {
  live:         { bg: "#020e06", border: "#00ff9d33", dot: "#00ff9d", pulse: "sentinelPulse 2s ease-in-out infinite",   icon: "🛰️",  label: "LIVE FEED",   text: "Real AIS vessel data from BarentsWatch" },
  live_empty:   { bg: "#050e08", border: "#00ff9d22", dot: "#00ff9d", pulse: "none",                                    icon: "🛰️",  label: "LIVE FEED",   text: "BarentsWatch connected — 0 vessels returned (filter)" },
  checking:     { bg: "#05080f", border: "#38bdf833", dot: "#38bdf8", pulse: "sentinelPulse 0.7s ease-in-out infinite", icon: "⏳",  label: "CONNECTING",  text: "Reaching backend AIS service…" },
  demo:         { bg: "#06060e", border: "#a78bfa33", dot: "#a78bfa", pulse: "none",                                    icon: "🗄️",  label: "DEMO DATA",   text: "Backend connected — serving demo dataset (no BarentsWatch key)" },
  mock:         { bg: "#0e0800", border: "#ff9d0033", dot: "#ff9d00", pulse: "none",                                    icon: "⚠️",  label: "MOCK DATA",   text: "Backend not reachable — showing static dataset" },
  unconfigured: { bg: "#06060e", border: "#2d3f5533", dot: "#3a4a5c", pulse: "none",                                    icon: "📦",  label: "LOCAL DATA",  text: "No backend configured — using built-in dataset" },
};

function DataSourceBadge({ source, vesselCount }) {
  const c = DS_CFG[source] ?? DS_CFG.unconfigured;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6,
      padding: "6px 14px", marginBottom: 10,
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 12 }}>{c.icon}</span>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot, display: "inline-block", animation: c.pulse }} />
      <span style={{ color: c.dot, fontSize: 10, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1 }}>{c.label}</span>
      <span style={{ color: "#2d3f55", fontSize: 10 }}>—</span>
      <span style={{ color: "#6b7a8d", fontSize: 10 }}>{c.text}</span>
      {(source === "live" || source === "live_empty") && (
        <span style={{ marginLeft: "auto", color: "#3a4a5c", fontSize: 9, fontFamily: "monospace", display: "flex", gap: 10 }}>
          {vesselCount != null && (
            <span style={{ color: source === "live" ? "#00ff9d" : "#ff9d00" }}>
              {vesselCount} VESSELS
            </span>
          )}
          BACKEND ACTIVE · {BE_URL.replace(/https?:\/\//, "")}
        </span>
      )}
    </div>
  );
}

function ProviderPanel({ activeSources, onToggle, activeKeys = [] }) {
  return (
    <div style={{ marginBottom: 10, padding: "10px 14px", background: "#05080f", border: "1px solid #1a2535", borderRadius: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 9, color: "#4a5568", letterSpacing: 2 }}>AIS DATA SOURCES</span>
        <span style={{ fontSize: 9, color: "#2d3f55" }}>—</span>
        <span style={{ fontSize: 9, color: "#3a4a5c" }}>
          {activeSources.filter(k => PROVIDERS_UI.find(p => p.key === k && p.live)).length} active
          {" · puoi attivarne più di uno"}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PROVIDERS_UI.map(p => {
          const isSelected = activeSources.includes(p.key);
          const hasData    = activeKeys.includes(p.key);
          return (
            <button
              key={p.key}
              onClick={() => p.live && onToggle(p.key)}
              title={!p.live ? "Requires API key — not yet configured" : isSelected ? "Click to deactivate" : "Click to activate"}
              style={{
                background:   isSelected && p.live ? p.color + "22" : "#0a0f1a",
                border:       `1px solid ${isSelected && p.live ? p.color + "77" : "#1a2535"}`,
                borderRadius: 6,
                padding:      "5px 11px",
                color:        isSelected && p.live ? p.color : p.live ? "#3a4a5c" : "#1e2d3d",
                fontSize:     10,
                cursor:       p.live ? "pointer" : "not-allowed",
                opacity:      p.live ? 1 : 0.38,
                display:      "flex", alignItems: "center", gap: 6,
                fontFamily:   "monospace",
                transition:   "all 0.15s",
                userSelect:   "none",
              }}
            >
              {/* ON/OFF checkbox */}
              <span style={{
                width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                border: `1px solid ${isSelected && p.live ? p.color : "#2d3f55"}`,
                background: isSelected && p.live ? p.color + "33" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, color: p.color,
              }}>
                {isSelected && p.live ? "✓" : ""}
              </span>
              <span>{p.icon}</span>
              <span style={{ fontWeight: isSelected && p.live ? 600 : 400 }}>{p.label}</span>
              <span style={{ fontSize: 8, opacity: 0.4 }}>{p.region}</span>
              {!p.live && <span style={{ fontSize: 7, color: "#2d3f55", border: "1px solid #1a2535", borderRadius: 3, padding: "0 3px" }}>KEY</span>}
              {hasData  && <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.color, display: "inline-block", flexShrink: 0 }} title="returning data" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Maritime() {
  const [apiKey]  = useApiKey();
  const [sel, setSel]           = useState(null);
  const { stamp } = useLastAnalysis("maritime");
  const [selZone, setSelZone]   = useState(null);
  const [tab, setTab]           = useState("vessels");
  const [filterRisk, setFilterRisk]   = useState("ALL");
  const [filterType, setFilterType]   = useState("ALL");
  const [filterFleet, setFilterFleet] = useState("ALL");
  const [aiResult, setAiResult]     = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiError, setAiError]       = useState("");
  const [briefResult, setBriefResult]   = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError]     = useState("");
  const [progress, setProgress] = useState(() => VESSELS.map((_, i) => i / VESSELS.length));

  // ── Data source state ──────────────────────────────────────────────────────
  const [vessels, setVessels]       = useState(VESSELS);
  const [sigintFeed, setSigintFeed] = useState(SIGINT_FEED);
  const [dataSource, setDataSource] = useState(BE_URL ? "checking" : "unconfigured");
  const [liveVesselCount, setLiveVesselCount] = useState(null);
  const [activeSources, setActiveSources]     = useState(["barentsWatch", "noaa"]);
  const [activeProviderKeys, setActiveProviderKeys] = useState([]);
  const vesselsRef = useRef(VESSELS);

  function toggleSource(key) {
    setActiveSources(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  useEffect(() => {
    if (!BE_URL) return;
    setDataSource("checking");
    const ctrl = new AbortController();
    const qs = activeSources.map(s => `sources=${encodeURIComponent(s)}`).join("&");
    beFetch(`/api/maritime/vessels${qs ? "?" + qs : ""}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const isLive = data.source === "live";
        const bvessels = data.vessels ?? [];
        if (bvessels.length) {
          setVessels(bvessels);
          vesselsRef.current = bvessels;
          setProgress(bvessels.map((_, i) => i / bvessels.length));
        }
        if (data.sigint?.length) setSigintFeed(data.sigint);
        if (data.providers?.length) setActiveProviderKeys(data.providers);
        if (isLive) setLiveVesselCount(bvessels.length);
        setDataSource(isLive ? (bvessels.length ? "live" : "live_empty") : "demo");
      })
      .catch(() => setDataSource("mock"));
    return () => ctrl.abort();
  }, [activeSources]);

  useEffect(() => {
    const SPEED = 0.000045;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      setProgress(prev => prev.map((p, i) => {
        const v = vesselsRef.current[i];
        if (v.status === "ANCHORED" || v.track.length < 2) return p;
        if (v.status === "DRIFTING") return (p + SPEED * dt * 0.25) % 1;
        return (p + SPEED * dt * (0.55 + i * 0.03)) % 1;
      }));
    }, 50);
    return () => clearInterval(id);
  }, []);

  function selectVessel(v) {
    setSel(sel?.mmsi === v.mmsi ? null : v);
    setSelZone(null);
    setAiResult(null); setAiError("");
  }

  async function analyzeVessel(v) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    const zone = THREAT_ZONES.find(z => z.id === v.zone);
    try {
      const text = await callClaude(apiKey,
        `You are a senior maritime intelligence analyst (combined ONI/GCHQ/Europol maritime unit). Provide a 4-5 sentence intelligence assessment covering: (1) threat characterization — criminal, state-sponsored, sanctions evasion, or piracy; (2) operational pattern and likely intent; (3) connection to regional threat actors; (4) recommended interdiction/monitoring response.\n\nVessel: ${v.name} (MMSI: ${v.mmsi}) | Flag: ${v.flag} | Type: ${v.type} | DWT: ${v.dwt}\nAnomaly: ${v.anomaly}\nStatus: ${v.status} | Speed: ${v.speed} | Course: ${v.course}\nLast port: ${v.lastPort} | Declared destination: ${v.nextPort}\nRisk: ${v.risk}${v.darkFleet ? " | DARK FLEET: YES" : ""}${v.sigint ? `\nSIGINT: ${v.sigint}` : ""}${zone ? `\nZone: ${zone.name} — ${zone.threat}` : ""}`
      );
      setAiResult(text);
      stamp();
      try { localStorage.setItem("sentinel_prefill_maritime", text.slice(0, 300)); } catch {}
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  async function generateFleetBrief() {
    setBriefResult(null); setBriefError(""); setBriefLoading(true);
    try {
      const highRisk   = vessels.filter(v => v.risk === "HIGH").map(v => `${v.name}: ${v.anomaly}`).join("; ");
      const darkFleet  = vessels.filter(v => v.darkFleet).map(v => v.name).join(", ");
      const critSigint = sigintFeed.filter(s => s.sev === "CRITICAL").map(s => s.msg).join("; ");
      const badPorts   = PORTS.filter(p => p.status === "DANGER" || p.status === "CLOSED").map(p => `${p.name} (${p.status})`).join(", ");
      const text = await callClaude(apiKey,
        `You are a maritime intelligence chief briefing a naval operations center. Write a 6-8 sentence classified assessment covering: (1) dominant threat vectors across Red Sea, Hormuz, Black Sea, Mediterranean; (2) dark fleet / sanctions evasion activity; (3) SIGINT/ELINT picture; (4) port and chokepoint disruption impact; (5) priority targets and recommended force posture next 48 hours.\n\nHIGH-RISK VESSELS: ${highRisk}\nDARK FLEET: ${darkFleet}\nCRITICAL SIGINT: ${critSigint}\nPORT CLOSURES/DANGER: ${badPorts}\nThreat zones active: ${THREAT_ZONES.filter(z => z.level === "CRITICAL").map(z => z.name).join(", ")}\nTotal AIS anomalies: ${VESSELS.filter(v => v.anomaly !== "None detected").length}/${VESSELS.length} vessels\n\nWrite in classified intelligence style — precise, actionable.`,
        1200
      );
      setBriefResult(text);
    } catch (e) { setBriefError("Error: " + e.message); }
    setBriefLoading(false);
  }

  const filteredVessels = vessels.filter(v =>
    (filterRisk === "ALL"   || v.risk === filterRisk) &&
    (filterType === "ALL"   || v.type === filterType) &&
    (filterFleet === "ALL"  || (filterFleet === "DARK" ? v.darkFleet : !v.darkFleet))
  );

  const highRiskCount  = vessels.filter(v => v.risk === "HIGH").length;
  const darkFleetCount = vessels.filter(v => v.darkFleet).length;
  const anomalyCount   = vessels.filter(v => v.anomaly !== "None detected").length;

  return (
    <div>
      <PageHeader
        icon="🌊"
        title="Maritime Anomaly Tracker"
        sub="AIS blackout detection, dark fleet surveillance, SIGINT intercepts and threat zone monitoring — global maritime theatre."
        accent="#38bdf8"
        dataMode={apiKey ? "hybrid" : "mock"}
        classification="SECRET"
      />

      <DataSourceBadge source={dataSource} vesselCount={liveVesselCount} />
      <ProviderPanel activeSources={activeSources} onToggle={toggleSource} activeKeys={activeProviderKeys} />

      <StatBar stats={[
        { label: "Vessels Tracked", value: String(vessels.length),       color: "#38bdf8" },
        { label: "High Risk",       value: String(highRiskCount),        color: "#ff4d4d" },
        { label: "Anomalies",       value: String(anomalyCount),         color: "#ff9d00" },
        { label: "Dark Fleet",      value: String(darkFleetCount),       color: "#ff4d4d" },
        { label: "Threat Zones",    value: String(THREAT_ZONES.length),  color: "#ffd700" },
        { label: "SIGINT Events",   value: String(sigintFeed.length),   color: "#b47fff" },
      ]} />

      {/* AI Fleet Brief */}
      {apiKey && (
        <Card style={{ marginBottom: 12, padding: "12px 16px", border: "1px solid #38bdf822" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: briefResult ? 10 : 0 }}>
            <div>
              <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 2 }}>AI MARITIME INTELLIGENCE</div>
              <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>Fleet Threat Brief — All Theatres</div>
            </div>
            <Btn onClick={generateFleetBrief} disabled={briefLoading} color="#38bdf8" size="sm">
              {briefLoading ? "Generating..." : briefResult ? "Regenerate Brief" : "Generate Fleet Brief"}
            </Btn>
          </div>
          {briefError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{briefError}</div>}
          {briefResult && (
            <div style={{ background: "#051220", border: "1px solid #38bdf833", borderLeft: "3px solid #38bdf8", borderRadius: 6, padding: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <LiveBadge />
                <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>MARITIME INTEL BRIEF · SECRET · {new Date().toISOString().slice(0, 10)}</span>
              </div>
              <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{briefResult}</div>
            </div>
          )}
        </Card>
      )}

      {/* Map */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "10px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 13 }}>🗺️ Maritime Operations Picture — Live Track</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {[
              ["#ff4d4d", "HIGH RISK", "dot"], ["#ffd700", "MEDIUM", "dot"], ["#00ff9d", "NORMAL", "dot"],
              ["#ff4d4d", "DARK FLEET", "ring"], ["#38bdf8", "PORT", "dot"], ["#ff4d4d", "THREAT ZONE", "fill"],
            ].map(([color, label, type]) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                {type === "dot"  && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />}
                {type === "ring" && <span style={{ width: 6, height: 6, borderRadius: "50%", border: `2px solid ${color}`, display: "inline-block" }} />}
                {type === "fill" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color + "33", border: `1px solid ${color}`, display: "inline-block" }} />}
                <span style={{ color: "#4a5568", fontSize: 9 }}>{label}</span>
              </span>
            ))}
          </div>
        </div>

        <MapContainer center={[20, 45]} zoom={3} minZoom={2} maxZoom={8}
          style={{ height: 440, background: "#050d1a" }} attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={10} />
          <MapClickHandler onDeselect={() => { setSel(null); setSelZone(null); setAiResult(null); }} />

          {/* Threat zones */}
          {THREAT_ZONES.map(z => (
            <Circle key={z.id} center={z.center} radius={z.radius}
              pathOptions={{
                color: z.color, fillColor: z.color,
                fillOpacity: selZone?.id === z.id ? 0.20 : z.level === "CRITICAL" ? 0.10 : 0.06,
                weight: selZone?.id === z.id ? 2 : 1,
                dashArray: z.level !== "CRITICAL" ? "6 4" : undefined,
              }}
              eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); setSelZone(selZone?.id === z.id ? null : z); setSel(null); } }}
            >
              <Tooltip sticky direction="top">
                <div style={{ fontSize: 11, fontFamily: "monospace" }}>
                  <strong style={{ color: z.color }}>{z.level}</strong> — {z.name}<br />
                  {z.threat}<br />
                  <span style={{ opacity: 0.7 }}>AIS blackouts: {z.aisBlackouts} · Active since {z.since}</span>
                </div>
              </Tooltip>
            </Circle>
          ))}

          {/* Track trails — shown when vessel selected */}
          {vessels.map(v => {
            if (sel?.mmsi !== v.mmsi || v.track.length < 2) return null;
            return (
              <Polyline key={`track-${v.mmsi}`} positions={v.track}
                pathOptions={{ color: riskColor(v.risk), weight: 1.5, opacity: 0.35, dashArray: "3 6" }}
              />
            );
          })}

          {/* Animated vessels */}
          {vessels.map((v, i) => {
            const pos = v.status === "ANCHORED" || v.track.length < 2
              ? v.track[0]
              : interpolatePolyline(v.track, progress[i]);
            const isSel = sel?.mmsi === v.mmsi;
            const rc = riskColor(v.risk);
            return (
              <CircleMarker key={v.mmsi} center={pos}
                radius={isSel ? 9 : v.darkFleet ? 6 : 5}
                pathOptions={{
                  color: v.darkFleet ? "#ff4d4d" : rc,
                  fillColor: v.status === "ANCHORED" ? "#2a3a52" : rc,
                  fillOpacity: v.status === "ANCHORED" ? 0.5 : isSel ? 1 : 0.85,
                  weight: v.darkFleet ? 2.5 : isSel ? 2.5 : 1.5,
                }}
                eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); selectVessel(v); } }}
              >
                <Tooltip direction="top">
                  <span style={{ fontSize: 11, fontFamily: "monospace" }}>
                    <strong>{v.flag} {v.name}</strong>{v.darkFleet ? " ⚫" : ""}<br />
                    {v.type} · {v.status} · {v.speed}<br />
                    <span style={{ color: rc }}>{v.risk} RISK</span> — {v.anomaly.slice(0, 50)}
                  </span>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* Ports */}
          {PORTS.map(p => (
            <CircleMarker key={p.id} center={[p.lat, p.lon]} radius={5}
              pathOptions={{ color: statusColor(p.status), fillColor: statusColor(p.status), fillOpacity: 0.75, weight: 1.5 }}
            >
              <Tooltip direction="top">
                <span style={{ fontSize: 11, fontFamily: "monospace" }}>
                  <strong style={{ color: statusColor(p.status) }}>{p.status}</strong> — {p.name}<br />
                  Traffic: <strong>{p.traffic}</strong> vs baseline
                </span>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Zone detail */}
        {selZone && (
          <div style={{ margin: "0 14px 14px", background: "#0a1628", borderRadius: 8, padding: 14, border: `1px solid ${selZone.color}44`, borderLeft: `3px solid ${selZone.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 3 }}>MARITIME THREAT ZONE</div>
                <div style={{ fontWeight: 900, color: "#e2e8f0", fontSize: 14 }}>{selZone.name}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <BADGE text={selZone.level} color={selZone.level === "CRITICAL" ? "red" : "yellow"} />
                <button onClick={() => setSelZone(null)} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>✕</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,140px),1fr))", gap: 8 }}>
              {[
                ["THREAT",        selZone.threat,   "#e2e8f0"],
                ["REGION",        selZone.region,   "#38bdf8"],
                ["ACTIVE SINCE",  selZone.since,    "#ffd700"],
                ["AIS BLACKOUTS", String(selZone.aisBlackouts) + " tracked", "#ff9d00"],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: "#0d1626", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                  <div style={{ color, fontSize: 11, fontWeight: 600, lineHeight: 1.4 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vessel detail */}
        {sel && (
          <div style={{ margin: "0 14px 14px", background: "#0a1628", borderRadius: 8, padding: 14, border: `1px solid ${riskColor(sel.risk)}33`, borderLeft: `3px solid ${riskColor(sel.risk)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 3 }}>VESSEL INTELLIGENCE</div>
                <div style={{ fontWeight: 900, color: "#e2e8f0", fontSize: 15 }}>{sel.flag} {sel.name}</div>
                {sel.darkFleet && <div style={{ color: "#ff4d4d", fontSize: 10, marginTop: 2, fontWeight: 700, letterSpacing: 1 }}>⚫ DARK FLEET / SANCTIONS EVASION INDICATOR</div>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <BADGE text={sel.risk} color={sel.risk === "HIGH" ? "red" : sel.risk === "MEDIUM" ? "yellow" : "green"} />
                <button onClick={() => setSel(null)} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>✕</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,110px),1fr))", gap: 8, marginBottom: 10 }}>
              {[
                ["TYPE",       sel.type,     "#38bdf8"],
                ["MMSI",       sel.mmsi,     "#e2e8f0"],
                ["STATUS",     sel.status,   riskColor(sel.risk)],
                ["SPEED",      sel.speed,    "#e2e8f0"],
                ["COURSE",     sel.course,   "#e2e8f0"],
                ["DRAFT",      sel.draft,    "#e2e8f0"],
                ["DWT",        sel.dwt,      "#e2e8f0"],
                ["LAST PORT",  sel.lastPort, "#9ca3af"],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: "#0d1626", borderRadius: 6, padding: "7px 10px" }}>
                  <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                  <div style={{ color, fontSize: 11, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#0d1626", borderRadius: 6, padding: "8px 12px", marginBottom: sel.sigint ? 8 : 10 }}>
              <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>ANOMALY / INTELLIGENCE</div>
              <div style={{ color: "#e2e8f0", fontSize: 12 }}>{sel.anomaly}</div>
            </div>
            {sel.sigint && (
              <div style={{ background: "#0d1626", borderRadius: 6, padding: "8px 12px", marginBottom: 10, borderLeft: "2px solid #b47fff" }}>
                <div style={{ color: "#b47fff", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>SIGINT / INTEL NOTE</div>
                <div style={{ color: "#e2e8f0", fontSize: 11 }}>{sel.sigint}</div>
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>COMPOSITE RISK SCORE</div>
              <VesselRiskBar v={sel} />
            </div>
            {apiKey && (
              <Btn onClick={() => analyzeVessel(sel)} disabled={aiLoading} color="#38bdf8" size="sm">
                {aiLoading ? "Analyzing..." : "AI Vessel Assessment"}
              </Btn>
            )}
            <LastAnalysisTag toolId="maritime" />
            {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
            {aiResult && (
              <div style={{ background: "#051220", border: "1px solid #38bdf833", borderLeft: "3px solid #38bdf8", borderRadius: 6, padding: 12, marginTop: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <LiveBadge />
                  <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI MARITIME ASSESSMENT · {sel.name}</span>
                  <ExportBtn data={{ assessment: aiResult, vessel: sel?.name }} filename="sentinel-maritime" />
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.7 }}>{aiResult}</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 10, borderBottom: "1px solid #1f2d45" }}>
        {[
          ["vessels", "Vessels",            vessels.length],
          ["sigint",  "SIGINT Feed",        sigintFeed.length],
          ["ports",   "Port & Chokepoint Status", PORTS.length],
        ].map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: tab === key ? "#141e30" : "transparent",
            border: `1px solid ${tab === key ? "#38bdf844" : "transparent"}`,
            borderBottom: tab === key ? "2px solid #38bdf8" : "2px solid transparent",
            color: tab === key ? "#38bdf8" : "#6b7a8d",
            padding: "9px 16px", cursor: "pointer", fontSize: 12,
            fontWeight: tab === key ? 700 : 400, borderRadius: "6px 6px 0 0",
          }}>
            {label} <span style={{ opacity: 0.5, fontSize: 10 }}>({count})</span>
          </button>
        ))}
      </div>

      {/* Vessels tab */}
      {tab === "vessels" && (
        <>
          <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#4a5568", fontSize: 11 }}>Risk:</span>
            {["ALL", "HIGH", "MEDIUM", "LOW"].map(f => (
              <button key={f} onClick={() => setFilterRisk(f)} style={{
                background: filterRisk === f ? "#1a2740" : "#0d1626",
                border: `1px solid ${filterRisk === f ? (f === "ALL" ? "#38bdf866" : riskColor(f) + "66") : "#1f2d45"}`,
                color: filterRisk === f ? (f === "ALL" ? "#38bdf8" : riskColor(f)) : "#6b7a8d",
                borderRadius: 4, padding: "4px 9px", fontSize: 10, cursor: "pointer", fontWeight: filterRisk === f ? 700 : 400,
              }}>{f}</button>
            ))}
            <span style={{ color: "#4a5568", fontSize: 11, marginLeft: 6 }}>Type:</span>
            {["ALL", "Tanker", "Cargo", "Container", "Bulk"].map(f => (
              <button key={f} onClick={() => setFilterType(f)} style={{
                background: filterType === f ? "#1a2740" : "#0d1626",
                border: `1px solid ${filterType === f ? "#38bdf866" : "#1f2d45"}`,
                color: filterType === f ? "#38bdf8" : "#6b7a8d",
                borderRadius: 4, padding: "4px 9px", fontSize: 10, cursor: "pointer", fontWeight: filterType === f ? 700 : 400,
              }}>{f}</button>
            ))}
            <span style={{ color: "#4a5568", fontSize: 11, marginLeft: 6 }}>Fleet:</span>
            {[["ALL", "All"], ["DARK", "⚫ Dark"], ["LIGHT", "Normal"]].map(([f, label]) => (
              <button key={f} onClick={() => setFilterFleet(f)} style={{
                background: filterFleet === f ? "#1a2740" : "#0d1626",
                border: `1px solid ${filterFleet === f ? (f === "DARK" ? "#ff4d4d66" : "#38bdf866") : "#1f2d45"}`,
                color: filterFleet === f ? (f === "DARK" ? "#ff4d4d" : "#38bdf8") : "#6b7a8d",
                borderRadius: 4, padding: "4px 9px", fontSize: 10, cursor: "pointer", fontWeight: filterFleet === f ? 700 : 400,
              }}>{label}</button>
            ))}
            <span style={{ color: "#4a5568", fontSize: 10, marginLeft: "auto" }}>{filteredVessels.length}/{vessels.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
            {filteredVessels.map(v => (
              <VesselCard key={v.mmsi} v={v} selected={sel?.mmsi === v.mmsi} onClick={() => selectVessel(v)} />
            ))}
            {filteredVessels.length === 0 && (
              <div style={{ color: "#4a5568", fontSize: 13, padding: 20, textAlign: "center", gridColumn: "1/-1" }}>No vessels match filters.</div>
            )}
          </div>
        </>
      )}

      {/* SIGINT tab */}
      {tab === "sigint" && (
        <>
          <ST icon="📡" label="SIGINT / ELINT / HUMINT Intercept Feed" color="#b47fff" sub={`${sigintFeed.length} active intercepts — combined intelligence sources`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {sigintFeed.map((s, i) => (
              <div key={i} style={{
                background: "#0d1626", borderRadius: 8, padding: "12px 16px",
                border: "1px solid #1f2d45", borderLeft: `3px solid ${sevColor(s.sev)}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "monospace" }}>{s.ts} UTC</span>
                    <span style={{
                      background: typeColor(s.type) + "20", color: typeColor(s.type),
                      border: `1px solid ${typeColor(s.type)}44`,
                      fontSize: 9, fontWeight: 700, borderRadius: 3, padding: "1px 6px", letterSpacing: 1,
                    }}>{s.type}</span>
                    <span style={{ color: s.vessel === "UNKNOWN" || s.vessel.includes("zone") ? "#4a5568" : "#38bdf8", fontSize: 10, fontWeight: 600 }}>{s.vessel}</span>
                  </div>
                  <BADGE text={s.sev} color={s.sev === "CRITICAL" ? "red" : "yellow"} />
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{s.msg}</div>
                {s.mmsi && (() => {
                  const v = vessels.find(x => x.mmsi === s.mmsi);
                  return v ? (
                    <div style={{ marginTop: 6, fontSize: 10, color: "#4a5568", fontFamily: "monospace" }}>
                      MMSI: {s.mmsi} · {v.type} · {v.flag} · Last port: {v.lastPort}
                    </div>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Ports tab */}
      {tab === "ports" && (
        <>
          <ST icon="⚓" label="Strategic Port & Chokepoint Status" color="#38bdf8" sub="Global maritime infrastructure — conflict impact and traffic disruption" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%,320px),1fr))", gap: 10, marginTop: 10 }}>
            {PORTS.map(p => {
              const sc = statusColor(p.status);
              return (
                <div key={p.id} style={{
                  background: "#0d1626", borderRadius: 8, padding: "14px 16px",
                  border: "1px solid #1f2d45", borderTop: `2px solid ${sc}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 13 }}>{p.name}</div>
                      <div style={{ color: "#4a5568", fontSize: 11 }}>{p.country}</div>
                    </div>
                    <BADGE text={p.status} color={statusBadge(p.status)} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <div style={{ background: "#0a1628", borderRadius: 6, padding: "6px 10px", flex: 1 }}>
                      <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 2 }}>TRAFFIC VS BASELINE</div>
                      <div style={{ color: "#ff4d4d", fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{p.traffic}</div>
                    </div>
                    <div style={{ background: "#0a1628", borderRadius: 6, padding: "6px 10px", flex: 1 }}>
                      <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 2 }}>COORDINATES</div>
                      <div style={{ color: "#e2e8f0", fontSize: 10, fontFamily: "monospace" }}>{p.lat}°N {p.lon > 0 ? p.lon + "°E" : Math.abs(p.lon) + "°W"}</div>
                    </div>
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: 11, lineHeight: 1.5 }}>{p.detail}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
