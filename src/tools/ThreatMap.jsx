import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Tooltip, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BADGE, Card, ST, PageHeader, StatBar, Btn, LiveBadge, Pulse, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt, maxTokens = 1200) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content.map(b => b.text || "").join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── Hotspot dataset ───────────────────────────────────────────────────────────
const HOTSPOTS = [
  { id:1,  lat:48.5,  lon:37.5,   region:"Europe",       label:"Eastern Ukraine",    type:"Kinetic",       level:"CRITICAL", trend:"→", escalation:"MEDIUM", actors:"APT-1887 + ground forces",           since:"Feb 2022", keyRisk:"Attrition grinding toward stalemate — winter offensive window" },
  { id:2,  lat:14.0,  lon:113.0,  region:"Asia",         label:"South China Sea",    type:"Maritime",      level:"HIGH",     trend:"↑", escalation:"HIGH",   actors:"PLAN vessels, AIS spoofing",          since:"2023",     keyRisk:"PRC second-island-chain interdiction rehearsal intensifying" },
  { id:3,  lat:14.5,  lon:2.0,    region:"Africa",       label:"Sahel Region",       type:"Terrorism",     level:"HIGH",     trend:"↑", escalation:"HIGH",   actors:"Wagner/Africa Corps, Jama'at Nusrat", since:"2021",     keyRisk:"Expanding caliphate vector — Mali/Burkina junction" },
  { id:4,  lat:57.5,  lon:19.0,   region:"Europe",       label:"Baltic Sea",         type:"Hybrid",        level:"HIGH",     trend:"↑", escalation:"MEDIUM", actors:"GRU undersea unit, SVR proxies",      since:"Feb 2022", keyRisk:"Undersea cable interference + GPS jamming — critical NATO flank" },
  { id:5,  lat:10.5,  lon:44.0,   region:"Africa",       label:"Horn of Africa",     type:"Bio+Piracy",    level:"MEDIUM",   trend:"→", escalation:"MEDIUM", actors:"BT-2026-003 + maritime militia",      since:"2024",     keyRisk:"Al-Shabaab resurging + BT-2026-003 dual threat" },
  { id:6,  lat:24.0,  lon:120.5,  region:"Asia",         label:"Taiwan Strait",      type:"Cyber+Naval",   level:"CRITICAL", trend:"↑", escalation:"HIGH",   actors:"IRON CARDINAL + PLAN 3rd Fleet",      since:"2023",     keyRisk:"PRC blockade exercise cadence accelerating — 18-month window" },
  { id:7,  lat:26.0,  lon:53.0,   region:"Middle East",  label:"Persian Gulf",       type:"Maritime",      level:"HIGH",     trend:"↑", escalation:"HIGH",   actors:"IRGC fast boat units, mining threat",  since:"2024",     keyRisk:"Hormuz closure contingency — 21% global oil flow at risk" },
  { id:8,  lat:42.5,  lon:26.0,   region:"Europe",       label:"Eastern Balkans",    type:"Bio+Disinfo",   level:"HIGH",     trend:"↑", escalation:"MEDIUM", actors:"BT-2026-031 + EMBER WOLF disinfo",    since:"2025",     keyRisk:"Dual bio-disinfo vector — Bulgarian/Romanian instability window" },
  { id:9,  lat:7.0,   lon:-66.0,  region:"Americas",     label:"Venezuela",          type:"Cyber",         level:"MEDIUM",   trend:"→", escalation:"LOW",    actors:"Criminal syndicate APT — EL CÓNDOR",  since:"2024",     keyRisk:"Narco-state cyber ops — critical infrastructure probing" },
  { id:10, lat:40.0,  lon:127.0,  region:"Asia",         label:"North Korea",        type:"Cyber+ICBM",    level:"CRITICAL", trend:"↑", escalation:"HIGH",   actors:"Lazarus Group + KPA ICBM units",       since:"2022",     keyRisk:"ICBM test frequency — Hwasong-18 MIRV capability operational" },
  { id:11, lat:34.5,  lon:38.5,   region:"Middle East",  label:"Syria / Levant",     type:"Hybrid",        level:"HIGH",     trend:"→", escalation:"MEDIUM", actors:"Multiple armed factions, IS remnants", since:"2012",     keyRisk:"Post-Assad power vacuum — IS-K infiltration risk" },
  { id:12, lat:27.5,  lon:17.0,   region:"Africa",       label:"Libya",              type:"Terrorism",     level:"MEDIUM",   trend:"→", escalation:"LOW",    actors:"Rival militias, Wagner remnants",      since:"2019",     keyRisk:"GNU-GNA standoff — Russian footprint expanding" },
  { id:13, lat:34.0,  lon:74.5,   region:"Asia",         label:"Kashmir LoC",        type:"Kinetic",       level:"HIGH",     trend:"↑", escalation:"HIGH",   actors:"Pak-India border — nuclear tripwire",  since:"2019",     keyRisk:"Cross-LoC skirmishes rising — Pak economic crisis driver" },
  { id:14, lat:19.5,  lon:96.5,   region:"Asia",         label:"Myanmar",            type:"Hybrid",        level:"HIGH",     trend:"↑", escalation:"MEDIUM", actors:"SAC junta, EAO resistance coalition",  since:"2021",     keyRisk:"Junta losing ground — fragmentation + refugee crisis" },
  { id:15, lat:14.5,  lon:46.5,   region:"Middle East",  label:"Yemen / Aden",       type:"Maritime",      level:"CRITICAL", trend:"↑", escalation:"HIGH",   actors:"Houthi ASMA units, Ansarallah naval",  since:"2024",     keyRisk:"Bab el-Mandeb anti-ship corridor — commercial shipping blockade" },
  { id:16, lat:-1.5,  lon:28.5,   region:"Africa",       label:"DRC / Kivu",         type:"Terrorism",     level:"HIGH",     trend:"↑", escalation:"HIGH",   actors:"M23, FDLR, RDF proxy forces",          since:"2022",     keyRisk:"M23 advance — Goma falling scenario, minerals corridor conflict" },
  { id:17, lat:15.5,  lon:31.5,   region:"Africa",       label:"Sudan",              type:"Kinetic",       level:"HIGH",     trend:"→", escalation:"MEDIUM", actors:"SAF vs RSF — active civil war",        since:"Apr 2023", keyRisk:"RSF Darfur consolidation — Khartoum contested" },
  { id:18, lat:-15.5, lon:37.5,   region:"Africa",       label:"Mozambique",         type:"Terrorism",     level:"MEDIUM",   trend:"↓", escalation:"LOW",    actors:"ASWJ insurgency, IS-Mozambique",       since:"2017",     keyRisk:"Cabo Delgado LNG infrastructure threat — Rwandan forces holding" },
  { id:19, lat:4.5,   lon:-74.0,  region:"Americas",     label:"Colombia",           type:"Terrorism",     level:"MEDIUM",   trend:"→", escalation:"LOW",    actors:"FARC-EMC dissidents, ELN",             since:"2022",     keyRisk:"Peace process collapse risk — ELN-EMC coordination growing" },
  { id:20, lat:78.5,  lon:17.0,   region:"Arctic",       label:"Arctic / Svalbard",  type:"Hybrid",        level:"MEDIUM",   trend:"↑", escalation:"MEDIUM", actors:"Russian 14th Army Corp, Arctic assets", since:"2022",     keyRisk:"NATO Arctic flank — undersea infrastructure, Svalbard probe" },
  { id:21, lat:40.5,  lon:47.0,   region:"Middle East",  label:"Armenia-Azerbaijan", type:"Kinetic",       level:"MEDIUM",   trend:"↓", escalation:"LOW",    actors:"AZ armed forces, Armenian border",     since:"2020",     keyRisk:"Remaining border demarcation friction — Zangezur corridor" },
  { id:22, lat:32.5,  lon:51.5,   region:"Middle East",  label:"Iran Nuclear Sites", type:"Cyber+Kinetic", level:"HIGH",     trend:"↑", escalation:"HIGH",   actors:"State actors — IAEA compliance crisis", since:"2024",     keyRisk:"90% enrichment threshold crossed — breakout 12–15 days" },
  { id:23, lat:12.0,  lon:121.0,  region:"Asia",         label:"Philippines / WPS",  type:"Maritime",      level:"HIGH",     trend:"↑", escalation:"HIGH",   actors:"PLA Navy, PCG water cannon ops",       since:"2023",     keyRisk:"Ayungin Shoal standoff — mutual defence treaty trigger risk" },
  { id:24, lat:47.5,  lon:29.5,   region:"Europe",       label:"Transnistria",       type:"Hybrid",        level:"MEDIUM",   trend:"→", escalation:"LOW",    actors:"Russian 14th Army, local FSB assets",  since:"2022",     keyRisk:"Frozen conflict activation risk — Moldova EU accession tension" },
  { id:25, lat:30.5,  lon:33.5,   region:"Middle East",  label:"Sinai Peninsula",    type:"Terrorism",     level:"MEDIUM",   trend:"→", escalation:"LOW",    actors:"IS-Sinai remnants, Egyptian ops",       since:"2011",     keyRisk:"IS-Sinai degraded — residual rural cell activity" },
];

// ── Threat correlations (network lines between hotspots) ─────────────────────
const CORRELATIONS = [
  { from:1,  to:4,  type:"Hybrid",    label:"Russia-NATO eastern flank" },
  { from:1,  to:24, type:"Hybrid",    label:"Ukraine-Transnistria corridor" },
  { from:1,  to:8,  type:"Cyber",     label:"Ukraine cyber-disinfo nexus" },
  { from:6,  to:10, type:"Cyber",     label:"PRC-DPRK cyber cooperation" },
  { from:6,  to:23, type:"Maritime",  label:"South China Sea-Taiwan axis" },
  { from:6,  to:2,  type:"Maritime",  label:"PRC island-chain perimeter" },
  { from:15, to:7,  type:"Maritime",  label:"Houthi-Hormuz maritime threat" },
  { from:15, to:5,  type:"Maritime",  label:"Red Sea-Horn interdiction" },
  { from:22, to:7,  type:"Kinetic",   label:"Iran nuclear-Gulf escalation" },
  { from:3,  to:17, type:"Terrorism", label:"Sahel-Sudan militant corridor" },
  { from:11, to:25, type:"Terrorism", label:"Levant-Sinai IS network" },
  { from:17, to:16, type:"Terrorism", label:"Sudan-DRC destabilization" },
];

// ── Style helpers ─────────────────────────────────────────────────────────────
const typeColor = t =>
  t === "Kinetic"              ? "#ff4d4d"
  : t.startsWith("Cyber")     ? "#4db8ff"
  : t === "Maritime"           ? "#00cfff"
  : t === "Terrorism"          ? "#ff9d00"
  : t.startsWith("Bio")       ? "#00ff9d"
  : "#b47fff"; // Hybrid

const levelColor = l => l === "CRITICAL" ? "#ff4d4d" : l === "HIGH" ? "#ff9d00" : l === "MEDIUM" ? "#ffd700" : "#00ff9d";

const escalColor = e => e === "HIGH" ? "#ff4d4d" : e === "MEDIUM" ? "#ffd700" : "#00ff9d";

function matchType(type, filter) {
  if (filter === "ALL") return true;
  if (filter === "Cyber") return type === "Cyber" || type.startsWith("Cyber");
  if (filter === "Bio")   return type.startsWith("Bio");
  return type === filter || type.startsWith(filter + "+");
}

const TYPE_FILTERS = [
  { id:"ALL",       label:"All",       color:"#9ca3af" },
  { id:"Kinetic",   label:"Kinetic",   color:"#ff4d4d" },
  { id:"Cyber",     label:"Cyber",     color:"#4db8ff" },
  { id:"Maritime",  label:"Maritime",  color:"#00cfff" },
  { id:"Terrorism", label:"Terror",    color:"#ff9d00" },
  { id:"Bio",       label:"Bio",       color:"#00ff9d" },
  { id:"Hybrid",    label:"Hybrid",    color:"#b47fff" },
];
const LEVEL_FILTERS  = ["ALL","CRITICAL","HIGH","MEDIUM"];
const REGION_FILTERS = ["ALL","Europe","Middle East","Asia","Africa","Americas","Arctic"];

function MapClickHandler({ onMapClick }) { useMapEvents({ click: onMapClick }); return null; }

// ── Regional mini-chart ───────────────────────────────────────────────────────
function RegionalChart({ hotspots }) {
  const regions = ["Europe","Middle East","Asia","Africa","Americas","Arctic"];
  const counts  = regions.map(r => ({ r, n: hotspots.filter(h => h.region === r).length, crit: hotspots.filter(h => h.region === r && h.level === "CRITICAL").length }));
  const max = Math.max(...counts.map(c => c.n), 1);
  return (
    <div>
      {counts.filter(c => c.n > 0).map(({ r, n, crit }) => (
        <div key={r} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
          <span style={{ color:"#4a5568", fontSize:9, width:72, whiteSpace:"nowrap" }}>{r}</span>
          <div style={{ flex:1, height:5, background:"#1a2740", borderRadius:3, overflow:"hidden" }}>
            <div style={{ width:`${(n/max)*100}%`, height:"100%", background: crit > 0 ? "#ff4d4d" : "#ff9d00", borderRadius:3 }} />
          </div>
          <span style={{ color: crit > 0 ? "#ff4d4d" : "#ff9d00", fontSize:9, fontFamily:"monospace", width:14, textAlign:"right" }}>{n}</span>
        </div>
      ))}
    </div>
  );
}

// ── Hotspot list row ──────────────────────────────────────────────────────────
function HotspotRow({ h, sel, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const isSel = sel?.id === h.id;
  const tc = typeColor(h.type);
  const lc = levelColor(h.level);
  const trendColor = h.trend === "↑" ? "#ff4d4d" : h.trend === "↓" ? "#00ff9d" : "#ffd700";
  return (
    <div onClick={() => onSelect(isSel ? null : h)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered || isSel ? "#141e30" : "#0d1626",
        borderRadius:6, padding:"9px 12px", cursor:"pointer",
        borderLeft:`3px solid ${tc}`,
        border: isSel ? `1px solid ${tc}55` : "1px solid transparent",
        borderLeftColor: tc,
        transition:"background 0.15s",
      }}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:3 }}>
        <div>
          <span style={{ fontWeight:600, color: isSel ? "#e2e8f0" : "#c9d1da", fontSize:12 }}>{h.label}</span>
          <span style={{ marginLeft:6, color:trendColor, fontSize:11, fontWeight:700 }}>{h.trend}</span>
        </div>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          <BADGE text={h.level} color={lc} />
        </div>
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span style={{ color:tc, fontSize:10, fontWeight:600 }}>{h.type}</span>
        <span style={{ color:"#4a5568", fontSize:9 }}>·</span>
        <span style={{ color:"#4a5568", fontSize:9 }}>{h.region}</span>
        <span style={{ color:"#4a5568", fontSize:9 }}>·</span>
        <span style={{ color:"#4a5568", fontSize:9 }}>Since {h.since}</span>
        <span style={{ marginLeft:"auto", color: escalColor(h.escalation), fontSize:9, fontWeight:600 }}>ESC: {h.escalation}</span>
      </div>
    </div>
  );
}

const tabStyle = (active, color = "#ff4d4d") => ({
  padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400,
  background: active ? color + "22" : "transparent",
  color: active ? color : "#4a5568",
  border: `1px solid ${active ? color + "44" : "transparent"}`,
  transition: "all 0.15s",
});

function AiHotspotPanel({ result, hotspot }) {
  const { assessment, key_vectors, intelligence_gaps, collection_priorities, outlook_30d } = result;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ background:"#051220", border:"1px solid #4db8ff33", borderLeft:"3px solid #4db8ff", borderRadius:6, padding:14, marginBottom:10 }}>
        <div style={{ color:"#4a5568", fontSize:10, letterSpacing:2, marginBottom:6 }}>AI THREAT ASSESSMENT · {hotspot.label.toUpperCase()}</div>
        <div style={{ color:"#e2e8f0", fontSize:12, lineHeight:1.75 }}>{assessment}</div>
      </div>
      {key_vectors?.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ color:"#4a5568", fontSize:10, letterSpacing:2, marginBottom:6 }}>KEY THREAT VECTORS</div>
          {key_vectors.map((v, i) => {
            const pc = v.probability === "HIGH" ? "#ff4d4d" : v.probability === "MEDIUM" ? "#ffd700" : "#00ff9d";
            return (
              <div key={i} style={{ background:"#0a1830", border:`1px solid ${pc}22`, borderLeft:`3px solid ${pc}`, borderRadius:6, padding:"7px 12px", marginBottom:5 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                  <span style={{ color:"#e2e8f0", fontSize:11, fontWeight:600 }}>{v.vector}</span>
                  <span style={{ color:pc, fontSize:10, fontWeight:700 }}>{v.probability}</span>
                </div>
                <div style={{ color:"#9ca3af", fontSize:11 }}>{v.description}</div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom: outlook_30d ? 8 : 0 }}>
        {intelligence_gaps?.length > 0 && (
          <div style={{ background:"#0a1830", borderRadius:6, padding:"8px 10px" }}>
            <div style={{ color:"#4a5568", fontSize:9, letterSpacing:1, marginBottom:5 }}>INTELLIGENCE GAPS</div>
            {intelligence_gaps.map((g, i) => <div key={i} style={{ color:"#9ca3af", fontSize:10, marginBottom:3 }}>• {g}</div>)}
          </div>
        )}
        {collection_priorities?.length > 0 && (
          <div style={{ background:"#0a1830", borderRadius:6, padding:"8px 10px" }}>
            <div style={{ color:"#4a5568", fontSize:9, letterSpacing:1, marginBottom:5 }}>COLLECTION PRIORITIES</div>
            {collection_priorities.map((p, i) => <div key={i} style={{ color:"#4db8ff", fontSize:10, marginBottom:3 }}>→ {p}</div>)}
          </div>
        )}
      </div>
      {outlook_30d && (
        <div style={{ background:"#0a1830", borderRadius:6, padding:"8px 12px" }}>
          <div style={{ color:"#4a5568", fontSize:9, letterSpacing:1, marginBottom:4 }}>30-DAY OUTLOOK</div>
          <div style={{ color:"#e2e8f0", fontSize:11, lineHeight:1.5 }}>{outlook_30d}</div>
        </div>
      )}
    </div>
  );
}

function GlobalBriefPanel({ result }) {
  const { summary, critical_clusters, domain_priorities, trigger_events, outlook_30d, outlook_90d } = result;
  const domainColor = d => d === "Cyber" ? "#4db8ff" : d === "Maritime" ? "#00cfff" : d === "Kinetic" ? "#ff4d4d" : "#b47fff";
  return (
    <div>
      <div style={{ background:"#051220", border:"1px solid #ff4d4d33", borderLeft:"3px solid #ff4d4d", borderRadius:6, padding:14, marginBottom:12 }}>
        <div style={{ color:"#4a5568", fontSize:10, letterSpacing:2, marginBottom:6 }}>GLOBAL THREAT LANDSCAPE · NSC LEVEL · {new Date().toISOString().slice(0,10)}</div>
        <div style={{ color:"#e2e8f0", fontSize:12, lineHeight:1.75 }}>{summary}</div>
      </div>
      {critical_clusters?.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ color:"#4a5568", fontSize:10, letterSpacing:2, marginBottom:8 }}>CRITICAL THREAT CLUSTERS</div>
          {critical_clusters.map((c, i) => (
            <div key={i} style={{ background:"#0a1830", border:"1px solid #ff4d4d22", borderLeft:"3px solid #ff4d4d", borderRadius:6, padding:"8px 12px", marginBottom:6 }}>
              <div style={{ color:"#e2e8f0", fontSize:12, fontWeight:700, marginBottom:4 }}>{c.name}</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:5 }}>
                {c.hotspots?.map((h, j) => (
                  <span key={j} style={{ background:"#141e30", borderRadius:3, padding:"2px 7px", color:"#9ca3af", fontSize:10 }}>{h}</span>
                ))}
              </div>
              <div style={{ color:"#4a5568", fontSize:11 }}>{c.nexus}</div>
            </div>
          ))}
        </div>
      )}
      {domain_priorities?.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%,180px),1fr))", gap:8, marginBottom:12 }}>
          {domain_priorities.map((d, i) => {
            const col = domainColor(d.domain);
            const tlc = d.threat_level === "CRITICAL" || d.threat_level === "HIGH" ? "#ff4d4d" : d.threat_level === "MEDIUM" ? "#ffd700" : "#00ff9d";
            return (
              <div key={i} style={{ background:"#0a1830", border:`1px solid ${col}22`, borderTop:`2px solid ${col}`, borderRadius:6, padding:"10px 12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                  <span style={{ color:col, fontSize:11, fontWeight:700 }}>{d.domain}</span>
                  <span style={{ color:tlc, fontSize:9, fontWeight:700 }}>{d.threat_level}</span>
                </div>
                <div style={{ color:"#9ca3af", fontSize:10, lineHeight:1.5 }}>{d.assessment}</div>
              </div>
            );
          })}
        </div>
      )}
      {trigger_events?.length > 0 && (
        <div style={{ background:"#0a1830", borderRadius:6, padding:"8px 12px", marginBottom:12 }}>
          <div style={{ color:"#4a5568", fontSize:9, letterSpacing:1, marginBottom:6 }}>TRIGGER EVENTS TO MONITOR</div>
          {trigger_events.map((e, i) => (
            <div key={i} style={{ color:"#ff9d00", fontSize:11, padding:"3px 0", borderBottom:"1px solid #1f2d4518" }}>⚡ {e}</div>
          ))}
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {outlook_30d && (
          <div style={{ background:"#0a1830", borderRadius:6, padding:"8px 12px" }}>
            <div style={{ color:"#4a5568", fontSize:9, letterSpacing:1, marginBottom:4 }}>30-DAY OUTLOOK</div>
            <div style={{ color:"#e2e8f0", fontSize:11, lineHeight:1.5 }}>{outlook_30d}</div>
          </div>
        )}
        {outlook_90d && (
          <div style={{ background:"#0a1830", borderRadius:6, padding:"8px 12px" }}>
            <div style={{ color:"#4a5568", fontSize:9, letterSpacing:1, marginBottom:4 }}>90-DAY OUTLOOK</div>
            <div style={{ color:"#e2e8f0", fontSize:11, lineHeight:1.5 }}>{outlook_90d}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ThreatMap() {
  const [apiKey] = useApiKey();
  const [sel, setSel]       = useState(null);
  const [aiResult, setAiResult]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState("");
  const [briefResult, setBriefResult]   = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError]     = useState("");
  const { stamp } = useLastAnalysis("threatmap");
  const [tab, setTab] = useState("map");
  const [showCorr, setShowCorr] = useState(true);
  const [filterType,   setFilterType]   = useState(() => { try { return localStorage.getItem("sentinel-tm-type")   || "ALL"; } catch { return "ALL"; } });
  const [filterLevel,  setFilterLevel]  = useState(() => { try { return localStorage.getItem("sentinel-tm-level")  || "ALL"; } catch { return "ALL"; } });
  const [filterRegion, setFilterRegion] = useState(() => { try { return localStorage.getItem("sentinel-tm-region") || "ALL"; } catch { return "ALL"; } });
  const [pulseTick, setPulseTick] = useState(0);

  // Pulse animation tick
  useEffect(() => {
    const id = setInterval(() => setPulseTick(t => t + 1), 900);
    return () => clearInterval(id);
  }, []);

  const visible = HOTSPOTS.filter(h =>
    matchType(h.type, filterType) &&
    (filterLevel  === "ALL" || h.level  === filterLevel) &&
    (filterRegion === "ALL" || h.region === filterRegion)
  );

  function selectHotspot(h) {
    setSel(sel?.id === h.id ? null : h);
    setAiResult(null); setAiError("");
  }

  async function analyzeHotspot(h) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const result = await callClaude(apiKey,
        `You are a senior intelligence analyst (DIA/MI6 level). Analyze the following threat hotspot.
Hotspot: ${h.label} (${h.region})
Type: ${h.type} | Level: ${h.level} | Trend: ${h.trend === "↑" ? "ESCALATING" : h.trend === "↓" ? "DE-ESCALATING" : "STABLE"}
Key actors: ${h.actors} | Escalation: ${h.escalation} | Risk: ${h.keyRisk} | Active since: ${h.since}

Return ONLY JSON (no markdown):
{
  "assessment": "4-5 sentence threat assessment covering operational situation, actor intent, and escalation triggers",
  "key_vectors": [{"vector": "vector name", "description": "tactical detail", "probability": "HIGH|MEDIUM|LOW"}],
  "intelligence_gaps": ["gap1", "gap2", "gap3"],
  "collection_priorities": ["priority1", "priority2", "priority3"],
  "outlook_30d": "brief 30-day outlook sentence"
}`
      );
      setAiResult(result);
      stamp();
      try { localStorage.setItem("sentinel_prefill_threatmap", result.assessment?.slice(0, 300) || ""); } catch {}
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  async function generateGlobalBrief() {
    setBriefResult(null); setBriefError(""); setBriefLoading(true);
    try {
      const criticals = HOTSPOTS.filter(h => h.level === "CRITICAL").map(h => `${h.label} (${h.type}): ${h.keyRisk}`).join("; ");
      const escalating = HOTSPOTS.filter(h => h.trend === "↑").map(h => h.label).join(", ");
      const byRegion = ["Europe","Middle East","Asia","Africa"].map(r => {
        const hs = HOTSPOTS.filter(h => h.region === r);
        return `${r}: ${hs.length} hotspots (${hs.filter(h => h.level === "CRITICAL").length} CRITICAL)`;
      }).join("; ");
      const result = await callClaude(apiKey,
        `You are the Director of National Intelligence briefing the National Security Council.
CRITICAL HOTSPOTS: ${criticals}
ESCALATING: ${escalating}
REGIONAL SUMMARY: ${byRegion}
Total hotspots: ${HOTSPOTS.length}

Return ONLY JSON (no markdown):
{
  "summary": "6-8 sentence strategic assessment covering most dangerous hotspots, threat clusters, domains of concern, and immediate priorities",
  "critical_clusters": [{"name": "cluster name", "hotspots": ["label1", "label2"], "nexus": "what strategically links them"}],
  "domain_priorities": [{"domain": "Cyber|Maritime|Kinetic|Hybrid", "assessment": "1-2 sentence assessment", "threat_level": "CRITICAL|HIGH|MEDIUM"}],
  "trigger_events": ["event1 to monitor", "event2", "event3", "event4"],
  "outlook_30d": "30-day strategic outlook sentence",
  "outlook_90d": "90-day strategic outlook sentence"
}`,
        1500
      );
      setBriefResult(result);
      stamp();
      setTab("brief");
    } catch (e) { setBriefError("Error: " + e.message); }
    setBriefLoading(false);
  }

  const criticalCount  = HOTSPOTS.filter(h => h.level === "CRITICAL").length;
  const highCount      = HOTSPOTS.filter(h => h.level === "HIGH").length;
  const escalatingCount = HOTSPOTS.filter(h => h.trend === "↑").length;

  const TABS = [
    { id: "map",   label: "Threat Map" },
    ...(briefResult ? [{ id: "brief", label: "Global Brief" }] : []),
  ];

  return (
    <div>
      <PageHeader
        icon="🌍"
        title="Global Threat Map"
        sub="Real-time geolocation of active threat incidents, actor networks, and escalation vectors — worldwide."
        accent="#ff4d4d"
        dataMode={apiKey ? "hybrid" : "mock"}
        classification="SECRET"
        badges={[{ text:"25 Hotspots", color:"#ff4d4d" }, { text:"Live", color:"#00ff9d" }]}
      />

      <StatBar stats={[
        { label:"Active Conflicts", value:"7",             color:"#ff4d4d" },
        { label:"CRITICAL Hotspots", value:String(criticalCount), color:"#ff4d4d" },
        { label:"Escalating ↑",     value:String(escalatingCount), color:"#ff9d00" },
        { label:"Cyber Incidents",  value:"143",           color:"#4db8ff" },
        { label:"Maritime Alerts",  value:"12",            color:"#00cfff" },
        { label:"Bio Signals",      value:"14",            color:"#00ff9d" },
      ]} />

      {/* Tab bar */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>
        ))}
        {apiKey && (
          <button onClick={generateGlobalBrief} disabled={briefLoading}
            style={{ ...tabStyle(false, "#ffd700"), marginLeft:"auto", opacity: briefLoading ? 0.6 : 1 }}>
            {briefLoading ? "⏳ Generating..." : "📊 NSC Brief"}
          </button>
        )}
        <LastAnalysisTag toolId="threatmap" />
      </div>
      {briefError && <div style={{ color:"#ff4d4d", fontSize:12, marginBottom:8 }}>{briefError}</div>}

      {tab === "map" && (<>

      {/* Map */}
      <Card style={{ padding:0, overflow:"hidden", marginBottom:14 }}>
        <div style={{ background:"#0d1626", borderBottom:"1px solid #1f2d45", padding:"8px 14px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <Pulse color="#ff4d4d" size={7} />
          <span style={{ color:"#4a5568", fontSize:10, letterSpacing:2 }}>LIVE THREAT OVERLAY</span>
          <span style={{ color:"#3a4a5c", fontSize:10 }}>Click marker = detail · Hover = info</span>
          <label style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}>
            <input type="checkbox" checked={showCorr} onChange={e => setShowCorr(e.target.checked)} style={{ accentColor:"#b47fff" }} />
            <span style={{ color:"#4a5568", fontSize:10 }}>Show correlation lines</span>
          </label>
        </div>

        <MapContainer center={[20, 15]} zoom={2} minZoom={1} maxZoom={8}
          style={{ height:460, background:"#050d1a" }} scrollWheelZoom attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={10} />
          <MapClickHandler onMapClick={() => { setSel(null); setAiResult(null); }} />

          {/* Correlation lines */}
          {showCorr && CORRELATIONS.map((corr, i) => {
            const a = HOTSPOTS.find(h => h.id === corr.from);
            const b = HOTSPOTS.find(h => h.id === corr.to);
            if (!a || !b) return null;
            const isVisible = visible.find(h => h.id === corr.from) && visible.find(h => h.id === corr.to);
            if (!isVisible) return null;
            return (
              <Polyline key={i} positions={[[a.lat, a.lon], [b.lat, b.lon]]}
                pathOptions={{ color: typeColor(corr.type), weight: 1, opacity: 0.25, dashArray:"4 6" }}
              >
                <Tooltip sticky direction="center">
                  <span style={{ fontSize:10, fontFamily:"monospace" }}>
                    <strong>{corr.label}</strong><br />
                    <span style={{ color: typeColor(corr.type) }}>{corr.type}</span>
                  </span>
                </Tooltip>
              </Polyline>
            );
          })}

          {/* Dimmed markers */}
          {HOTSPOTS.filter(h => !visible.find(v => v.id === h.id)).map(h => (
            <CircleMarker key={`dim-${h.id}`} center={[h.lat, h.lon]} radius={3}
              pathOptions={{ color:"#1a2535", fillColor:"#1a2535", fillOpacity:0.4, weight:0 }}
            />
          ))}

          {/* Visible hotspots */}
          {visible.map(h => {
            const c    = typeColor(h.type);
            const isSel = sel?.id === h.id;
            const r    = h.level === "CRITICAL" ? 9 : h.level === "HIGH" ? 7 : 5;
            const pulseOpacity = h.level === "CRITICAL" ? (pulseTick % 2 === 0 ? 0.10 : 0.04) : 0;
            return (
              <span key={h.id}>
                {/* Pulse aura ring */}
                {h.level === "CRITICAL" && (
                  <Circle center={[h.lat, h.lon]} radius={isSel ? 420000 : 320000}
                    pathOptions={{ color:c, fillColor:c, fillOpacity: pulseOpacity, weight:1, opacity:0.4 }}
                  />
                )}
                {/* Secondary ring for selected */}
                {isSel && (
                  <Circle center={[h.lat, h.lon]} radius={160000}
                    pathOptions={{ color:c, fillColor:"none", fillOpacity:0, weight:1.5, dashArray:"5 4", opacity:0.7 }}
                  />
                )}
                {/* Main marker */}
                <CircleMarker center={[h.lat, h.lon]} radius={isSel ? r + 3 : r}
                  pathOptions={{ color:c, fillColor:c, fillOpacity: isSel ? 1 : 0.8, weight: isSel ? 2.5 : 1.5 }}
                  eventHandlers={{ click: e => { e.originalEvent.stopPropagation(); selectHotspot(h); } }}
                >
                  <Tooltip direction="top" sticky={false}>
                    <div style={{ fontSize:11, fontFamily:"monospace", maxWidth:220 }}>
                      <strong style={{ color: levelColor(h.level) }}>{h.level}</strong> — {h.label}<br />
                      <span style={{ color: typeColor(h.type) }}>{h.type}</span> · {h.region}<br />
                      <span style={{ opacity:0.75 }}>{h.actors}</span><br />
                      <span style={{ color:"#ffd700" }}>Escalation: {h.escalation} {h.trend}</span>
                    </div>
                  </Tooltip>
                </CircleMarker>
              </span>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div style={{ background:"#0d1626", borderTop:"1px solid #1f2d45", padding:"7px 14px", display:"flex", gap:14, flexWrap:"wrap", alignItems:"center" }}>
          {[["Kinetic","#ff4d4d"],["Cyber","#4db8ff"],["Maritime","#00cfff"],["Bio","#00ff9d"],["Terrorism","#ff9d00"],["Hybrid","#b47fff"]].map(([l,c]) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:c, opacity:0.9 }} />
              <span style={{ color:"#4a5568", fontSize:9 }}>{l}</span>
            </div>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", gap:14 }}>
            {[["↑ Escalating","#ff4d4d"],["→ Stable","#ffd700"],["↓ De-escalating","#00ff9d"]].map(([l,c]) => (
              <span key={l} style={{ color:c, fontSize:9, fontWeight:600 }}>{l}</span>
            ))}
          </div>
        </div>
      </Card>

      {/* Selected hotspot detail */}
      {sel && (
        <Card style={{ borderLeft:`3px solid ${typeColor(sel.type)}`, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div>
              <div style={{ color:"#4a5568", fontSize:9, letterSpacing:3, marginBottom:4 }}>HOTSPOT INTELLIGENCE</div>
              <div style={{ fontWeight:800, fontSize:16, color:"#e2e8f0" }}>
                {sel.label}
                <span style={{ fontSize:14, marginLeft:8, color: sel.trend === "↑" ? "#ff4d4d" : sel.trend === "↓" ? "#00ff9d" : "#ffd700" }}>{sel.trend}</span>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
              <BADGE text={sel.level} color={levelColor(sel.level)} />
              <button onClick={() => setSel(null)} style={{ background:"none", border:"1px solid #1f2d45", borderRadius:4, color:"#4a5568", fontSize:10, padding:"2px 8px", cursor:"pointer" }}>✕</button>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%,120px),1fr))", gap:8, marginBottom:12 }}>
            {[
              ["TYPE",       sel.type,       typeColor(sel.type)],
              ["REGION",     sel.region,     "#38bdf8"],
              ["SINCE",      sel.since,      "#ffd700"],
              ["ESCALATION", sel.escalation, escalColor(sel.escalation)],
              ["ACTORS",     sel.actors,     "#e2e8f0"],
              ["KEY RISK",   sel.keyRisk,    "#9ca3af"],
            ].map(([label, value, color]) => (
              <div key={label} style={{ background:"#0d1626", borderRadius:6, padding:"7px 10px" }}>
                <div style={{ color:"#4a5568", fontSize:9, letterSpacing:1, marginBottom:3 }}>{label}</div>
                <div style={{ color, fontSize:11, fontWeight:600, lineHeight:1.4 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Correlated hotspots */}
          {(() => {
            const corrs = CORRELATIONS.filter(c => c.from === sel.id || c.to === sel.id);
            if (!corrs.length) return null;
            return (
              <div style={{ background:"#0d1626", borderRadius:6, padding:"8px 12px", marginBottom:12 }}>
                <div style={{ color:"#4a5568", fontSize:9, letterSpacing:1, marginBottom:6 }}>CORRELATED THREAT NODES</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {corrs.map((c, i) => {
                    const otherId = c.from === sel.id ? c.to : c.from;
                    const other   = HOTSPOTS.find(h => h.id === otherId);
                    return other ? (
                      <span key={i} style={{ background:"#141e30", borderRadius:4, padding:"3px 8px", fontSize:10, color: typeColor(c.type), border:`1px solid ${typeColor(c.type)}33` }}>
                        {other.label} — <span style={{ color:"#4a5568" }}>{c.label}</span>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            );
          })()}

          {apiKey && (
            <Btn onClick={() => analyzeHotspot(sel)} disabled={aiLoading} color="#4db8ff">
              {aiLoading ? "Analyzing..." : "AI Threat Assessment"}
            </Btn>
          )}
          {aiError && <div style={{ color:"#ff4d4d", fontSize:12, marginTop:8 }}>{aiError}</div>}
          {aiResult && (
            <>
              <AiHotspotPanel result={aiResult} hotspot={sel} />
              <div style={{ marginTop:8 }}>
                <ExportBtn data={{ hotspot: sel.label, region: sel.region, ...aiResult }} filename={`sentinel-threatmap-${sel.label.replace(/\s/g,"-").toLowerCase()}`} />
              </div>
            </>
          )}
        </Card>
      )}

      {/* Filters + regional chart */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, marginBottom:10, alignItems:"start", flexWrap:"wrap" }}>
        <Card style={{ padding:"12px 14px", marginBottom:0 }}>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ color:"#4a5568", fontSize:10, letterSpacing:1, marginRight:2 }}>TYPE</span>
              {TYPE_FILTERS.map(f => {
                const active = filterType === f.id;
                return (
                  <button key={f.id} onClick={() => { setFilterType(f.id); setSel(null); try { localStorage.setItem("sentinel-tm-type", f.id); } catch {} }} style={{
                    background: active ? f.color : "#1f2d45", color: active ? "#0a0f1e" : "#9ca3af",
                    border:`1px solid ${active ? f.color : "transparent"}`,
                    borderRadius:4, padding:"3px 9px", cursor:"pointer", fontSize:10, fontWeight: active ? 700 : 400, transition:"all 0.15s",
                  }}>{f.label}</button>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ color:"#4a5568", fontSize:10, letterSpacing:1, marginRight:2 }}>LEVEL</span>
              {LEVEL_FILTERS.map(f => {
                const active = filterLevel === f;
                const fc = f === "CRITICAL" ? "#ff4d4d" : f === "HIGH" ? "#ff9d00" : f === "MEDIUM" ? "#ffd700" : "#9ca3af";
                return (
                  <button key={f} onClick={() => { setFilterLevel(f); setSel(null); try { localStorage.setItem("sentinel-tm-level", f); } catch {} }} style={{
                    background: active ? fc : "#1f2d45", color: active ? "#0a0f1e" : "#9ca3af",
                    border:`1px solid ${active ? fc : "transparent"}`,
                    borderRadius:4, padding:"3px 9px", cursor:"pointer", fontSize:10, fontWeight: active ? 700 : 400, transition:"all 0.15s",
                  }}>{f}</button>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ color:"#4a5568", fontSize:10, letterSpacing:1, marginRight:2 }}>REGION</span>
              {REGION_FILTERS.map(f => {
                const active = filterRegion === f;
                return (
                  <button key={f} onClick={() => { setFilterRegion(f); setSel(null); try { localStorage.setItem("sentinel-tm-region", f); } catch {} }} style={{
                    background: active ? "#38bdf8" : "#1f2d45", color: active ? "#0a0f1e" : "#9ca3af",
                    border:`1px solid ${active ? "#38bdf8" : "transparent"}`,
                    borderRadius:4, padding:"3px 9px", cursor:"pointer", fontSize:10, fontWeight: active ? 700 : 400, transition:"all 0.15s",
                  }}>{f}</button>
                );
              })}
            </div>
            <span style={{ marginLeft:"auto", color:"#4a5568", fontSize:11 }}>{visible.length}/{HOTSPOTS.length}</span>
          </div>
        </Card>

        {/* Regional distribution */}
        <Card style={{ padding:"12px 14px", marginBottom:0, minWidth:200 }}>
          <div style={{ fontSize:9, color:"#4a5568", letterSpacing:2, marginBottom:8 }}>HOTSPOTS BY REGION</div>
          <RegionalChart hotspots={visible} />
        </Card>
      </div>

      {/* Hotspot list */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%, 280px),1fr))", gap:6 }}>
        {visible.map(h => (
          <HotspotRow key={h.id} h={h} sel={sel} onSelect={v => { setSel(v); setAiResult(null); setAiError(""); }} />
        ))}
        {visible.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"28px 0", color:"#4a5568" }}>
            No hotspots match the selected filters.
          </div>

        )}
      </div>

      </>)}

      {tab === "brief" && (
        briefResult ? (
          <Card>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" }}>
              <LiveBadge />
              <ST icon="📊" label="Global Threat Landscape Brief" color="#ff4d4d" sub="NSC Level · SECRET/NOFORN" />
              <ExportBtn data={briefResult} filename="sentinel-threatmap-brief" />
            </div>
            <GlobalBriefPanel result={briefResult} />
          </Card>
        ) : (
          <Card>
            <div style={{ textAlign:"center", padding:"40px 20px", color:"#4a5568" }}>
              {briefLoading
                ? "⏳ Generating global threat brief..."
                : "Click 📊 NSC Brief to generate a structured global threat landscape assessment."}
            </div>
          </Card>
        )
      )}
    </div>
  );
}
