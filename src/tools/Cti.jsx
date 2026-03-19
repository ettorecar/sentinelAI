import { useState, useEffect } from "react";
import { BADGE, Card, ST, PageHeader, StatBar, Btn, LiveBadge, riskColor, CopyBtn, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
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

const actors = [
  { id: "APT-2241", name: "IRON CARDINAL",  origin: "East Asia",      target: "Defence, Aerospace",        ttps: ["Spearphishing","LOLBins","Custom RAT"],        active: true,  threat: "CRITICAL", activity: [4,7,3,8,12,9,15], campaigns: 3, c2nodes: 12, lastSeen: "Today"   },
  { id: "APT-1887", name: "EMBER WOLF",     origin: "Eastern Europe", target: "Energy, Government",        ttps: ["Supply chain","ICS exploit","Wiper"],          active: true,  threat: "HIGH",     activity: [8,6,10,7,9,11,8],  campaigns: 2, c2nodes: 7,  lastSeen: "Today"   },
  { id: "APT-0934", name: "SILENT MANTIS",  origin: "Middle East",    target: "Financial, Telco",          ttps: ["Zero-days","DNS hijack","Cred theft"],         active: false, threat: "MEDIUM",   activity: [2,3,2,1,3,2,2],    campaigns: 1, c2nodes: 3,  lastSeen: "45d ago" },
  { id: "APT-3312", name: "PALE THUNDER",   origin: "Unknown",        target: "Maritime, Ports",           ttps: ["AIS spoofing","GNSS jam","Port intrusion"],    active: true,  threat: "HIGH",     activity: [5,3,6,8,5,9,11],   campaigns: 2, c2nodes: 5,  lastSeen: "2d ago"  },
  { id: "APT-5566", name: "VENOM SPIDER",   origin: "North Korea",    target: "Crypto exchanges, Banks",   ttps: ["SWIFT fraud","Crypto theft","Phishing kit"],   active: true,  threat: "HIGH",     activity: [6,4,7,5,8,6,10],   campaigns: 2, c2nodes: 8,  lastSeen: "1d ago"  },
  { id: "APT-7781", name: "CRIMSON TIDE",   origin: "Russia",         target: "SIGINT, Military comms",    ttps: ["MITM","SATCOM intercept","Firmware implant"],  active: true,  threat: "CRITICAL", activity: [3,5,4,6,8,7,12],   campaigns: 3, c2nodes: 15, lastSeen: "Today"   },
  { id: "APT-2290", name: "JADE SERPENT",   origin: "China",          target: "Semiconductor, IP theft",   ttps: ["Watering hole","VPN exploit","Insider threat"], active: true,  threat: "HIGH",     activity: [7,9,8,10,6,11,9],  campaigns: 4, c2nodes: 20, lastSeen: "Today"   },
  { id: "APT-4401", name: "GHOST JACKAL",   origin: "Iran",           target: "OT/SCADA, Energy sector",  ttps: ["PLC exploit","Air-gap jump","USB drop"],       active: false, threat: "HIGH",     activity: [1,2,0,1,2,1,3],    campaigns: 1, c2nodes: 4,  lastSeen: "30d ago" },
  { id: "APT-6623", name: "COBALT LYNX",    origin: "Belarus",        target: "NGOs, Dissident groups",   ttps: ["Spyware","Signal exploit","Social eng"],       active: true,  threat: "MEDIUM",   activity: [3,2,4,3,2,3,5],    campaigns: 1, c2nodes: 6,  lastSeen: "3d ago"  },
  { id: "APT-8834", name: "PHANTOM CRANE",  origin: "Unknown",        target: "Critical infrastructure",  ttps: ["0-day exploit","Ransomware","Data exfil"],     active: true,  threat: "CRITICAL", activity: [0,0,0,0,2,8,15],   campaigns: 1, c2nodes: 9,  lastSeen: "Today"   },
];

const CAMPAIGNS = [
  { id: "OPS-1147", name: "SHADOW BREACH",  actors: ["EMBER WOLF","IRON CARDINAL"], sector: "Energy / OT",       status: "ACTIVE",   start: "Nov 2024", phase: "Exfiltration",  iocCount: 23, countries: "DE · UA · PL", confidence: 87, desc: "Coordinated supply-chain attack against European energy sector utilities. Espionage + pre-positioning for disruption." },
  { id: "OPS-2291", name: "SILENT HARVEST", actors: ["JADE SERPENT"],               sector: "Semiconductor",     status: "ACTIVE",   start: "Aug 2024", phase: "Collection",    iocCount: 41, countries: "TW · US · NL", confidence: 91, desc: "Long-running IP theft campaign against leading semiconductor fabs and EDA vendors. Watering hole + VPN exploit chain." },
  { id: "OPS-3308", name: "ARCTIC SHADOW",  actors: ["CRIMSON TIDE"],               sector: "SIGINT / Military", status: "ACTIVE",   start: "Jan 2025", phase: "C2",            iocCount: 18, countries: "NO · FI · EE", confidence: 79, desc: "SATCOM and military communications interception campaign targeting Nordic NATO member infrastructure." },
  { id: "OPS-4412", name: "STEEL TIDE",     actors: ["PALE THUNDER","EMBER WOLF"],  sector: "Maritime / Ports",  status: "ACTIVE",   start: "Feb 2025", phase: "Lateral Move",  iocCount: 15, countries: "AE · OM · SG", confidence: 72, desc: "Dual-actor campaign targeting port management systems and AIS networks in key Indo-Pacific shipping hubs." },
  { id: "OPS-5501", name: "PHANTOM SURGE",  actors: ["PHANTOM CRANE"],              sector: "Critical Infra",    status: "ACTIVE",   start: "Mar 2025", phase: "Escalating",    iocCount: 31, countries: "US · UK · AU", confidence: 65, desc: "Newly identified actor. Rapid escalation from initial access to ransomware pre-positioning within 96 hours." },
  { id: "OPS-6003", name: "GOLDEN HARVEST", actors: ["VENOM SPIDER"],               sector: "Finance / Crypto",  status: "RESOLVED", start: "Oct 2024", phase: "Completed",     iocCount: 57, countries: "KR · JP · US", confidence: 95, desc: "Large-scale crypto exchange targeting campaign. $340M estimated theft. Fully attributed to DPRK-linked actor." },
];

const iocs = [
  { type: "IP",     value: "185.220.xxx.xxx",            actor: "EMBER WOLF",    date: "Today",  campaign: "OPS-1147" },
  { type: "Domain", value: "update-cdn-secure[.]net",    actor: "IRON CARDINAL", date: "Today",  campaign: "OPS-1147" },
  { type: "Hash",   value: "a1b2c3d4e5f6...",            actor: "PALE THUNDER",  date: "Today",  campaign: "OPS-4412" },
  { type: "IP",     value: "91.108.xxx.xxx",             actor: "EMBER WOLF",    date: "1d ago", campaign: "OPS-1147" },
  { type: "Hash",   value: "b3e7f2a19c4d...",            actor: "CRIMSON TIDE",  date: "Today",  campaign: "OPS-3308" },
  { type: "Domain", value: "cdn-delivery-net[.]ru",      actor: "VENOM SPIDER",  date: "Today",  campaign: "OPS-6003" },
  { type: "IP",     value: "45.142.xxx.xxx",             actor: "JADE SERPENT",  date: "1d ago", campaign: "OPS-2291" },
  { type: "URL",    value: "hxxps://docs-share[.]io/p",  actor: "EMBER WOLF",    date: "2d ago", campaign: "OPS-1147" },
  { type: "Hash",   value: "9f1d8e2b7a3c...",            actor: "IRON CARDINAL", date: "2d ago", campaign: "OPS-1147" },
  { type: "Domain", value: "secure-update[.]biz",        actor: "PHANTOM CRANE", date: "Today",  campaign: "OPS-5501" },
  { type: "IP",     value: "194.165.xxx.xxx",            actor: "GHOST JACKAL",  date: "3d ago", campaign: null       },
  { type: "Hash",   value: "c4a9b7d38e1f...",            actor: "COBALT LYNX",   date: "3d ago", campaign: null       },
  { type: "Domain", value: "api-gateway-cloud[.]net",    actor: "IRON CARDINAL", date: "4d ago", campaign: "OPS-1147" },
  { type: "IP",     value: "103.75.xxx.xxx",             actor: "JADE SERPENT",  date: "4d ago", campaign: "OPS-2291" },
  { type: "Hash",   value: "7e2c5f9a4b8d...",            actor: "VENOM SPIDER",  date: "5d ago", campaign: "OPS-6003" },
  { type: "URL",    value: "hxxps://cdn-update[.]io/dl", actor: "PHANTOM CRANE", date: "Today",  campaign: "OPS-5501" },
  { type: "IP",     value: "176.52.xxx.xxx",             actor: "CRIMSON TIDE",  date: "2d ago", campaign: "OPS-3308" },
  { type: "Hash",   value: "d8f3c1e7a5b9...",            actor: "JADE SERPENT",  date: "3d ago", campaign: "OPS-2291" },
  { type: "Domain", value: "port-logistics[.]info",      actor: "PALE THUNDER",  date: "1d ago", campaign: "OPS-4412" },
  { type: "IP",     value: "188.119.xxx.xxx",            actor: "PHANTOM CRANE", date: "Today",  campaign: "OPS-5501" },
];

// MITRE ATT&CK coverage per actor (11 tactics)
const MITRE_TACTICS = ["Initial Access","Execution","Persistence","Priv Esc","Defense Eva","Cred Access","Discovery","Lateral Move","Collection","C2","Exfiltration"];
const TACTIC_COLORS = ["#ff9d00","#ff4d4d","#b47fff","#ff4d4d","#4db8ff","#ffd700","#00ff9d","#4db8ff","#ff9d00","#b47fff","#ff4d4d"];
const MITRE_MATRIX = {
  "IRON CARDINAL":  [1,1,1,1,1,0,1,1,1,1,1],
  "EMBER WOLF":     [1,1,1,0,1,0,0,1,0,1,1],
  "SILENT MANTIS":  [1,0,1,1,1,1,0,0,1,1,0],
  "PALE THUNDER":   [1,0,0,0,1,0,1,0,0,1,0],
  "VENOM SPIDER":   [1,1,0,1,1,1,1,1,1,1,1],
  "CRIMSON TIDE":   [1,1,1,1,1,1,1,1,1,1,0],
  "JADE SERPENT":   [1,1,1,1,1,1,1,1,1,1,1],
  "GHOST JACKAL":   [1,0,1,0,0,0,1,0,0,1,0],
  "COBALT LYNX":    [1,0,0,0,0,1,1,0,1,1,0],
  "PHANTOM CRANE":  [1,1,1,1,1,0,1,1,1,1,1],
};
const IOC_TYPE_COLORS = { IP: "#4db8ff", Domain: "#ffd700", Hash: "#ff9d00", URL: "#b47fff" };
const DAYS = ["D-6","D-5","D-4","D-3","D-2","D-1","Today"];

function tabStyle(active, color = "#4db8ff") {
  return {
    background: active ? `${color}18` : "transparent",
    color: active ? color : "#6b7a8d",
    border: "none", borderBottom: `2px solid ${active ? color : "transparent"}`,
    padding: "8px 16px", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: 0.5, transition: "all 0.15s", whiteSpace: "nowrap",
  };
}

function MiniBar({ data, color }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 28 }}>
      {data.map((v, i) => (
        <div key={i} style={{ width: 8, borderRadius: 2, background: i === data.length - 1 ? color : `${color}55`, height: `${Math.max(15, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function IocDonut({ iocList }) {
  const counts = {};
  iocList.forEach(ioc => { counts[ioc.type] = (counts[ioc.type] || 0) + 1; });
  const total = iocList.length;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const R = 42, r = 27, cx = 55, cy = 55;
  let cum = -Math.PI / 2;
  const segments = entries.map(([type, count]) => {
    const angle = (count / total) * 2 * Math.PI;
    const GAP = 0.04;
    const sa = cum + GAP, ea = cum + angle - GAP; cum += angle;
    const x1 = cx + R * Math.cos(sa), y1 = cy + R * Math.sin(sa);
    const x2 = cx + R * Math.cos(ea), y2 = cy + R * Math.sin(ea);
    const xi1 = cx + r * Math.cos(sa), yi1 = cy + r * Math.sin(sa);
    const xi2 = cx + r * Math.cos(ea), yi2 = cy + r * Math.sin(ea);
    const la = angle > Math.PI ? 1 : 0;
    return { type, count, path: `M ${x1} ${y1} A ${R} ${R} 0 ${la} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${r} ${r} 0 ${la} 0 ${xi1} ${yi1} Z` };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg viewBox="0 0 110 110" style={{ width: 100, height: 100, flexShrink: 0 }}>
        {segments.map(({ type, path }) => <path key={type} d={path} fill={IOC_TYPE_COLORS[type] || "#555"} opacity="0.9" />)}
        <circle cx={cx} cy={cy} r={r - 1} fill="#0a1220" />
        <text x={cx} y={cy - 3} textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="900">{total}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#4a5568" fontSize="6" letterSpacing="1">IOCs</text>
      </svg>
      <div style={{ flex: 1, minWidth: 120 }}>
        {entries.map(([type, count]) => (
          <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: IOC_TYPE_COLORS[type] || "#555" }} />
              <span style={{ color: "#9ca3af", fontSize: 11 }}>{type}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 50, background: "#1f2d45", borderRadius: 2, height: 4 }}>
                <div style={{ width: `${(count / total) * 100}%`, background: IOC_TYPE_COLORS[type] || "#555", height: 4, borderRadius: 2 }} />
              </div>
              <span style={{ color: IOC_TYPE_COLORS[type] || "#555", fontSize: 11, fontWeight: 700, minWidth: 14, textAlign: "right" }}>{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MitreMatrix({ pulse }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 700 }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: `130px repeat(${MITRE_TACTICS.length}, 1fr)`, gap: 2, marginBottom: 2 }}>
          <div style={{ color: "#2d3f55", fontSize: 9, padding: "4px 0", letterSpacing: 1 }}>ACTOR</div>
          {MITRE_TACTICS.map((t, i) => (
            <div key={t} style={{ background: "#0d1626", border: "1px solid #1a2638", borderRadius: "3px 3px 0 0", padding: "4px 2px", textAlign: "center" }}>
              <div style={{ color: TACTIC_COLORS[i], fontSize: 6, letterSpacing: 0.3, fontWeight: 700 }}>{t.toUpperCase()}</div>
            </div>
          ))}
        </div>
        {/* Actor rows */}
        {actors.map(a => {
          const coverage = MITRE_MATRIX[a.name] || [];
          const c = riskColor(a.threat);
          const isCrit = a.threat === "CRITICAL" && a.active;
          return (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: `130px repeat(${MITRE_TACTICS.length}, 1fr)`, gap: 2, marginBottom: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 0" }}>
                {isCrit && <div style={{ width: 5, height: 5, borderRadius: "50%", background: pulse ? c : `${c}33`, transition: "background 0.4s", flexShrink: 0 }} />}
                <div style={{ color: isCrit ? c : "#9ca3af", fontSize: 9, fontWeight: isCrit ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.name}
                </div>
              </div>
              {coverage.map((v, i) => (
                <div key={i} style={{
                  background: v ? `${TACTIC_COLORS[i]}20` : "#070c14",
                  border: `1px solid ${v ? `${TACTIC_COLORS[i]}40` : "#0d1626"}`,
                  borderRadius: 2, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {v ? <div style={{ width: 5, height: 5, borderRadius: "50%", background: TACTIC_COLORS[i] }} /> : null}
                </div>
              ))}
            </div>
          );
        })}
        {/* Coverage totals */}
        <div style={{ display: "grid", gridTemplateColumns: `130px repeat(${MITRE_TACTICS.length}, 1fr)`, gap: 2, marginTop: 5, paddingTop: 5, borderTop: "1px solid #1f2d45" }}>
          <div style={{ color: "#2d3f55", fontSize: 9, padding: "3px 0", letterSpacing: 1 }}>TOTAL</div>
          {MITRE_TACTICS.map((t, i) => {
            const n = actors.filter(a => (MITRE_MATRIX[a.name] || [])[i]).length;
            return (
              <div key={t} style={{ background: `${TACTIC_COLORS[i]}18`, borderRadius: 2, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: TACTIC_COLORS[i], fontSize: 9, fontWeight: 700 }}>{n}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ color: "#2d3f55", fontSize: 9, marginTop: 8 }}>● TTP observed · CRITICAL actors pulse live · totals = actors covering that tactic</div>
    </div>
  );
}

function OriginChart() {
  const origins = {};
  actors.forEach(a => { origins[a.origin] = (origins[a.origin] || 0) + 1; });
  const entries = Object.entries(origins).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(e => e[1]), 1);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
      {entries.map(([origin, count]) => (
        <div key={origin} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0a1220", borderRadius: 5, padding: "7px 10px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#9ca3af", fontSize: 10, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{origin}</div>
            <div style={{ background: "#1f2d45", borderRadius: 2, height: 4 }}>
              <div style={{ width: `${(count / max) * 100}%`, background: "#4db8ff", height: 4, borderRadius: 2 }} />
            </div>
          </div>
          <span style={{ color: "#4db8ff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

function ActorRow({ a, selActor, onSelect, pulse }) {
  const [hovered, setHovered] = useState(false);
  const c = riskColor(a.threat);
  const isSel = selActor?.id === a.id;
  const isCrit = a.threat === "CRITICAL" && a.active;
  return (
    <div
      onClick={() => onSelect(a)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isSel ? "#141e30" : hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 7, padding: "11px 12px", marginBottom: 6, cursor: "pointer",
        border: `1px solid ${isSel ? c + "44" : "transparent"}`,
        borderLeft: `3px solid ${c}`,
        boxShadow: isCrit && pulse ? `0 0 10px ${c}18` : "none",
        transition: "background 0.15s, box-shadow 0.4s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ color: "#3a4a5c", fontSize: 10, fontFamily: "monospace" }}>{a.id}</span>
            {a.active ? <BADGE text="ACTIVE" color="#ff4d4d" /> : <BADGE text="DORMANT" color="#4a5568" />}
            <span style={{ color: "#2d3f55", fontSize: 9 }}>last: {a.lastSeen}</span>
          </div>
          <div style={{ fontWeight: 800, color: isSel ? "#ffffff" : "#e2e8f0", fontSize: 13, marginBottom: 3 }}>{a.name}</div>
          <div style={{ color: "#4a5568", fontSize: 11, marginBottom: 5 }}>
            🌍 <span style={{ color: "#ffd700", fontWeight: 600 }}>{a.origin}</span>
            <span style={{ margin: "0 6px", color: "#1f2d45" }}>·</span>
            🎯 {a.target}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {a.ttps.map((t, i) => <BADGE key={i} text={t} color="#4db8ff" />)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, marginLeft: 12, flexShrink: 0 }}>
          <BADGE text={a.threat} color={c} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#3a4a5c", fontSize: 8, letterSpacing: 1 }}>CAMP.</div>
              <div style={{ color: "#ffd700", fontSize: 12, fontWeight: 700 }}>{a.campaigns}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#3a4a5c", fontSize: 8, letterSpacing: 1 }}>C2</div>
              <div style={{ color: "#4db8ff", fontSize: 12, fontWeight: 700 }}>{a.c2nodes}</div>
            </div>
          </div>
          <MiniBar data={a.activity} color={c} />
        </div>
      </div>
    </div>
  );
}

function ActorDetail({ actor, apiKey, aiLoading, aiResult, aiError, onAnalyze, onClose }) {
  const c = riskColor(actor.threat);
  const max = Math.max(...actor.activity, 1);
  const total = actor.activity.reduce((s, v) => s + v, 0);
  const recent = actor.activity.slice(4).reduce((s, v) => s + v, 0);
  const older = actor.activity.slice(0, 3).reduce((s, v) => s + v, 0);
  const trend = recent > older * 1.2 ? "↑ Escalating" : recent < older * 0.7 ? "↓ Declining" : "→ Stable";
  const trendColor = trend.startsWith("↑") ? "#ff4d4d" : trend.startsWith("↓") ? "#00ff9d" : "#ffd700";
  const actorIocs = iocs.filter(ioc => ioc.actor === actor.name);
  const actorCamps = CAMPAIGNS.filter(camp => camp.actors.includes(actor.name));
  return (
    <Card style={{ borderLeft: `3px solid ${c}`, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>{actor.id} · ACTOR PROFILE</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#e2e8f0", marginBottom: 5 }}>{actor.name}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: "#ffd700", fontSize: 12 }}>🌍 {actor.origin}</span>
            <span style={{ color: "#9ca3af", fontSize: 12 }}>🎯 {actor.target}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
          <BADGE text={actor.threat} color={c} />
          {actor.active ? <BADGE text="ACTIVE" color="#ff4d4d" /> : <BADGE text="DORMANT" color="#4a5568" />}
          <button onClick={onClose} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#4a5568", fontSize: 10, padding: "2px 8px", cursor: "pointer" }}>✕ Close</button>
        </div>
      </div>

      {/* 7-day bar */}
      <div style={{ background: "#0a1220", borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>7-DAY ACTIVITY</span>
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ color: trendColor, fontSize: 11, fontWeight: 700 }}>{trend}</span>
            <span style={{ color: "#9ca3af", fontSize: 11 }}>{total} events</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 72 }}>
          {actor.activity.map((v, i) => {
            const h = Math.max(8, (v / max) * 60);
            const isToday = i === actor.activity.length - 1;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ color: isToday ? c : "#9ca3af", fontSize: 9, fontWeight: isToday ? 700 : 400 }}>{v}</div>
                <div style={{ width: "100%", borderRadius: "3px 3px 0 0", background: isToday ? c : `${c}55`, height: h, boxShadow: isToday ? `0 0 8px ${c}44` : "none" }} />
                <div style={{ color: isToday ? c : "#4a5568", fontSize: 9, fontWeight: isToday ? 700 : 400 }}>{DAYS[i]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TTPs */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>TTPs OBSERVED</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {actor.ttps.map((t, i) => <BADGE key={i} text={t} color="#4db8ff" />)}
        </div>
      </div>

      {/* Linked campaigns */}
      {actorCamps.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>LINKED CAMPAIGNS ({actorCamps.length})</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {actorCamps.map((camp, i) => (
              <div key={i} style={{ background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 5, padding: "4px 9px", display: "flex", gap: 7, alignItems: "center" }}>
                <span style={{ color: "#b47fff", fontSize: 9, fontFamily: "monospace" }}>{camp.id}</span>
                <span style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 600 }}>{camp.name}</span>
                <BADGE text={camp.status} color={camp.status === "ACTIVE" ? "#ff4d4d" : "#4a5568"} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related IOCs */}
      {actorIocs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>RELATED IOCs ({actorIocs.length})</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {actorIocs.map((ioc, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#0d1626", borderRadius: 4, padding: "3px 7px" }}>
                <span style={{ color: "#ff9d00", fontSize: 9 }}>{ioc.type}</span>
                <span style={{ fontFamily: "monospace", color: "#ff4d4d", fontSize: 10 }}>{ioc.value}</span>
                <CopyBtn text={ioc.value} size="xs" />
              </div>
            ))}
          </div>
        </div>
      )}

      {apiKey && (
        <Btn onClick={() => onAnalyze(actor)} disabled={aiLoading} color="#4db8ff">
          {aiLoading ? "⏳ Analyzing..." : "🧠 AI Threat Profile"}
        </Btn>
      )}
      {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
      {aiResult && (
        <div style={{ background: "#0d1626", borderRadius: 6, padding: 14, marginTop: 12, borderLeft: "3px solid #00ff9d" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <LiveBadge />
            <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI ACTOR ASSESSMENT</span>
          </div>
          <div style={{ color: "#c9d1da", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aiResult}</div>
        </div>
      )}
    </Card>
  );
}

function CampaignCard({ camp, onActorSelect }) {
  const [hovered, setHovered] = useState(false);
  const isActive = camp.status === "ACTIVE";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0f1a2e" : "#0d1626",
        border: `1px solid ${isActive ? "#ff4d4d33" : "#1f2d45"}`,
        borderLeft: `3px solid ${isActive ? "#ff4d4d" : "#4a5568"}`,
        borderRadius: 8, padding: "12px 14px", marginBottom: 8, transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ color: "#b47fff", fontSize: 10, fontFamily: "monospace" }}>{camp.id}</span>
            <BADGE text={camp.status} color={isActive ? "#ff4d4d" : "#4a5568"} />
            <span style={{ color: "#2d3f55", fontSize: 10 }}>since {camp.start}</span>
          </div>
          <div style={{ fontWeight: 800, color: "#e2e8f0", fontSize: 14 }}>{camp.name}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ color: "#4a5568", fontSize: 9, marginBottom: 2 }}>CONFIDENCE</div>
          <div style={{ color: "#ffd700", fontWeight: 700, fontSize: 14 }}>{camp.confidence}%</div>
        </div>
      </div>
      <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>{camp.desc}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ color: "#4a5568", fontSize: 10 }}>Phase: <span style={{ color: "#ff9d00", fontWeight: 600 }}>{camp.phase}</span></span>
        <span style={{ color: "#4a5568", fontSize: 10 }}>Sector: <span style={{ color: "#4db8ff" }}>{camp.sector}</span></span>
        <span style={{ color: "#4a5568", fontSize: 10 }}>IOCs: <span style={{ color: "#ff4d4d", fontWeight: 700 }}>{camp.iocCount}</span></span>
        <span style={{ color: "#4a5568", fontSize: 10 }}>Countries: <span style={{ color: "#ffd700" }}>{camp.countries}</span></span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: "#4a5568", fontSize: 10 }}>Actors:</span>
        {camp.actors.map((name, i) => {
          const a = actors.find(a => a.name === name);
          const c = a ? riskColor(a.threat) : "#6b7a8d";
          return (
            <span key={i} onClick={a ? () => onActorSelect(a) : undefined}
              style={{ color: c, fontSize: 11, fontWeight: 700, cursor: a ? "pointer" : "default", textDecoration: a ? "underline dotted" : "none" }}>
              {name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function Cti() {
  const [apiKey] = useApiKey();
  const [tab, setTab] = useState("actors");
  const { stamp } = useLastAnalysis("cti");
  const [filter, setFilter] = useState("ALL");
  const [selActor, setSelActor] = useState(null);
  const [iocSearch, setIocSearch] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [briefResult, setBriefResult] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState("");
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setPulse(x => !x), 900);
    return () => clearInterval(t);
  }, []);

  const FILTERS = ["ALL", "CRITICAL", "HIGH", "MEDIUM"];
  const filtered = filter === "ALL" ? actors : actors.filter(a => a.threat === filter);
  const filteredIocs = iocSearch
    ? iocs.filter(i => i.value.includes(iocSearch) || i.actor.toLowerCase().includes(iocSearch.toLowerCase()) || i.type.toLowerCase().includes(iocSearch.toLowerCase()))
    : iocs;

  function selectActor(a) {
    if (selActor?.id === a.id) { setSelActor(null); setAiResult(null); setAiError(""); }
    else { setSelActor(a); setAiResult(null); setAiError(""); setTab("actors"); }
  }

  async function analyzeActor(a) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey,
        `You are a senior CTI analyst. Provide a threat actor profile assessment in 3-4 sentences for: ${a.name} (ID: ${a.id}, Origin: ${a.origin}, Target sectors: ${a.target}, TTPs: ${a.ttps.join(", ")}, Threat level: ${a.threat}). Cover: current operational posture, likely objectives, key TTPs to watch, and defensive recommendations.`
      );
      setAiResult(text);
      try { localStorage.setItem("sentinel_prefill_cti", `Actor: ${a.name} (${a.origin}) — ${text.slice(0, 240)}`); } catch {}
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  async function generateBrief() {
    setBriefResult(null); setBriefError(""); setBriefLoading(true);
    try {
      const actorSummary = actors.map(a => `${a.name} (${a.origin}): ${a.threat}, TTPs: ${a.ttps.join(", ")}, Active: ${a.active}`).join("\n");
      const campSummary = CAMPAIGNS.filter(c => c.status === "ACTIVE").map(c => `${c.name} [${c.id}]: ${c.desc} — Phase: ${c.phase}, Conf: ${c.confidence}%`).join("\n");
      const text = await callClaude(apiKey,
        `You are a senior CTI analyst writing a classified intelligence briefing. Based on the following threat actor intelligence and active campaigns, provide a strategic cyber threat landscape assessment of 4-5 paragraphs covering: dominant threat actors and their current posture, most dangerous active campaigns, sector targeting trends, emerging TTPs to watch, and top 3 defensive priorities.\n\nACTORS:\n${actorSummary}\n\nACTIVE CAMPAIGNS:\n${campSummary}`,
        1400
      );
      setBriefResult(text);
      stamp();
    } catch (e) { setBriefError("Error: " + e.message); }
    setBriefLoading(false);
  }

  return (
    <div>
      <PageHeader
        icon="🔐"
        title="Cyber Threat Intelligence"
        sub="Unified threat actor profiling, campaign tracking, MITRE ATT&CK mapping, and IOC feed."
        accent="#4db8ff"
        dataMode={apiKey ? "hybrid" : "mock"}
        classification="TS/SCI"
        badges={[
          { text: `${actors.length} Actors`, color: "#4db8ff" },
          { text: `${CAMPAIGNS.filter(c => c.status === "ACTIVE").length} Active Campaigns`, color: "#ff4d4d" },
          { text: `${iocs.length} IOCs`, color: "#ff9d00" },
        ]}
      />

      <StatBar stats={[
        { label: "Tracked Actors",   value: String(actors.length),                                       color: "#4db8ff" },
        { label: "Active",           value: String(actors.filter(a => a.active).length),                 color: "#ff4d4d" },
        { label: "Campaigns",        value: String(CAMPAIGNS.filter(c => c.status === "ACTIVE").length), color: "#b47fff" },
        { label: "IOCs 72h",         value: String(iocs.length),                                         color: "#ff9d00" },
        { label: "CRITICAL Actors",  value: String(actors.filter(a => a.threat === "CRITICAL").length),  color: "#ff0000" },
        { label: "C2 Nodes",         value: String(actors.reduce((s, a) => s + a.c2nodes, 0)),           color: "#4db8ff" },
      ]} />

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #1f2d45", marginBottom: 14, overflowX: "auto" }}>
        {[
          { id: "actors",    label: "👤 Actors",       color: "#4db8ff"  },
          { id: "campaigns", label: "🎯 Campaigns",    color: "#b47fff"  },
          { id: "ioc",       label: "🔎 IOC Feed",     color: "#ff9d00"  },
          { id: "matrix",    label: "🗺️ MITRE Matrix", color: "#ff4d4d"  },
        ].map(({ id, label, color }) => (
          <button key={id} onClick={() => setTab(id)} style={tabStyle(tab === id, color)}>{label}</button>
        ))}
        {apiKey && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: 4 }}>
            <Btn onClick={generateBrief} disabled={briefLoading} color="#4db8ff">
              {briefLoading ? "⏳ Generating..." : "🧠 Global Brief"}
            </Btn>
            <LastAnalysisTag toolId="cti" />
          </div>
        )}
      </div>

      {/* AI Global Brief */}
      {(briefResult || briefError) && (
        <Card style={{ borderLeft: "3px solid #4db8ff", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <LiveBadge />
            <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI GLOBAL CTI BRIEF · TS/SCI</span>
            <ExportBtn data={{ brief: briefResult }} filename="sentinel-cti-brief" />
          </div>
          {briefError && <div style={{ color: "#ff4d4d", fontSize: 12 }}>{briefError}</div>}
          {briefResult && <div style={{ color: "#c9d1da", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{briefResult}</div>}
        </Card>
      )}

      {/* ACTORS TAB */}
      {tab === "actors" && (
        <div>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <ST icon="👤" label="Threat Actor Registry" color="#4db8ff" />
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {FILTERS.map(f => {
                  const fc = f === "CRITICAL" ? "#ff4d4d" : f === "HIGH" ? "#ff9d00" : f === "MEDIUM" ? "#ffd700" : "#4db8ff";
                  const active = filter === f;
                  return (
                    <button key={f} onClick={() => { setFilter(f); setSelActor(null); setAiResult(null); }}
                      style={{ background: active ? `${fc}22` : "transparent", color: active ? fc : "#4a5568", border: `1px solid ${active ? `${fc}55` : "#1f2d45"}`, borderRadius: 4, padding: "3px 9px", cursor: "pointer", fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: 0.5 }}>
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
            {filtered.map(a => <ActorRow key={a.id} a={a} selActor={selActor} onSelect={selectActor} pulse={pulse} />)}
          </Card>
          {selActor && (
            <ActorDetail actor={selActor} apiKey={apiKey} aiLoading={aiLoading} aiResult={aiResult} aiError={aiError}
              onAnalyze={analyzeActor} onClose={() => { setSelActor(null); setAiResult(null); setAiError(""); }} />
          )}
          <Card>
            <ST icon="🌍" label="Threat Origin Distribution" color="#ffd700" sub="Active actors by geographic attribution" style={{ marginBottom: 12 }} />
            <OriginChart />
          </Card>
        </div>
      )}

      {/* CAMPAIGNS TAB */}
      {tab === "campaigns" && (
        <Card>
          <ST icon="🎯" label="Campaign Tracker" color="#b47fff"
            sub={`${CAMPAIGNS.filter(c => c.status === "ACTIVE").length} active · ${CAMPAIGNS.filter(c => c.status === "RESOLVED").length} resolved`}
            style={{ marginBottom: 14 }} />
          {CAMPAIGNS.map((camp, i) => (
            <CampaignCard key={i} camp={camp} onActorSelect={a => { selectActor(a); setTab("actors"); }} />
          ))}
        </Card>
      )}

      {/* IOC FEED TAB */}
      {tab === "ioc" && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
            <ST icon="🔎" label="IOC Feed" color="#ff9d00" sub="Indicators of Compromise — last 72h" />
            <input
              value={iocSearch}
              onChange={e => setIocSearch(e.target.value)}
              placeholder="Search IOC, actor, type..."
              style={{ background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 6, padding: "5px 10px", color: "#e2e8f0", fontSize: 11, outline: "none", width: 200 }}
            />
          </div>
          <IocDonut iocList={iocs} />
          <div style={{ marginTop: 16, overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2d45" }}>
                  {["Type", "Indicator", "Actor", "Campaign", "Date"].map(h => (
                    <th key={h} style={{ textAlign: "left", color: "#4a5568", padding: "5px 10px", fontSize: 10, letterSpacing: 2, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredIocs.map((r, i) => (
                  <tr key={i}
                    onMouseEnter={e => e.currentTarget.style.background = "#141e30"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    style={{ borderBottom: "1px solid #0d1626", transition: "background 0.15s" }}>
                    <td style={{ padding: "7px 10px" }}><BADGE text={r.type} color="#4db8ff" /></td>
                    <td style={{ padding: "7px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "monospace", color: "#ff4d4d", fontSize: 11 }}>{r.value}</span>
                        <CopyBtn text={r.value} size="xs" />
                      </div>
                    </td>
                    <td style={{ padding: "7px 10px", color: "#ffd700", fontSize: 12 }}>{r.actor}</td>
                    <td style={{ padding: "7px 10px" }}>
                      {r.campaign
                        ? <span style={{ color: "#b47fff", fontSize: 10, fontFamily: "monospace" }}>{r.campaign}</span>
                        : <span style={{ color: "#2d3f55", fontSize: 10 }}>—</span>}
                    </td>
                    <td style={{ padding: "7px 10px", color: "#3a4a5c", fontSize: 11 }}>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MITRE MATRIX TAB */}
      {tab === "matrix" && (
        <Card>
          <ST icon="🗺️" label="MITRE ATT&CK Coverage Matrix" color="#ff4d4d" sub="All 10 tracked actors × 11 Enterprise tactics" style={{ marginBottom: 14 }} />
          <MitreMatrix pulse={pulse} />
        </Card>
      )}
    </div>
  );
}
