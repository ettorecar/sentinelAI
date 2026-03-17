import { useState } from "react";
import { BADGE, Card, ST, PageHeader, StatBar, Btn, LiveBadge, riskColor } from "../components/shared";
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
  { id: "APT-2241", name: "IRON CARDINAL", origin: "East Asia",      target: "Defence, Aerospace",  ttps: ["Spearphishing","LOLBins","Custom RAT"],    active: true,  threat: "CRITICAL", activity: [4,7,3,8,12,9,15] },
  { id: "APT-1887", name: "EMBER WOLF",    origin: "Eastern Europe", target: "Energy, Government",  ttps: ["Supply chain","ICS exploit","Wiper"],       active: true,  threat: "HIGH",     activity: [8,6,10,7,9,11,8] },
  { id: "APT-0934", name: "SILENT MANTIS", origin: "Middle East",    target: "Financial, Telco",    ttps: ["Zero-days","DNS hijack","Cred theft"],      active: false, threat: "MEDIUM",   activity: [2,3,2,1,3,2,2]   },
  { id: "APT-3312", name: "PALE THUNDER",  origin: "Unknown",        target: "Maritime, Ports",     ttps: ["AIS spoofing","GNSS jam","Port intrusion"], active: true,  threat: "HIGH",     activity: [5,3,6,8,5,9,11]  },
];

const iocs = [
  { type: "IP",     value: "185.220.xxx.xxx",         actor: "EMBER WOLF",    date: "14/03" },
  { type: "Domain", value: "update-cdn-secure[.]net", actor: "IRON CARDINAL", date: "13/03" },
  { type: "Hash",   value: "a1b2c3d4...",              actor: "PALE THUNDER",  date: "12/03" },
  { type: "IP",     value: "91.108.xxx.xxx",           actor: "EMBER WOLF",    date: "12/03" },
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

export default function Cti() {
  const [apiKey] = useApiKey();
  const [filter, setFilter] = useState("ALL");
  const [selActor, setSelActor] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const filtered = filter === "ALL" ? actors : actors.filter(a => a.threat === filter);

  async function analyzeActor(a) {
    setSelActor(a); setAiResult(null); setAiError(""); setAiLoading(true);
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
        mock
        classification="TS/SCI"
        badges={[{ text: "38 Actors", color: "#4db8ff" }, { text: "47 IOCs 24h", color: "#ff9d00" }]}
      />

      <StatBar stats={[
        { label: "Tracked Actors", value: "38",  color: "#4db8ff" },
        { label: "Campaigns",      value: "12",  color: "#b47fff" },
        { label: "IOCs 24h",       value: "47",  color: "#ff9d00" },
        { label: "Critical",       value: "3",   color: "#ff4d4d" },
      ]} />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <ST icon="👤" label="Threat Actors" color="#4db8ff" />
          <div style={{ display: "flex", gap: 4 }}>
            {FILTERS.map(f => {
              const active = filter === f;
              const fc = f === "CRITICAL" ? "#ff4d4d" : f === "HIGH" ? "#ff9d00" : f === "MEDIUM" ? "#ffd700" : "#4db8ff";
              return (
                <FilterBtn key={f} label={f} active={active} color={fc} onClick={() => setFilter(f)} />
              );
            })}
          </div>
        </div>
        <div>
          {filtered.map(a => <ActorRow key={a.id} a={a} apiKey={apiKey} aiLoading={aiLoading} selActor={selActor} onAnalyze={analyzeActor} />)}
        </div>
      </Card>

      {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginBottom: 10, padding: "8px 12px", background: "#1a0a0a", borderRadius: 6, border: "1px solid #ff4d4d33" }}>{aiError}</div>}

      {aiResult && selActor && (
        <Card style={{ borderLeft: "3px solid #00ff9d" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <LiveBadge />
            <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI ACTOR ASSESSMENT</span>
            <span style={{ color: "#4db8ff", fontSize: 11, fontWeight: 700, marginLeft: 4 }}>{selActor.name}</span>
          </div>
          <div style={{ color: "#c9d1da", fontSize: 13, lineHeight: 1.7 }}>{aiResult}</div>
        </Card>
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

function ActorRow({ a, apiKey, aiLoading, selActor, onAnalyze }) {
  const [hovered, setHovered] = useState(false);
  const c = riskColor(a.threat);
  const threatColor = a.threat === "CRITICAL" ? "#ff4d4d" : a.threat === "HIGH" ? "#ff9d00" : "#ffd700";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#141e30" : "#0d1626",
        borderRadius: 7, padding: "11px 12px", marginBottom: 6,
        borderLeft: `3px solid ${c}`,
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ color: "#3a4a5c", fontSize: 10, fontFamily: "monospace" }}>{a.id}</span>
            {a.active && <BADGE text="ACTIVE" color="#ff4d4d" />}
          </div>
          <div style={{ fontWeight: 800, color: "#e2e8f0", fontSize: 13, marginBottom: 3 }}>{a.name}</div>
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
          {apiKey && (
            <Btn
              onClick={() => onAnalyze(a)}
              disabled={aiLoading && selActor?.id === a.id}
              color="#4db8ff"
              size="sm"
            >
              {aiLoading && selActor?.id === a.id ? "Analyzing..." : "AI Profile"}
            </Btn>
          )}
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
      <td style={{ padding: "7px 10px", fontFamily: "monospace", color: "#ff4d4d", fontSize: 11 }}>{r.value}</td>
      <td style={{ padding: "7px 10px", color: "#ffd700", fontSize: 12 }}>{r.actor}</td>
      <td style={{ padding: "7px 10px", color: "#3a4a5c", fontSize: 11 }}>{r.date}</td>
    </tr>
  );
}
