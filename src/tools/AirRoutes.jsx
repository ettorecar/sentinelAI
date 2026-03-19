import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Circle, Tooltip, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BADGE, Card, ST, PageHeader, StatBar, Btn, LiveBadge, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

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

// ── Interpolate position along a polyline (t: 0–1) ─────────────────────────
function interpolatePolyline(points, t) {
  if (!points || points.length < 2) return points?.[0] ?? [0, 0];
  const clamped = Math.max(0, Math.min(0.9999, t));
  const totalSegs = points.length - 1;
  const idx = Math.min(Math.floor(clamped * totalSegs), totalSegs - 1);
  const segT = clamped * totalSegs - idx;
  const [lat1, lng1] = points[idx];
  const [lat2, lng2] = points[idx + 1];
  return [lat1 + (lat2 - lat1) * segT, lng1 + (lng2 - lng1) * segT];
}

// ── Economic cost estimate per rerouted flight ──────────────────────────────
function estimateRerouteCost(r) {
  if (r.status !== "REROUTED") return null;
  const fuelPct = parseFloat(r.addedFuel) / 100 || 0;
  const timeMins = parseInt(r.addedTime) || 0;
  // Wide-body: ~7500 kg/h fuel, $0.90/kg; crew+ops: ~$85/min
  const avgHours = r.flightHours || 8;
  const extraFuel = Math.round(fuelPct * avgHours * 7500 * 0.90 / 100) * 100;
  const extraTime = Math.round(timeMins * 85 / 100) * 100;
  return { fuel: extraFuel, time: extraTime, total: extraFuel + extraTime };
}

// ── Compute global disruption index (0–100) ─────────────────────────────────
function computeDisruptionIndex(zones, routes, notams) {
  const closed = zones.filter(z => z.level === "CLOSED").length;
  const restricted = zones.filter(z => z.level === "RESTRICTED").length;
  const cancelled = routes.filter(r => r.status === "CANCELLED").length;
  const rerouted = routes.filter(r => r.status === "REROUTED").length;
  const critical = notams.filter(n => n.severity === "CRITICAL").length;
  const high = notams.filter(n => n.severity === "HIGH").length;
  return Math.min(100, closed * 12 + restricted * 5 + cancelled * 9 + rerouted * 4 + critical * 7 + high * 3);
}

// ── Data ────────────────────────────────────────────────────────────────────
const RESTRICTED_ZONES = [
  { id: "UA", name: "Ukraine FIR (UKBV/UKDV)", reason: "Armed conflict — full closure since Russian invasion", level: "CLOSED", center: [49.0, 32.0], radius: 550000, color: "#ff4d4d", since: "Feb 2022", affected: ["EK-DXB-LHR", "SQ-SIN-FRA", "LH-FRA-DEL", "KL-AMS-NRT"], flightLevels: "FL000–UNL" },
  { id: "YE", name: "Yemen FIR (OYSC)", reason: "Houthi drone/missile activity — Red Sea corridor threat", level: "CLOSED", center: [15.5, 44.0], radius: 350000, color: "#ff4d4d", since: "Jan 2024", affected: ["ET-ADD-DXB"], flightLevels: "FL000–UNL" },
  { id: "SY", name: "Syria (OSTT)", reason: "Active conflict — military airstrikes, air defence active", level: "CLOSED", center: [35.0, 38.5], radius: 300000, color: "#ff4d4d", since: "2012", affected: ["QR-DOH-CDG", "AF-CDG-DXB"], flightLevels: "FL000–UNL" },
  { id: "IQ-W", name: "Western Iraq (ORBB partial)", reason: "Iranian missile corridor risk — military ops", level: "RESTRICTED", center: [33.5, 42.0], radius: 200000, color: "#ff9d00", since: "Oct 2023", affected: ["QR-DOH-CDG"], flightLevels: "FL240–UNL" },
  { id: "SD", name: "Sudan FIR (HSSS)", reason: "Civil conflict — RSF/SAF clashes, all airports closed", level: "CLOSED", center: [15.6, 32.5], radius: 400000, color: "#ff4d4d", since: "Apr 2023", affected: ["MS-CAI-KRT"], flightLevels: "FL000–UNL" },
  { id: "IR-E", name: "Eastern Iran (OIIX partial)", reason: "GPS jamming — Balochistan border ops, GNSS unreliable", level: "RESTRICTED", center: [31.0, 60.5], radius: 180000, color: "#ff9d00", since: "Jan 2024", affected: ["LH-FRA-DEL"], flightLevels: "FL250–UNL" },
  { id: "LY", name: "Libya FIR (HLLL)", reason: "Militia conflict — unstable ATC, MITIGA intermittent", level: "RESTRICTED", center: [28.0, 17.0], radius: 350000, color: "#ff9d00", since: "2019", affected: [], flightLevels: "FL000–FL200" },
  { id: "SO", name: "Somalia (HCSM)", reason: "Al-Shabaab threat — ATC degraded, no radar below FL200", level: "RESTRICTED", center: [5.0, 46.0], radius: 300000, color: "#ffd700", since: "2007", affected: ["ET-ADD-DXB"], flightLevels: "FL000–FL200" },
  { id: "RS", name: "Red Sea / Bab el-Mandeb", reason: "Houthi anti-ship missile & drone corridor — SAM threat", level: "RESTRICTED", center: [13.5, 43.5], radius: 240000, color: "#ff9d00", since: "Dec 2023", affected: ["ET-ADD-DXB", "SV-JED-IST"], flightLevels: "FL000–FL150" },
  { id: "NK", name: "North Korea (ZKKP FIR)", reason: "ICBM/missile test activity — no NOTAM advance notice", level: "RESTRICTED", center: [39.5, 127.5], radius: 280000, color: "#ffd700", since: "2022", affected: ["CX-HKG-JFK"], flightLevels: "FL000–UNL" },
];

const ROUTES = [
  {
    id: "EK-DXB-LHR", callsign: "EK003", airline: "Emirates", from: "Dubai (DXB)", to: "London (LHR)", flightHours: 8,
    status: "REROUTED", risk: "MEDIUM", reason: "Ukraine/Iraq closure — southern corridor via Egypt-Tunisia",
    original: [[25.25, 55.36], [30.0, 47.0], [38.0, 40.0], [45.0, 33.0], [49.0, 25.0], [51.47, -0.46]],
    actual:   [[25.25, 55.36], [24.0, 50.0], [22.0, 40.0], [25.0, 33.0], [30.0, 20.0], [35.0, 10.0], [42.0, 3.0], [48.0, -2.0], [51.47, -0.46]],
    addedTime: "+45 min", addedFuel: "+12%", dailyFreq: 4,
  },
  {
    id: "SQ-SIN-FRA", callsign: "SQ326", airline: "Singapore Air", from: "Singapore (SIN)", to: "Frankfurt (FRA)", flightHours: 12,
    status: "REROUTED", risk: "MEDIUM", reason: "Ukraine/Russia closure — Central Asian corridor via Kazakhstan",
    original: [[1.35, 103.99], [15.0, 85.0], [30.0, 65.0], [42.0, 50.0], [48.0, 35.0], [50.03, 8.57]],
    actual:   [[1.35, 103.99], [18.0, 85.0], [32.0, 68.0], [42.0, 62.0], [48.0, 55.0], [52.0, 40.0], [52.0, 25.0], [50.03, 8.57]],
    addedTime: "+35 min", addedFuel: "+9%", dailyFreq: 2,
  },
  {
    id: "QR-DOH-CDG", callsign: "QR039", airline: "Qatar Airways", from: "Doha (DOH)", to: "Paris (CDG)", flightHours: 7,
    status: "REROUTED", risk: "LOW", reason: "Syria/Iraq avoidance — Egyptian corridor via North Africa",
    original: [[25.26, 51.56], [32.0, 44.0], [37.0, 35.0], [42.0, 28.0], [49.01, 2.55]],
    actual:   [[25.26, 51.56], [28.0, 46.0], [27.0, 38.0], [30.0, 32.0], [35.0, 20.0], [40.0, 10.0], [45.0, 5.0], [49.01, 2.55]],
    addedTime: "+25 min", addedFuel: "+7%", dailyFreq: 3,
  },
  {
    id: "TK-IST-JFK", callsign: "TK001", airline: "Turkish Airlines", from: "Istanbul (IST)", to: "New York (JFK)", flightHours: 10,
    status: "NORMAL", risk: "LOW", reason: "North Atlantic track — no conflict zone impact",
    original: [[41.28, 28.75], [45.0, 15.0], [50.0, -5.0], [52.0, -25.0], [48.0, -50.0], [40.64, -73.78]],
    actual:   [[41.28, 28.75], [45.0, 15.0], [50.0, -5.0], [52.0, -25.0], [48.0, -50.0], [40.64, -73.78]],
    addedTime: "—", addedFuel: "—", dailyFreq: 2,
  },
  {
    id: "ET-ADD-DXB", callsign: "ET600", airline: "Ethiopian", from: "Addis Ababa (ADD)", to: "Dubai (DXB)", flightHours: 5,
    status: "REROUTED", risk: "HIGH", reason: "Yemen/Red Sea closure — Oman coastal corridor mandatory",
    original: [[8.98, 38.80], [12.0, 43.0], [14.0, 47.0], [20.0, 52.0], [25.25, 55.36]],
    actual:   [[8.98, 38.80], [5.0, 42.0], [1.0, 48.0], [5.0, 55.0], [12.0, 58.0], [20.0, 57.0], [25.25, 55.36]],
    addedTime: "+55 min", addedFuel: "+18%", dailyFreq: 3,
  },
  {
    id: "LH-FRA-DEL", callsign: "LH760", airline: "Lufthansa", from: "Frankfurt (FRA)", to: "Delhi (DEL)", flightHours: 9,
    status: "REROUTED", risk: "MEDIUM", reason: "Ukraine/Iran partial — Caucasus-Turkmenistan corridor",
    original: [[50.03, 8.57], [47.0, 20.0], [43.0, 32.0], [38.0, 45.0], [32.0, 58.0], [28.55, 77.10]],
    actual:   [[50.03, 8.57], [47.0, 20.0], [43.0, 28.0], [42.0, 44.0], [40.0, 52.0], [38.0, 58.0], [34.0, 65.0], [28.55, 77.10]],
    addedTime: "+30 min", addedFuel: "+8%", dailyFreq: 2,
  },
  {
    id: "MS-CAI-KRT", callsign: "MS811", airline: "EgyptAir", from: "Cairo (CAI)", to: "Khartoum (KRT)", flightHours: 3,
    status: "CANCELLED", risk: "HIGH", reason: "Sudan FIR closed — destination airport unsafe, RSF occupation",
    original: [[30.12, 31.40], [25.0, 32.0], [15.60, 32.55]],
    actual:   [], addedTime: "N/A", addedFuel: "N/A", dailyFreq: 1,
  },
  {
    id: "SV-JED-IST", callsign: "SV260", airline: "Saudia", from: "Jeddah (JED)", to: "Istanbul (IST)", flightHours: 4,
    status: "NORMAL", risk: "LOW", reason: "Red Sea west coast corridor — clear of threat envelopes",
    original: [[21.67, 39.16], [25.0, 38.0], [30.0, 35.0], [35.0, 32.0], [41.28, 28.75]],
    actual:   [[21.67, 39.16], [25.0, 38.0], [30.0, 35.0], [35.0, 32.0], [41.28, 28.75]],
    addedTime: "—", addedFuel: "—", dailyFreq: 4,
  },
  {
    id: "BA-LHR-SIN", callsign: "BA015", airline: "British Airways", from: "London (LHR)", to: "Singapore (SIN)", flightHours: 13,
    status: "REROUTED", risk: "MEDIUM", reason: "Ukraine/Russia closure — Central Asia via Turkey-Uzbekistan",
    original: [[51.47, -0.46], [48.0, 20.0], [45.0, 40.0], [40.0, 60.0], [25.0, 80.0], [1.35, 103.99]],
    actual:   [[51.47, -0.46], [47.0, 15.0], [42.0, 30.0], [40.0, 50.0], [38.0, 58.0], [30.0, 68.0], [15.0, 82.0], [1.35, 103.99]],
    addedTime: "+40 min", addedFuel: "+11%", dailyFreq: 2,
  },
  {
    id: "AF-CDG-DXB", callsign: "AF664", airline: "Air France", from: "Paris (CDG)", to: "Dubai (DXB)", flightHours: 7,
    status: "REROUTED", risk: "LOW", reason: "Syria closure — Turkey-Jordan-Egypt corridor",
    original: [[49.01, 2.55], [43.0, 18.0], [38.0, 32.0], [35.0, 40.0], [25.25, 55.36]],
    actual:   [[49.01, 2.55], [43.0, 16.0], [38.0, 28.0], [36.0, 36.0], [33.0, 44.0], [27.0, 52.0], [25.25, 55.36]],
    addedTime: "+20 min", addedFuel: "+5%", dailyFreq: 3,
  },
  {
    id: "CX-HKG-JFK", callsign: "CX830", airline: "Cathay Pacific", from: "Hong Kong (HKG)", to: "New York (JFK)", flightHours: 16,
    status: "REROUTED", risk: "MEDIUM", reason: "Russia/DPRK avoidance — Pacific track via Alaska",
    original: [[22.31, 113.91], [35.0, 130.0], [45.0, 150.0], [55.0, 170.0], [55.0, -170.0], [40.64, -73.78]],
    actual:   [[22.31, 113.91], [30.0, 135.0], [45.0, 155.0], [58.0, 175.0], [60.0, -165.0], [55.0, -150.0], [50.0, -120.0], [40.64, -73.78]],
    addedTime: "+50 min", addedFuel: "+14%", dailyFreq: 1,
  },
  {
    id: "KL-AMS-NRT", callsign: "KL861", airline: "KLM", from: "Amsterdam (AMS)", to: "Tokyo (NRT)", flightHours: 11,
    status: "REROUTED", risk: "LOW", reason: "Russia closure — polar route lost, Central Asia/China via Turkey",
    original: [[52.30, 4.76], [60.0, 30.0], [65.0, 60.0], [70.0, 100.0], [65.0, 130.0], [35.76, 140.39]],
    actual:   [[52.30, 4.76], [50.0, 28.0], [45.0, 50.0], [42.0, 68.0], [40.0, 90.0], [38.0, 110.0], [35.76, 140.39]],
    addedTime: "+90 min", addedFuel: "+22%", dailyFreq: 2,
  },
];

const NOTAMS = [
  { id: "A0847/26", region: "UKBV", fir: "Kyiv FIR", summary: "Ukraine FIR — total closure extended indefinitely, FL000–UNL, no exemptions", severity: "CRITICAL", issued: "2026-03-01", expires: "NOTAM(C)", zoneId: "UA" },
  { id: "A0823/26", region: "OSTT", fir: "Damascus FIR", summary: "Syria FIR — active military airstrikes, AD systems active, FL000–UNL", severity: "CRITICAL", issued: "2026-03-14", expires: "2026-03-28", zoneId: "SY" },
  { id: "A0312/26", region: "OYSC", fir: "Sana'a FIR", summary: "Yemen FIR — prohibited zone FL000–UNL, Houthi drone/missile threat active", severity: "CRITICAL", issued: "2026-02-15", expires: "2026-06-15", zoneId: "YE" },
  { id: "A0219/26", region: "HSSS", fir: "Khartoum FIR", summary: "Khartoum FIR — all airports closed, RSF/SAF conflict, no ATC available", severity: "CRITICAL", issued: "2026-01-20", expires: "NOTAM(C)", zoneId: "SD" },
  { id: "A0611/26", region: "OYSC", fir: "Red Sea Corridor", summary: "Red Sea / Bab el-Mandeb — SAM threat FL000–FL150, maritime + air caution", severity: "HIGH", issued: "2026-03-12", expires: "2026-04-12", zoneId: "RS" },
  { id: "A0702/26", region: "ZKKP", fir: "Pyongyang FIR", summary: "DPRK ballistic missile test activity — FL000–UNL, no NOTAM advance notice", severity: "HIGH", issued: "2026-03-08", expires: "NOTAM(C)", zoneId: "NK" },
  { id: "A0156/26", region: "ORBB", fir: "Baghdad FIR", summary: "Baghdad FIR western sector — FL240+ restricted, military operations active", severity: "HIGH", issued: "2026-03-10", expires: "2026-04-10", zoneId: "IQ-W" },
  { id: "A0098/26", region: "OIIX", fir: "Tehran FIR", summary: "Tehran FIR eastern sector — GPS/GNSS jamming, IRS crosscheck required", severity: "HIGH", issued: "2026-03-05", expires: "2026-03-25", zoneId: "IR-E" },
  { id: "A0531/26", region: "HCSM", fir: "Mogadishu FIR", summary: "Mogadishu FIR — ATC services degraded below FL200, no radar coverage", severity: "MEDIUM", issued: "2026-03-02", expires: "NOTAM(C)", zoneId: "SO" },
  { id: "A0445/26", region: "HLLL", fir: "Tripoli FIR", summary: "Tripoli FIR — intermittent closures, militia activity near MITIGA airport", severity: "MEDIUM", issued: "2026-02-28", expires: "2026-04-01", zoneId: "LY" },
];

const TIMELINE = [
  { year: "2007", event: "Somalia FIR degraded", zone: "SO", severity: "MEDIUM", impact: "ATC vacuum below FL200 — piracy-era corridor breakdown" },
  { year: "2012", event: "Syria FIR closed", zone: "SY", severity: "CRITICAL", impact: "Levant Middle East corridor disrupted — 200+ daily flights rerouted" },
  { year: "2019", event: "Libya FIR restricted", zone: "LY", severity: "MEDIUM", impact: "North Africa hub access constrained — Tripoli capacity reduced 70%" },
  { year: "Feb 2022", event: "Ukraine FIR closed", zone: "UA", severity: "CRITICAL", impact: "Largest closure since Cold War — 500+ daily flights rerouted, $230M/yr cost" },
  { year: "Apr 2023", event: "Sudan FIR closed", zone: "SD", severity: "CRITICAL", impact: "East Africa corridor blocked — Khartoum airport seized by RSF" },
  { year: "Oct 2023", event: "Baghdad FIR restricted", zone: "IQ-W", severity: "HIGH", impact: "Gulf-Europe routes further constrained — FL240+ western Iraq prohibited" },
  { year: "Dec 2023", event: "Red Sea corridor threatened", zone: "RS", severity: "HIGH", impact: "Houthi attacks — Bab el-Mandeb maritime + air FL000–FL150 at risk" },
  { year: "Jan 2024", event: "Yemen FIR closed", zone: "YE", severity: "CRITICAL", impact: "East Africa–Gulf routes forced over Indian Ocean — +55 min average" },
  { year: "Jan 2024", event: "Iran GPS jamming escalates", zone: "IR-E", severity: "HIGH", impact: "Navigation hazard — South Asia overflights require IRS crosscheck" },
  { year: "2022–2026", event: "DPRK missile activity", zone: "NK", severity: "HIGH", impact: "Pacific NE Asia overflights intermittently disrupted — no NOTAM advance" },
];

// ── Style helpers ─────────────────────────────────────────────────────────
const statusColor = s => s === "CANCELLED" ? "#ff4d4d" : s === "REROUTED" ? "#ff9d00" : "#00ff9d";
const statusBadge = s => s === "CANCELLED" ? "red" : s === "REROUTED" ? "yellow" : "green";
const sevColor = s => s === "CRITICAL" ? "#ff4d4d" : s === "HIGH" ? "#ff9d00" : s === "MEDIUM" ? "#ffd700" : "#00ff9d";
const riskColor = r => r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";

// ── Disruption Index Gauge ────────────────────────────────────────────────
function DisruptionGauge({ score }) {
  const pct = score / 100;
  const r = 38, cx = 60, cy = 55;
  const startRad = Math.PI;
  const endRad = Math.PI - pct * Math.PI;
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = pct > 0.5 ? 1 : 0;
  const needleX = cx + (r - 6) * Math.cos(endRad);
  const needleY = cy + (r - 6) * Math.sin(endRad);
  const col = score >= 75 ? "#ff4d4d" : score >= 55 ? "#ff9d00" : score >= 35 ? "#ffd700" : "#00ff9d";
  const label = score >= 75 ? "SEVERE" : score >= 55 ? "HIGH" : score >= 35 ? "ELEVATED" : "MODERATE";
  return (
    <svg width="120" height="75" viewBox="0 0 120 75" style={{ display: "block" }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1a2740" strokeWidth="9" />
      {score > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" />
      )}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={col} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3.5" fill={col} />
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="18" fontWeight="900" fill={col}>{score}</text>
      <text x={cx} y={cy + 26} textAnchor="middle" fontSize="8" fontWeight="700" fill={col} letterSpacing="1">{label}</text>
    </svg>
  );
}

// ── Economic bar chart ────────────────────────────────────────────────────
function CostBar({ label, value, max, color }) {
  const w = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: "#9ca3af", fontSize: 10 }}>{label}</span>
        <span style={{ color, fontSize: 10, fontFamily: "monospace" }}>${(value / 1000).toFixed(0)}k/flight</span>
      </div>
      <div style={{ background: "#0d1626", borderRadius: 3, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s" }} />
      </div>
    </div>
  );
}

// ── Map event handler ─────────────────────────────────────────────────────
function MapClickHandler({ onDeselect }) {
  useMapEvents({ click: onDeselect });
  return null;
}

// ── Route card ────────────────────────────────────────────────────────────
function RouteCard({ r, selected, onClick }) {
  const accent = statusColor(r.status);
  const cost = estimateRerouteCost(r);
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? "#141e30" : "#0d1626",
        borderRadius: 8, padding: "11px 14px", cursor: "pointer",
        border: `1px solid ${selected ? accent + "55" : "#1f2d45"}`,
        borderLeft: `3px solid ${accent}`,
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontWeight: 700, color: selected ? "#fff" : "#e2e8f0", fontSize: 13 }}>
          {r.callsign} · {r.airline}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <BADGE text={r.risk} color={r.risk === "HIGH" ? "red" : r.risk === "MEDIUM" ? "yellow" : "green"} />
          <BADGE text={r.status} color={statusBadge(r.status)} />
        </div>
      </div>
      <div style={{ color: "#9ca3af", fontSize: 11 }}>{r.from} → {r.to}</div>
      {r.status === "REROUTED" && (
        <div style={{ color: "#ff9d00", fontSize: 10, marginTop: 4, fontFamily: "monospace", display: "flex", gap: 10 }}>
          <span>⏱ {r.addedTime}</span>
          <span>⛽ {r.addedFuel}</span>
          {cost && <span style={{ color: "#ff6b6b" }}>💰 ~${(cost.total / 1000).toFixed(0)}k</span>}
        </div>
      )}
      {r.status === "CANCELLED" && (
        <div style={{ color: "#ff4d4d", fontSize: 10, marginTop: 3 }}>✕ Flight suspended</div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AirRoutes() {
  const [apiKey] = useApiKey();
  const [sel, setSel]           = useState(null);
  const { stamp } = useLastAnalysis("airroutes");
  const [selZone, setSelZone]   = useState(null);
  const [tab, setTab]           = useState("routes");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterRisk, setFilterRisk]     = useState("ALL");
  const [aiResult, setAiResult]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState("");
  const [briefResult, setBriefResult]   = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError]     = useState("");
  // Animated aircraft progress (one per route, 0–1)
  const [progress, setProgress] = useState(() => ROUTES.map((_, i) => (i / ROUTES.length)));
  const animRef = useRef(null);

  // Aircraft animation loop
  useEffect(() => {
    const SPEED = 0.000055;
    let last = Date.now();
    animRef.current = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      setProgress(prev => prev.map((p, i) => {
        if (ROUTES[i].status === "CANCELLED" || ROUTES[i].actual.length < 2) return p;
        return (p + SPEED * dt * (0.7 + i * 0.04)) % 1;
      }));
    }, 50);
    return () => clearInterval(animRef.current);
  }, []);

  function selectRoute(r) {
    setSel(sel?.id === r.id ? null : r);
    setSelZone(null);
    setAiResult(null);
    setAiError("");
  }

  function selectZone(z) {
    setSelZone(selZone?.id === z.id ? null : z);
    setSel(null);
    setAiResult(null);
  }

  async function analyzeRoute(r) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const cost = estimateRerouteCost(r);
      const text = await callClaude(apiKey,
        `You are a senior aviation intelligence analyst (IATA/ICAO level) specializing in conflict-zone airspace management. Provide a concise 4-5 sentence intelligence assessment covering: (1) root cause and current threat environment, (2) operational impact on airline operations and air traffic management, (3) estimated economic cost — note that we calculate ~$${cost ? (cost.total/1000).toFixed(0) + 'k' : 'N/A'} per flight in extra fuel+time costs, (4) 30-day outlook and recommended pilot/dispatch precautions.\n\nRoute: ${r.callsign} (${r.airline})\nFrom: ${r.from}  To: ${r.to}\nStatus: ${r.status}\nReason: ${r.reason}\nExtra time: ${r.addedTime} | Extra fuel: ${r.addedFuel} | Daily frequency: ${r.dailyFreq} flights/day\nActive global disruptions: Ukraine FIR, Yemen FIR, Sudan FIR, Syria, Red Sea corridor, partial Iraq/Iran restrictions.`
      );
      setAiResult(text);
      stamp();
      try { localStorage.setItem("sentinel_prefill_airroutes", text.slice(0, 300)); } catch {}
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  async function generateGlobalBrief() {
    setBriefResult(null); setBriefError(""); setBriefLoading(true);
    try {
      const closed = RESTRICTED_ZONES.filter(z => z.level === "CLOSED").map(z => z.name).join(", ");
      const restricted = RESTRICTED_ZONES.filter(z => z.level === "RESTRICTED").map(z => z.name).join(", ");
      const rerouted = ROUTES.filter(r => r.status === "REROUTED").map(r => `${r.callsign} (${r.addedFuel} extra fuel)`).join(", ");
      const cancelled = ROUTES.filter(r => r.status === "CANCELLED").map(r => r.callsign).join(", ");
      const totalCost = ROUTES.filter(r => r.status === "REROUTED")
        .reduce((sum, r) => { const c = estimateRerouteCost(r); return sum + (c?.total || 0) * r.dailyFreq; }, 0);
      const text = await callClaude(apiKey,
        `You are a strategic aviation intelligence analyst providing a SECRET-level global airspace disruption brief. Write a professional 6-8 sentence intelligence summary covering: (1) current global airspace disruption landscape and primary threat drivers, (2) most economically impactful corridors, (3) geopolitical trends driving the disruptions, (4) near-term (30-90 day) escalation risks and corridors to watch, (5) strategic recommendations for airline operations centers and government aviation authorities.\n\nCURRENT STATUS:\nClosed FIRs: ${closed}\nRestricted zones: ${restricted}\nRerouted flights: ${rerouted}\nCancelled routes: ${cancelled}\nEstimated daily industry cost: ~$${(totalCost / 1000).toFixed(0)}k across monitored routes\nActive critical NOTAMs: ${NOTAMS.filter(n => n.severity === "CRITICAL").length} critical, ${NOTAMS.filter(n => n.severity === "HIGH").length} high\n\nWrite in intelligence report style — concise, analytic, actionable.`,
        1200
      );
      setBriefResult(text);
    } catch (e) { setBriefError("Error: " + e.message); }
    setBriefLoading(false);
  }

  // Filtered routes
  const filteredRoutes = ROUTES.filter(r =>
    (filterStatus === "ALL" || r.status === filterStatus) &&
    (filterRisk === "ALL" || r.risk === filterRisk)
  );

  const reroutedCount  = ROUTES.filter(r => r.status === "REROUTED").length;
  const cancelledCount = ROUTES.filter(r => r.status === "CANCELLED").length;
  const closedZones    = RESTRICTED_ZONES.filter(z => z.level === "CLOSED").length;
  const disruptionIdx  = computeDisruptionIndex(RESTRICTED_ZONES, ROUTES, NOTAMS);

  // Economic totals
  const dailyTotalCost = ROUTES.filter(r => r.status === "REROUTED")
    .reduce((sum, r) => { const c = estimateRerouteCost(r); return sum + (c?.total || 0) * r.dailyFreq; }, 0);
  const maxRouteCost = Math.max(...ROUTES.map(r => { const c = estimateRerouteCost(r); return c?.total || 0; }));

  return (
    <div>
      <PageHeader
        icon="✈️"
        title="Airspace Monitor"
        sub="Conflict-zone closures, NOTAMs, animated route tracking and economic disruption analysis — global theatre."
        accent="#38bdf8"
        dataMode={apiKey ? "hybrid" : "mock"}
        classification="SECRET"
      />

      {/* Stats + Disruption Index */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "stretch" }}>
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <StatBar stats={[
            { label: "Routes Tracked",   value: String(ROUTES.length),   color: "#38bdf8" },
            { label: "Rerouted",         value: String(reroutedCount),   color: "#ff9d00" },
            { label: "Cancelled",        value: String(cancelledCount),  color: "#ff4d4d" },
            { label: "Closed FIRs",      value: String(closedZones),     color: "#ff4d4d" },
            { label: "Active NOTAMs",    value: String(NOTAMS.length),   color: "#ffd700" },
          ]} />
        </div>
        {/* Disruption index card */}
        <Card style={{ padding: "10px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 140, background: "#0a1628", border: "1px solid #1f2d45" }}>
          <div style={{ fontSize: 9, color: "#4a5568", letterSpacing: 2, marginBottom: 4, fontWeight: 600 }}>GLOBAL DISRUPTION</div>
          <DisruptionGauge score={disruptionIdx} />
          <div style={{ fontSize: 9, color: "#4a5568", marginTop: 2 }}>of 100 max</div>
        </Card>
      </div>

      {/* AI Global Brief */}
      {apiKey && (
        <Card style={{ marginBottom: 12, padding: "12px 16px", border: "1px solid #38bdf822" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: briefResult ? 10 : 0 }}>
            <div>
              <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 2 }}>AI INTELLIGENCE SERVICE</div>
              <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>Global Airspace Disruption Brief</div>
            </div>
            <Btn onClick={generateGlobalBrief} disabled={briefLoading} color="#38bdf8" size="sm">
              {briefLoading ? "Generating..." : briefResult ? "Regenerate Brief" : "Generate Global Brief"}
            </Btn>
          </div>
          {briefError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{briefError}</div>}
          {briefResult && (
            <div style={{ background: "#051220", border: "1px solid #38bdf833", borderLeft: "3px solid #38bdf8", borderRadius: 6, padding: 14 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <LiveBadge />
                <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>STRATEGIC AIRSPACE BRIEF · SECRET · {new Date().toISOString().slice(0, 10)}</span>
              </div>
              <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{briefResult}</div>
            </div>
          )}
        </Card>
      )}

      {/* Map */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "10px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 13 }}>🗺️ Global Airspace Status — Live Track</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {[
              ["#ff4d4d", "CLOSED", "fill"],
              ["#ff9d00", "RESTRICTED", "fill"],
              ["#ff9d00", "REROUTED", "line"],
              ["#4a5568", "ORIGINAL", "dash"],
              ["#fff",    "AIRCRAFT", "dot"],
            ].map(([color, label, type]) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {type === "fill"  && <span style={{ width: 8, height: 8, borderRadius: "50%", background: color + "33", border: `1px solid ${color}`, display: "inline-block" }} />}
                {type === "line"  && <span style={{ width: 12, height: 2, background: color, display: "inline-block", borderRadius: 1 }} />}
                {type === "dash"  && <span style={{ width: 12, height: 2, background: "transparent", borderTop: `1px dashed ${color}`, display: "inline-block" }} />}
                {type === "dot"   && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, border: "1px solid #38bdf8", display: "inline-block" }} />}
                <span style={{ color: "#4a5568", fontSize: 9 }}>{label}</span>
              </span>
            ))}
          </div>
        </div>

        <MapContainer center={[30, 35]} zoom={3} minZoom={2} maxZoom={8}
          style={{ height: 440, background: "#050d1a" }} attributionControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd" maxZoom={10}
          />
          <MapClickHandler onDeselect={() => { setSel(null); setSelZone(null); setAiResult(null); }} />

          {/* Restricted zones */}
          {RESTRICTED_ZONES.map(z => (
            <Circle key={z.id} center={z.center} radius={z.radius}
              pathOptions={{
                color: z.color, fillColor: z.color,
                fillOpacity: selZone?.id === z.id ? 0.22 : z.level === "CLOSED" ? 0.13 : 0.06,
                weight: selZone?.id === z.id ? 2 : 1,
                dashArray: z.level === "RESTRICTED" ? "6 4" : undefined,
              }}
              eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); selectZone(z); } }}
            >
              <Tooltip sticky direction="top">
                <div style={{ fontSize: 11, fontFamily: "monospace" }}>
                  <strong style={{ color: z.color }}>{z.level}</strong> — {z.name}<br />
                  {z.reason}<br />
                  <span style={{ opacity: 0.7 }}>Since {z.since} · {z.flightLevels}</span>
                </div>
              </Tooltip>
            </Circle>
          ))}

          {/* Routes */}
          {ROUTES.map(r => {
            const isSel = sel?.id === r.id;
            return (
              <span key={r.id}>
                {r.status === "REROUTED" && r.original.length > 1 && (
                  <Polyline positions={r.original}
                    pathOptions={{ color: "#4a5568", weight: isSel ? 2 : 1, opacity: isSel ? 0.5 : 0.18, dashArray: "4 7" }}
                  />
                )}
                {r.actual.length > 1 && (
                  <Polyline positions={r.actual}
                    pathOptions={{ color: statusColor(r.status), weight: isSel ? 3 : 1.5, opacity: isSel ? 1 : 0.55 }}
                    eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); selectRoute(r); } }}
                  >
                    <Tooltip sticky direction="top">
                      <span style={{ fontSize: 11, fontFamily: "monospace" }}>
                        <strong>{r.callsign}</strong> · {r.airline}<br />
                        {r.from} → {r.to}<br />
                        <span style={{ color: statusColor(r.status) }}>{r.status}</span>
                        {r.status === "REROUTED" && ` · ${r.addedTime} · ${r.addedFuel}`}
                      </span>
                    </Tooltip>
                  </Polyline>
                )}
                {/* Origin marker */}
                <CircleMarker center={r.original[0]} radius={isSel ? 6 : 4}
                  pathOptions={{ color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: isSel ? 1 : 0.7, weight: 1 }}
                  eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); selectRoute(r); } }}
                />
                {/* Destination marker */}
                {r.status !== "CANCELLED" && r.actual.length > 1 && (
                  <CircleMarker center={r.actual[r.actual.length - 1]} radius={isSel ? 6 : 4}
                    pathOptions={{ color: statusColor(r.status), fillColor: statusColor(r.status), fillOpacity: isSel ? 1 : 0.7, weight: 1 }}
                    eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); selectRoute(r); } }}
                  />
                )}
              </span>
            );
          })}

          {/* Animated aircraft */}
          {ROUTES.map((r, i) => {
            const pts = r.actual.length > 1 ? r.actual : null;
            if (!pts) return null;
            const pos = interpolatePolyline(pts, progress[i]);
            const isSel = sel?.id === r.id;
            return (
              <CircleMarker key={`ac-${r.id}`} center={pos} radius={isSel ? 6 : 4}
                pathOptions={{ color: "#38bdf8", fillColor: "#ffffff", fillOpacity: 1, weight: isSel ? 2.5 : 1.5 }}
                eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); selectRoute(r); } }}
              >
                <Tooltip direction="top">
                  <span style={{ fontFamily: "monospace", fontSize: 11 }}>✈ {r.callsign}</span>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Selected zone detail */}
        {selZone && (
          <div style={{ margin: "0 14px 14px", background: "#0a1628", borderRadius: 8, padding: 14, border: `1px solid ${selZone.color}44`, borderLeft: `3px solid ${selZone.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 3 }}>RESTRICTED ZONE — DETAIL</div>
                <div style={{ fontWeight: 900, color: "#e2e8f0", fontSize: 14 }}>{selZone.name}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <BADGE text={selZone.level} color={selZone.level === "CLOSED" ? "red" : "yellow"} />
                <button onClick={() => setSelZone(null)} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>✕</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,130px),1fr))", gap: 8, marginBottom: 10 }}>
              {[
                ["REASON", selZone.reason, "#e2e8f0"],
                ["SINCE", selZone.since, "#ffd700"],
                ["FL LEVELS", selZone.flightLevels, "#38bdf8"],
                ["ROUTES AFFECTED", selZone.affected.length > 0 ? selZone.affected.join(", ") : "None tracked", selZone.affected.length > 0 ? "#ff9d00" : "#4a5568"],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: "#0d1626", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                  <div style={{ color, fontSize: 11, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected route detail */}
        {sel && (
          <div style={{ margin: "0 14px 14px", background: "#0a1628", borderRadius: 8, padding: 14, border: `1px solid ${statusColor(sel.status)}33`, borderLeft: `3px solid ${statusColor(sel.status)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 3 }}>ROUTE INTELLIGENCE</div>
                <div style={{ fontWeight: 900, color: "#e2e8f0", fontSize: 15 }}>✈️ {sel.callsign} — {sel.airline}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <BADGE text={sel.status} color={statusBadge(sel.status)} />
                <button onClick={() => setSel(null)} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>✕</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,130px),1fr))", gap: 8, marginBottom: 12 }}>
              {[
                ["FROM",       sel.from,      "#38bdf8"],
                ["TO",         sel.to,        "#38bdf8"],
                ["STATUS",     sel.status,    statusColor(sel.status)],
                ["RISK",       sel.risk,      riskColor(sel.risk)],
                ["ADDED TIME", sel.addedTime, sel.status === "REROUTED" ? "#ff9d00" : "#4a5568"],
                ["ADDED FUEL", sel.addedFuel, sel.status === "REROUTED" ? "#ff9d00" : "#4a5568"],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: "#0d1626", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                  <div style={{ color, fontSize: 12, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
            {(() => {
              const cost = estimateRerouteCost(sel);
              return cost ? (
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  {[
                    ["EXTRA FUEL COST", `$${(cost.fuel/1000).toFixed(1)}k`, "#ff9d00"],
                    ["EXTRA TIME COST", `$${(cost.time/1000).toFixed(1)}k`, "#ffd700"],
                    ["TOTAL PER FLIGHT", `$${(cost.total/1000).toFixed(1)}k`, "#ff6b6b"],
                    ["DAILY IMPACT", `$${((cost.total * sel.dailyFreq)/1000).toFixed(0)}k`, "#ff4d4d"],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ background: "#0d1626", borderRadius: 6, padding: "7px 10px", flex: "1 1 100px" }}>
                      <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                      <div style={{ color, fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>{value}</div>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
            <div style={{ background: "#0d1626", borderRadius: 6, padding: "8px 12px", marginBottom: 12 }}>
              <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>REASON</div>
              <div style={{ color: "#e2e8f0", fontSize: 12 }}>{sel.reason}</div>
            </div>
            {apiKey && (
              <Btn onClick={() => analyzeRoute(sel)} disabled={aiLoading} color="#38bdf8" size="sm">
                {aiLoading ? "Analyzing..." : "AI Route Assessment"}
              </Btn>
            )}
            <LastAnalysisTag toolId="airroutes" />
            {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
            {aiResult && (
              <div style={{ background: "#051220", border: "1px solid #38bdf833", borderLeft: "3px solid #38bdf8", borderRadius: 6, padding: 12, marginTop: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <LiveBadge />
                  <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI AIRSPACE ASSESSMENT · {sel.callsign}</span>
                  <ExportBtn data={{ assessment: aiResult, route: sel?.callsign }} filename="sentinel-airroutes" />
                </div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.7 }}>{aiResult}</div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 0, marginBottom: 10, borderBottom: "1px solid #1f2d45" }}>
        {[
          ["routes",   "Routes",          ROUTES.length],
          ["notams",   "NOTAMs",          NOTAMS.length],
          ["economic", "Economic Impact", null],
          ["timeline", "Conflict Timeline", TIMELINE.length],
        ].map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: tab === key ? "#141e30" : "transparent",
            border: `1px solid ${tab === key ? "#38bdf844" : "transparent"}`,
            borderBottom: tab === key ? "2px solid #38bdf8" : "2px solid transparent",
            color: tab === key ? "#38bdf8" : "#6b7a8d",
            padding: "9px 16px", cursor: "pointer",
            fontSize: 12, fontWeight: tab === key ? 700 : 400,
            borderRadius: "6px 6px 0 0",
          }}>
            {label}{count != null ? <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 5 }}>({count})</span> : ""}
          </button>
        ))}
      </div>

      {/* Routes tab */}
      {tab === "routes" && (
        <>
          {/* Filter bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#4a5568", fontSize: 11, marginRight: 2 }}>Status:</span>
            {["ALL", "REROUTED", "CANCELLED", "NORMAL"].map(f => (
              <button key={f} onClick={() => setFilterStatus(f)} style={{
                background: filterStatus === f ? "#1a2740" : "#0d1626",
                border: `1px solid ${filterStatus === f ? "#38bdf866" : "#1f2d45"}`,
                color: filterStatus === f ? "#38bdf8" : "#6b7a8d",
                borderRadius: 4, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontWeight: filterStatus === f ? 700 : 400,
              }}>{f}</button>
            ))}
            <span style={{ color: "#4a5568", fontSize: 11, marginLeft: 8, marginRight: 2 }}>Risk:</span>
            {["ALL", "HIGH", "MEDIUM", "LOW"].map(f => (
              <button key={f} onClick={() => setFilterRisk(f)} style={{
                background: filterRisk === f ? "#1a2740" : "#0d1626",
                border: `1px solid ${filterRisk === f ? (riskColor(f) + "66") : "#1f2d45"}`,
                color: filterRisk === f ? riskColor(f) : "#6b7a8d",
                borderRadius: 4, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontWeight: filterRisk === f ? 700 : 400,
              }}>{f}</button>
            ))}
            <span style={{ color: "#4a5568", fontSize: 10, marginLeft: "auto" }}>{filteredRoutes.length} of {ROUTES.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
            {filteredRoutes.map(r => (
              <RouteCard key={r.id} r={r} selected={sel?.id === r.id} onClick={() => selectRoute(r)} />
            ))}
            {filteredRoutes.length === 0 && (
              <div style={{ color: "#4a5568", fontSize: 13, padding: 20, gridColumn: "1/-1", textAlign: "center" }}>No routes match current filters.</div>
            )}
          </div>
        </>
      )}

      {/* NOTAMs tab */}
      {tab === "notams" && (
        <>
          <ST icon="📋" label="Active NOTAMs" color="#ffd700" sub={`${NOTAMS.length} active notices — conflict-related airspace restrictions`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {NOTAMS.map(n => {
              const zone = RESTRICTED_ZONES.find(z => z.id === n.zoneId);
              return (
                <div key={n.id} style={{
                  background: "#0d1626", borderRadius: 8, padding: "12px 16px",
                  border: "1px solid #1f2d45", borderLeft: `3px solid ${sevColor(n.severity)}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "#38bdf8", fontSize: 12, fontWeight: 700, fontFamily: "monospace" }}>{n.id}</span>
                      <span style={{ color: "#4a5568", fontSize: 10 }}>{n.fir}</span>
                    </div>
                    <BADGE text={n.severity} color={n.severity === "CRITICAL" ? "red" : n.severity === "HIGH" ? "yellow" : "green"} />
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: 12, marginBottom: 8 }}>{n.summary}</div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "#4a5568", fontSize: 10 }}>Issued: {n.issued}</span>
                    <span style={{ color: n.expires.startsWith("NOTAM") ? "#ff4d4d" : "#4a5568", fontSize: 10 }}>Expires: {n.expires}</span>
                    {zone && zone.affected.length > 0 && (
                      <span style={{ color: "#ff9d00", fontSize: 10 }}>Affects: {zone.affected.length} route{zone.affected.length > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Economic Impact tab */}
      {tab === "economic" && (
        <>
          <ST icon="💰" label="Economic Disruption Analysis" color="#ff9d00" sub="Fleet-wide cost estimates for conflict-driven rerouting — monitored routes" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,280px),1fr))", gap: 12, marginTop: 12 }}>
            {/* Summary cards */}
            <Card style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 8 }}>DAILY DISRUPTION COST</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#ff4d4d", fontFamily: "monospace", marginBottom: 4 }}>
                ${(dailyTotalCost / 1000).toFixed(0)}k
              </div>
              <div style={{ fontSize: 11, color: "#4a5568" }}>across {reroutedCount} rerouted routes ({ROUTES.reduce((s, r) => r.status === "REROUTED" ? s + r.dailyFreq : s, 0)} daily flights)</div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #1f2d45" }}>
                <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 1, marginBottom: 4 }}>ANNUALIZED ESTIMATE</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#ff9d00", fontFamily: "monospace" }}>
                  ~${((dailyTotalCost * 365) / 1000000).toFixed(1)}M
                </div>
              </div>
            </Card>

            <Card style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 10 }}>ASSUMPTIONS</div>
              {[
                ["Fuel price", "$0.90 / kg"],
                ["Avg fuel flow", "7,500 kg/h"],
                ["Crew + ops", "$85 / min"],
                ["Data scope", "Monitored routes only"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
                  <span style={{ color: "#4a5568" }}>{k}</span>
                  <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 10, color: "#4a5568", fontStyle: "italic", lineHeight: 1.5 }}>
                Industry total (Ukraine alone) estimated $230M–$1.2B/yr by IATA.
              </div>
            </Card>

            {/* Per-route cost bars */}
            <Card style={{ padding: "16px 18px", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 12 }}>EXTRA COST PER FLIGHT — REROUTED ROUTES</div>
              {ROUTES
                .filter(r => r.status === "REROUTED")
                .sort((a, b) => (estimateRerouteCost(b)?.total || 0) - (estimateRerouteCost(a)?.total || 0))
                .map(r => {
                  const cost = estimateRerouteCost(r);
                  if (!cost) return null;
                  return (
                    <CostBar
                      key={r.id}
                      label={`${r.callsign} (${r.airline}) — ${r.addedTime} · ${r.addedFuel}`}
                      value={cost.total}
                      max={maxRouteCost}
                      color={cost.total > 25000 ? "#ff4d4d" : cost.total > 15000 ? "#ff9d00" : "#ffd700"}
                    />
                  );
                })}
            </Card>

            {/* Cancellations */}
            {cancelledCount > 0 && (
              <Card style={{ padding: "16px 18px" }}>
                <div style={{ fontSize: 10, color: "#4a5568", letterSpacing: 2, marginBottom: 8 }}>CANCELLED ROUTES</div>
                {ROUTES.filter(r => r.status === "CANCELLED").map(r => (
                  <div key={r.id} style={{ borderLeft: "3px solid #ff4d4d", paddingLeft: 10, marginBottom: 8 }}>
                    <div style={{ color: "#ff4d4d", fontWeight: 700, fontSize: 12 }}>{r.callsign} · {r.airline}</div>
                    <div style={{ color: "#9ca3af", fontSize: 11 }}>{r.from} → {r.to}</div>
                    <div style={{ color: "#4a5568", fontSize: 10, marginTop: 3 }}>{r.reason}</div>
                    <div style={{ color: "#ff9d00", fontSize: 10, marginTop: 2 }}>
                      ~${((r.flightHours || 5) * 7500 * 0.90 + (r.flightHours || 5) * 60 * 85).toLocaleString()} revenue exposure / flight
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </>
      )}

      {/* Conflict Timeline tab */}
      {tab === "timeline" && (
        <>
          <ST icon="📅" label="Airspace Conflict Timeline" color="#38bdf8" sub="Chronology of conflict-driven airspace restrictions affecting global aviation" />
          <div style={{ marginTop: 12, position: "relative", paddingLeft: 32 }}>
            {/* Vertical line */}
            <div style={{ position: "absolute", left: 12, top: 8, bottom: 8, width: 2, background: "#1f2d45" }} />
            {TIMELINE.map((ev, i) => {
              const zone = RESTRICTED_ZONES.find(z => z.id === ev.zone);
              const col = sevColor(ev.severity);
              return (
                <div key={i} style={{ position: "relative", marginBottom: 18, paddingLeft: 8 }}>
                  {/* Dot */}
                  <div style={{
                    position: "absolute", left: -26, top: 4,
                    width: 10, height: 10, borderRadius: "50%",
                    background: col, border: `2px solid #0d1626`,
                    boxShadow: `0 0 6px ${col}66`,
                  }} />
                  <div style={{ background: "#0d1626", borderRadius: 8, padding: "11px 14px", border: `1px solid #1f2d45`, borderLeft: `3px solid ${col}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, flexWrap: "wrap", gap: 4 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: col, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{ev.year}</span>
                        <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{ev.event}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <BADGE text={ev.severity} color={ev.severity === "CRITICAL" ? "red" : ev.severity === "HIGH" ? "yellow" : "green"} />
                        {zone && <span style={{ fontSize: 9, color: "#4a5568", padding: "2px 6px", background: "#0a1628", borderRadius: 3, border: "1px solid #1f2d45" }}>{zone.level}</span>}
                      </div>
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: 11, lineHeight: 1.5 }}>{ev.impact}</div>
                    {zone && (
                      <div style={{ marginTop: 6, fontSize: 10, color: "#4a5568" }}>
                        Zone: {zone.name} · FL {zone.flightLevels}
                        {zone.affected.length > 0 && ` · ${zone.affected.length} route(s) affected`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
