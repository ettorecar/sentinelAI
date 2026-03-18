import { useState } from "react";
import { BADGE, Card, ST, PageHeader, StatBar, Btn, LiveBadge, riskColor, CopyBtn } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

const actors = [
  { id: "APT-2241", name: "IRON CARDINAL",  origin: "East Asia",      target: "Defence, Aerospace",         ttps: ["Spearphishing","LOLBins","Custom RAT"],       active: true,  threat: "CRITICAL", activity: [4,7,3,8,12,9,15] },
  { id: "APT-1887", name: "EMBER WOLF",     origin: "Eastern Europe", target: "Energy, Government",         ttps: ["Supply chain","ICS exploit","Wiper"],         active: true,  threat: "HIGH",     activity: [8,6,10,7,9,11,8] },
  { id: "APT-0934", name: "SILENT MANTIS",  origin: "Middle East",    target: "Financial, Telco",           ttps: ["Zero-days","DNS hijack","Cred theft"],        active: false, threat: "MEDIUM",   activity: [2,3,2,1,3,2,2]   },
  { id: "APT-3312", name: "PALE THUNDER",   origin: "Unknown",        target: "Maritime, Ports",            ttps: ["AIS spoofing","GNSS jam","Port intrusion"],   active: true,  threat: "HIGH",     activity: [5,3,6,8,5,9,11]  },
  { id: "APT-5566", name: "VENOM SPIDER",   origin: "North Korea",    target: "Crypto exchanges, Banks",    ttps: ["SWIFT fraud","Crypto theft","Phishing kit"],  active: true,  threat: "HIGH",     activity: [6,4,7,5,8,6,10]  },
  { id: "APT-7781", name: "CRIMSON TIDE",   origin: "Russia",         target: "SIGINT, Military comms",     ttps: ["MITM","SATCOM intercept","Firmware implant"], active: true,  threat: "CRITICAL", activity: [3,5,4,6,8,7,12]  },
  { id: "APT-2290", name: "JADE SERPENT",   origin: "China",          target: "Semiconductor, IP theft",    ttps: ["Watering hole","VPN exploit","Insider threat"],active: true,  threat: "HIGH",     activity: [7,9,8,10,6,11,9] },
  { id: "APT-4401", name: "GHOST JACKAL",   origin: "Iran",           target: "OT/SCADA, Energy sector",   ttps: ["PLC exploit","Air-gap jump","USB drop"],      active: false, threat: "HIGH",     activity: [1,2,0,1,2,1,3]   },
  { id: "APT-6623", name: "COBALT LYNX",    origin: "Belarus",        target: "NGOs, Dissident groups",    ttps: ["Spyware","Signal exploit","Social eng"],      active: true,  threat: "MEDIUM",   activity: [3,2,4,3,2,3,5]   },
  { id: "APT-8834", name: "PHANTOM CRANE",  origin: "Unknown",        target: "Critical infrastructure",   ttps: ["0-day exploit","Ransomware","Data exfil"],   active: true,  threat: "CRITICAL", activity: [0,0,0,0,2,8,15]  },
];

const iocs = [
  { type: "IP",     value: "185.220.xxx.xxx",            actor: "EMBER WOLF",    date: "14/03" },
  { type: "Domain", value: "update-cdn-secure[.]net",    actor: "IRON CARDINAL", date: "13/03" },
  { type: "Hash",   value: "a1b2c3d4e5f6...",            actor: "PALE THUNDER",  date: "12/03" },
  { type: "IP",     value: "91.108.xxx.xxx",             actor: "EMBER WOLF",    date: "12/03" },
  { type: "Hash",   value: "b3e7f2a19c4d...",            actor: "CRIMSON TIDE",  date: "14/03" },
  { type: "Domain", value: "cdn-delivery-net[.]ru",      actor: "VENOM SPIDER",  date: "14/03" },
  { type: "IP",     value: "45.142.xxx.xxx",             actor: "JADE SERPENT",  date: "13/03" },
  { type: "URL",    value: "hxxps://docs-share[.]io/p",  actor: "EMBER WOLF",    date: "13/03" },
  { type: "Hash",   value: "9f1d8e2b7a3c...",            actor: "IRON CARDINAL", date: "12/03" },
  { type: "Domain", value: "secure-update[.]biz",        actor: "PHANTOM CRANE", date: "12/03" },
  { type: "IP",     value: "194.165.xxx.xxx",            actor: "GHOST JACKAL",  date: "11/03" },
  { type: "Hash",   value: "c4a9b7d38e1f...",            actor: "COBALT LYNX",   date: "11/03" },
  { type: "Domain", value: "api-gateway-cloud[.]net",    actor: "IRON CARDINAL", date: "10/03" },
  { type: "IP",     value: "103.75.xxx.xxx",             actor: "JADE SERPENT",  date: "10/03" },
  { type: "Hash",   value: "7e2c5f9a4b8d...",            actor: "VENOM SPIDER",  date: "09/03" },
];

const FILTERS = ["ALL", "CRITICAL", "HIGH", "MEDIUM"];

function MiniBar({ data, color }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 28 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          width: 8, borderRadius: 2,
          background: i === data.length - 1 ? color : `${color}55`,
          height: `${Math.max(15, (v / max) * 100)}%`,
          transition: "height 0.3s",
        }} />
      ))}
    </div>
  );
}

const DAYS = ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Today"];

function ActorTimeline({ actor, apiKey, aiLoading, aiResult, aiError, onAnalyze, onClose }) {
  const c = actor.threat === "CRITICAL" ? "#ff4d4d" : actor.threat === "HIGH" ? "#ff9d00" : "#ffd700";
  const max = Math.max(...actor.activity, 1);
  const total = actor.activity.reduce((s, v) => s + v, 0);
  const recent = actor.activity.slice(4).reduce((s, v) => s + v, 0);
  const older  = actor.activity.slice(0, 3).reduce((s, v) => s + v, 0);
  const trend  = recent > older * 1.2 ? "↑ Escalating" : recent < older * 0.7 ? "↓ Declining" : "→ Stable";
  const trendColor = trend.startsWith("↑") ? "#ff4d4d" : trend.startsWith("↓") ? "#00ff9d" : "#ffd700";
  const actorIocs = iocs.filter(ioc => ioc.actor === actor.name);
  return (
    <Card style={{ borderLeft: `3px solid ${c}`, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>{actor.id} · ACTOR TIMELINE</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#e2e8f0", marginBottom: 6 }}>{actor.name}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: "#ffd700", fontSize: 12 }}>🌍 {actor.origin}</span>
            <span style={{ color: "#9ca3af", fontSize: 12 }}>🎯 {actor.target}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <BADGE text={actor.threat} color={c} />
          {actor.active ? <BADGE text="ACTIVE" color="#ff4d4d" /> : <BADGE text="DORMANT" color="#4a5568" />}
          <button onClick={onClose} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#4a5568", fontSize: 10, padding: "2px 8px", cursor: "pointer" }}>✕</button>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div style={{ background: "#0a1220", borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>7-DAY ACTIVITY</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
                <div style={{
                  width: "100%", borderRadius: "3px 3px 0 0",
                  background: isToday ? c : `${c}55`,
                  height: h, transition: "height 0.4s ease-out",
                  boxShadow: isToday ? `0 0 8px ${c}44` : "none",
                }} />
                <div style={{ color: isToday ? c : "#4a5568", fontSize: 9, fontWeight: isToday ? 700 : 400, whiteSpace: "nowrap" }}>{DAYS[i]}</div>
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

      {/* Actor IOCs */}
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

      {/* AI */}
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
          <div style={{ color: "#c9d1da", fontSize: 13, lineHeight: 1.7 }}>{aiResult}</div>
        </div>
      )}
    </Card>
  );
}

export default function Cti() {
  const [apiKey] = useApiKey();
  const [filter, setFilter] = useState("ALL");
  const [selActor, setSelActor] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const filtered = filter === "ALL" ? actors : actors.filter(a => a.threat === filter);

  function selectActor(a) {
    if (selActor?.id === a.id) { setSelActor(null); setAiResult(null); setAiError(""); }
    else { setSelActor(a); setAiResult(null); setAiError(""); }
  }

  async function analyzeActor(a) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey,
        `You are a senior CTI analyst. Provide a threat actor profile assessment in 3-4 sentences for: ${a.name} (ID: ${a.id}, Origin: ${a.origin}, Target sectors: ${a.target}, TTPs: ${a.ttps.join(", ")}, Threat level: ${a.threat}). Cover: current operational posture, likely objectives, key TTPs to watch, and defensive recommendations.`
      );
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  return (
    <div>
      <PageHeader
        icon="🔐"
        title="Cyber Threat Intelligence"
        sub="Threat actor profiling, TTP mapping, and IOC feed."
        accent="#4db8ff"
        dataMode={apiKey ? "hybrid" : "mock"}
        classification="TS/SCI"
        badges={[{ text: `${actors.length} Actors`, color: "#4db8ff" }, { text: `${iocs.length} IOCs 24h`, color: "#ff9d00" }]}
      />

      <StatBar stats={[
        { label: "Tracked Actors", value: String(actors.length),                                  color: "#4db8ff" },
        { label: "Campaigns",      value: "12",                                                   color: "#b47fff" },
        { label: "IOCs 24h",       value: String(iocs.length),                                    color: "#ff9d00" },
        { label: "Critical",       value: String(actors.filter(a => a.threat === "CRITICAL").length), color: "#ff4d4d" },
      ]} />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <ST icon="👤" label="Threat Actors" color="#4db8ff" />
          <div style={{ display: "flex", gap: 4 }}>
            {FILTERS.map(f => {
              const active = filter === f;
              const fc = f === "CRITICAL" ? "#ff4d4d" : f === "HIGH" ? "#ff9d00" : f === "MEDIUM" ? "#ffd700" : "#4db8ff";
              return (
                <FilterBtn key={f} label={f} active={active} color={fc} onClick={() => { setFilter(f); setSelActor(null); setAiResult(null); }} />
              );
            })}
          </div>
        </div>
        <div>
          {filtered.map(a => <ActorRow key={a.id} a={a} selActor={selActor} onSelect={selectActor} />)}
        </div>
      </Card>

      {selActor && (
        <ActorTimeline
          actor={selActor}
          apiKey={apiKey}
          aiLoading={aiLoading}
          aiResult={aiResult}
          aiError={aiError}
          onAnalyze={analyzeActor}
          onClose={() => { setSelActor(null); setAiResult(null); setAiError(""); }}
        />
      )}

      <Card>
        <ST icon="🔎" label="IOC Feed" color="#ff9d00" sub="Indicators of Compromise — last 72h" />
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 420, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1f2d45" }}>
              {["Type", "Indicator", "Actor", "Date"].map(h => (
                <th key={h} style={{ textAlign: "left", color: "#4a5568", padding: "5px 10px", fontSize: 10, letterSpacing: 2, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {iocs.map((r, i) => <IocRow key={i} r={r} />)}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}

function FilterBtn({ label, active, color, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? `${color}22` : hovered ? "#141e30" : "transparent",
        color: active ? color : hovered ? "#9ca3af" : "#4a5568",
        border: `1px solid ${active ? `${color}55` : "#1f2d45"}`,
        borderRadius: 4, padding: "3px 9px", cursor: "pointer",
        fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: 0.5,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function ActorRow({ a, selActor, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const c = riskColor(a.threat);
  const threatColor = a.threat === "CRITICAL" ? "#ff4d4d" : a.threat === "HIGH" ? "#ff9d00" : "#ffd700";
  const isSel = selActor?.id === a.id;
  return (
    <div
      onClick={() => onSelect(a)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isSel ? "#141e30" : hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 7, padding: "11px 12px", marginBottom: 6, cursor: "pointer",
        borderLeft: `3px solid ${c}`,
        border: `1px solid ${isSel ? c + "44" : "transparent"}`,
        borderLeftColor: c,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ color: "#3a4a5c", fontSize: 10, fontFamily: "monospace" }}>{a.id}</span>
            {a.active ? <BADGE text="ACTIVE" color="#ff4d4d" /> : <BADGE text="DORMANT" color="#4a5568" />}
          </div>
          <div style={{ fontWeight: 800, color: isSel ? "#ffffff" : "#e2e8f0", fontSize: 13, marginBottom: 3 }}>{a.name}</div>
          <div style={{ color: "#4a5568", fontSize: 11, marginBottom: 6 }}>
            Origin <span style={{ color: "#ffd700", fontWeight: 600 }}>{a.origin}</span>
            <span style={{ margin: "0 6px", color: "#1f2d45" }}>·</span>
            {a.target}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {a.ttps.map((t, i) => <BADGE key={i} text={t} color="#4db8ff" />)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginLeft: 12 }}>
          <BADGE text={a.threat} color={threatColor} />
          <div>
            <div style={{ color: "#3a4a5c", fontSize: 9, textAlign: "right", marginBottom: 2, letterSpacing: 1 }}>7d activity</div>
            <MiniBar data={a.activity} color={c} />
          </div>
          <span style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1 }}>click for timeline</span>
        </div>
      </div>
    </div>
  );
}

function IocRow({ r }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onMouseEnter={e => e.currentTarget.style.background = "#141e30"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      style={{ borderBottom: "1px solid #0d1626", cursor: "default", transition: "background 0.15s" }}
    >
      <td style={{ padding: "7px 10px" }}><BADGE text={r.type} color="#4db8ff" /></td>
      <td style={{ padding: "7px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "monospace", color: "#ff4d4d", fontSize: 11 }}>{r.value}</span>
          <CopyBtn text={r.value} size="xs" />
        </div>
      </td>
      <td style={{ padding: "7px 10px", color: "#ffd700", fontSize: 12 }}>{r.actor}</td>
      <td style={{ padding: "7px 10px", color: "#3a4a5c", fontSize: 11 }}>{r.date}</td>
    </tr>
  );
}
