import { useState, useEffect, useRef } from "react";
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

const hotspots = [
  { id: 1,  label: "Eastern Ukraine",     type: "Kinetic",       level: "CRITICAL", x: 390, y: 118, actors: "APT-1887 + ground forces" },
  { id: 2,  label: "South China Sea",     type: "Maritime",      level: "HIGH",     x: 620, y: 195, actors: "PLAN vessels, AIS spoofing" },
  { id: 3,  label: "Sahel Region",        type: "Terrorism",     level: "HIGH",     x: 270, y: 230, actors: "Multiple non-state actors" },
  { id: 4,  label: "Baltic Sea",          type: "Hybrid",        level: "HIGH",     x: 345, y: 90,  actors: "Undersea cable interference" },
  { id: 5,  label: "Horn of Africa",      type: "Bio+Piracy",    level: "MEDIUM",   x: 380, y: 248, actors: "BT-2026-003 + maritime" },
  { id: 6,  label: "Taiwan Strait",       type: "Cyber+Naval",   level: "CRITICAL", x: 635, y: 168, actors: "IRON CARDINAL + PLAN" },
  { id: 7,  label: "Persian Gulf",        type: "Maritime",      level: "MEDIUM",   x: 460, y: 185, actors: "Tanker harassment ops" },
  { id: 8,  label: "Eastern Balkans",     type: "Bio+Disinfo",   level: "HIGH",     x: 360, y: 125, actors: "BT-2026-031 + EMBER WOLF" },
  { id: 9,  label: "Venezuela",           type: "Cyber",         level: "MEDIUM",   x: 185, y: 230, actors: "Criminal syndicate APT" },
  { id: 10, label: "North Korea",         type: "Cyber+ICBM",    level: "CRITICAL", x: 650, y: 140, actors: "State APT cluster" },
  { id: 11, label: "Syria / Levant",      type: "Hybrid",        level: "HIGH",     x: 402, y: 157, actors: "Multiple armed factions, foreign forces" },
  { id: 12, label: "Libya",               type: "Terrorism",     level: "MEDIUM",   x: 328, y: 192, actors: "Rival militias, foreign mercenaries" },
  { id: 13, label: "Kashmir LoC",         type: "Kinetic",       level: "HIGH",     x: 524, y: 153, actors: "Pak-India border incidents, militant groups" },
  { id: 14, label: "Myanmar",             type: "Hybrid",        level: "HIGH",     x: 590, y: 198, actors: "Military junta, resistance forces, ethnic armies" },
  { id: 15, label: "Yemen / Aden",        type: "Maritime",      level: "CRITICAL", x: 430, y: 213, actors: "Houthi naval units, coalition forces" },
  { id: 16, label: "DRC / Kivu",          type: "Terrorism",     level: "HIGH",     x: 362, y: 260, actors: "M23, FDLR, armed non-state actors" },
  { id: 17, label: "Sudan",               type: "Kinetic",       level: "HIGH",     x: 388, y: 230, actors: "SAF vs RSF — active civil war" },
  { id: 18, label: "Mozambique",          type: "Terrorism",     level: "MEDIUM",   x: 396, y: 278, actors: "ASWJ insurgency, Cabo Delgado" },
  { id: 19, label: "Colombia",            type: "Terrorism",     level: "MEDIUM",   x: 173, y: 237, actors: "FARC dissidents, ELN remnants" },
  { id: 20, label: "Arctic / Svalbard",   type: "Hybrid",        level: "MEDIUM",   x: 362, y: 52,  actors: "Russian Arctic brigade, military buildup" },
  { id: 21, label: "Armenia-Azerbaijan",  type: "Kinetic",       level: "MEDIUM",   x: 432, y: 138, actors: "Post-Karabakh tensions, border disputes" },
  { id: 22, label: "Iran Nuclear Sites",  type: "Cyber+Kinetic", level: "HIGH",     x: 450, y: 166, actors: "State actors, covert ops assessed" },
  { id: 23, label: "Philippines / WPS",   type: "Maritime",      level: "HIGH",     x: 630, y: 200, actors: "PLA Navy, BRP Sierra Madre standoff" },
  { id: 24, label: "Transnistria",        type: "Hybrid",        level: "MEDIUM",   x: 374, y: 112, actors: "Russian forces, Moldovan border friction" },
  { id: 25, label: "Sinai Peninsula",     type: "Terrorism",     level: "MEDIUM",   x: 378, y: 172, actors: "IS-Sinai remnants, cross-border activity" },
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

export default function ThreatMap() {
  const [apiKey] = useApiKey();
  const [tick, setTick] = useState(0);
  const [sel, setSel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [scanY, setScanY] = useState(0);
  const [filterType, setFilterType] = useState(() => {
    try { return localStorage.getItem("sentinel-threatmap-type") || "ALL"; } catch { return "ALL"; }
  });
  const [filterLevel, setFilterLevel] = useState(() => {
    try { return localStorage.getItem("sentinel-threatmap-level") || "ALL"; } catch { return "ALL"; }
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const svgRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef(null);
  const hasDragged = useRef(false);

  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setScanY(y => (y + 6) % 384), 40); return () => clearInterval(t); }, []);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = e => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 0.85 : 1.18;
      setZoom(z => Math.min(5, Math.max(0.6, z * f)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasDragged.current = false;
    setGrabbing(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }
  function handleMouseMove(e) {
    if (!isDragging.current || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
    setPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  }
  function handleMouseUp() { isDragging.current = false; setGrabbing(false); }

  const visible = hotspots.filter(h =>
    matchType(h.type, filterType) && (filterLevel === "ALL" || h.level === filterLevel)
  );

  function selectHotspot(h) {
    if (hasDragged.current) return;
    if (!visible.find(v => v.id === h.id)) return;
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

      {/* Map */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ background: "#0d1626", borderBottom: "1px solid #1f2d45", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <Pulse color="#ff4d4d" size={7} />
          <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>LIVE THREAT OVERLAY</span>
          <span style={{ marginLeft: "auto", color: "#3a4a5c", fontSize: 10 }}>Scroll zoom · drag pan</span>
          <div style={{ display: "flex", gap: 3, marginLeft: 8 }}>
            {[["＋", () => setZoom(z => Math.min(5, z * 1.3))], ["－", () => setZoom(z => Math.max(0.6, z * 0.77))], ["RST", () => { setZoom(1); setPan({ x: 0, y: 0 }); }]].map(([l, fn]) => (
              <button key={l} onClick={fn} style={{ background: "#1f2d45", border: "none", borderRadius: 3, color: "#9ca3af", fontSize: l === "RST" ? 8 : 13, width: l === "RST" ? 30 : 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{l}</button>
            ))}
          </div>
        </div>
        <svg ref={svgRef} viewBox="0 0 780 380" style={{ width: "100%", background: "#050d1a", display: "block", cursor: grabbing ? "grabbing" : "grab", userSelect: "none" }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {[60, 130, 200, 270, 340].map(y => <line key={y} x1={0} y1={y} x2={780} y2={y} stroke="#0d2040" strokeWidth="1" />)}
          {[0, 130, 260, 390, 520, 650, 780].map(x => <line key={x} x1={x} y1={0} x2={x} y2={380} stroke="#0d2040" strokeWidth="1" />)}
          {/* Continents */}
          <path d="M 60 80 Q 80 60 120 65 Q 150 60 175 80 Q 185 100 180 130 Q 170 160 155 180 Q 140 200 120 210 Q 100 195 85 175 Q 65 150 55 120 Q 48 95 60 80Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 145 220 Q 165 215 180 230 Q 190 250 185 280 Q 178 310 165 325 Q 150 330 138 315 Q 125 295 125 265 Q 125 240 145 220Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 295 70 Q 330 60 365 70 Q 385 80 390 100 Q 385 115 365 118 Q 340 122 315 115 Q 295 105 290 90 Q 288 78 295 70Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 295 130 Q 330 125 360 135 Q 375 155 372 185 Q 368 220 355 248 Q 338 268 318 265 Q 298 260 288 238 Q 278 210 280 180 Q 282 152 295 130Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 400 65 Q 470 55 540 65 Q 600 70 650 85 Q 685 100 695 125 Q 690 150 665 160 Q 630 168 590 162 Q 545 155 500 148 Q 455 140 420 128 Q 395 115 390 95 Q 390 78 400 65Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 600 260 Q 640 255 670 268 Q 685 285 678 305 Q 665 318 640 318 Q 615 315 605 298 Q 596 280 600 260Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          {/* Moving scan line */}
          <line x1={0} y1={scanY} x2={780} y2={scanY} stroke="#00ff9d" strokeWidth="1" opacity="0.10" />
          <line x1={0} y1={Math.max(0, scanY - 4)} x2={780} y2={Math.max(0, scanY - 4)} stroke="#00ff9d" strokeWidth="0.5" opacity="0.04" />
          {/* Connection lines for related hotspots */}
          <line x1={390} y1={118} x2={360} y2={125} stroke="#ff4d4d" strokeWidth="1" strokeDasharray="5 3" opacity="0.45" style={{ animation: "sentinelDash 1.4s linear infinite" }} />
          <line x1={620} y1={195} x2={635} y2={168} stroke="#4db8ff" strokeWidth="1" strokeDasharray="5 3" opacity="0.45" style={{ animation: "sentinelDash 1.8s linear infinite" }} />
          {/* Hotspots */}
          {hotspots.map((h, i) => {
            const c = typeColor(h.type);
            const crit = h.level === "CRITICAL";
            const phase = (tick + i * 2) % 8;
            const isSel = sel?.id === h.id;
            const isFiltered = !visible.find(v => v.id === h.id);
            return (
              <g key={h.id} onClick={() => selectHotspot(h)} style={{ cursor: isFiltered ? "default" : "pointer" }}>
                {!isFiltered && crit && <circle cx={h.x} cy={h.y} r={18 + phase * 1.5} fill="none" stroke={c} strokeWidth="0.5" opacity={Math.max(0, 0.45 - phase * 0.055)} />}
                <circle cx={h.x} cy={h.y} r={crit ? 9 : 6} fill={isFiltered ? "#1a2535" : c} opacity={isFiltered ? 0.3 : isSel ? 1 : 0.85} />
                <circle cx={h.x} cy={h.y} r={crit ? 14 : 10} fill="none" stroke={isFiltered ? "#1a2535" : c} strokeWidth={isSel ? 2 : 1} opacity={isFiltered ? 0.2 : isSel ? 0.8 : 0.35} />
                {isSel && <circle cx={h.x} cy={h.y} r={20} fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />}
                {isSel && <text x={h.x + 14} y={h.y - 6} fill="#e2e8f0" fontSize="9" fontWeight="bold">{h.label}</text>}
              </g>
            );
          })}
          </g>
          {/* Legend — fixed, outside transform */}
          {[["Kinetic", "#ff4d4d", 18], ["Cyber", "#4db8ff", 88], ["Maritime", "#00cfff", 153], ["Bio", "#00ff9d", 213], ["Hybrid", "#b47fff", 268]].map(([l, c, x]) => (
            <g key={l}>
              <circle cx={x} cy={368} r={4} fill={c} opacity="0.8" />
              <text x={x + 8} y={372} fill="#3a4a5c" fontSize="8">{l}</text>
            </g>
          ))}
        </svg>
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
