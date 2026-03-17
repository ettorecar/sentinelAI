import { useState } from "react";
import { BADGE, Card, ST, MockBadge, Btn, LiveBadge, riskColor, riskBadgeColor } from "../components/shared";
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
  { id: "APT-2241", name: "IRON CARDINAL", origin: "East Asia",      target: "Defence, Aerospace",  ttps: ["Spearphishing","LOLBins","Custom RAT"],       active: true,  threat: "CRITICAL", activity: [4,7,3,8,12,9,15]  },
  { id: "APT-1887", name: "EMBER WOLF",    origin: "Eastern Europe", target: "Energy, Government",  ttps: ["Supply chain","ICS exploit","Wiper"],          active: true,  threat: "HIGH",     activity: [8,6,10,7,9,11,8]  },
  { id: "APT-0934", name: "SILENT MANTIS", origin: "Middle East",    target: "Financial, Telco",    ttps: ["Zero-days","DNS hijack","Cred theft"],         active: false, threat: "MEDIUM",   activity: [2,3,2,1,3,2,2]    },
  { id: "APT-3312", name: "PALE THUNDER",  origin: "Unknown",        target: "Maritime, Ports",     ttps: ["AIS spoofing","GNSS jam","Port intrusion"],    active: true,  threat: "HIGH",     activity: [5,3,6,8,5,9,11]   },
];

const iocs = [
  { type: "IP",     value: "185.220.xxx.xxx",          actor: "EMBER WOLF",    date: "14/03" },
  { type: "Domain", value: "update-cdn-secure[.]net",  actor: "IRON CARDINAL", date: "13/03" },
  { type: "Hash",   value: "a1b2c3d4...",               actor: "PALE THUNDER",  date: "12/03" },
  { type: "IP",     value: "91.108.xxx.xxx",            actor: "EMBER WOLF",    date: "12/03" },
];

function MiniBar({ data, color }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 26 }}>
      {data.map((v, i) => (
        <div key={i} style={{ width: 7, background: color, borderRadius: 2, height: `${(v / max) * 100}%`, opacity: i === data.length - 1 ? 1 : 0.4 }} />
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
      const text = await callClaude(apiKey, `You are a senior CTI analyst. Provide a threat actor profile assessment in 3-4 sentences for: ${a.name} (ID: ${a.id}, Origin: ${a.origin}, Target sectors: ${a.target}, TTPs: ${a.ttps.join(", ")}, Threat level: ${a.threat}). Cover: current operational posture, likely objectives, key TTPs to watch, and defensive recommendations.`);
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>🔐 Cyber Threat Intelligence</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>Threat actor profiling and IOC feed. <MockBadge /></p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
        {[["Actors", "38"], ["Campaigns", "12"], ["IOCs 24h", "47"], ["Critical", "3"]].map(([l, v]) => (
          <Card key={l} style={{ textAlign: "center", padding: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#00ff9d" }}>{v}</div>
            <div style={{ color: "#9ca3af", fontSize: 11 }}>{l}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <ST icon="👤" label="Threat Actors" color="#4db8ff" />
          <div style={{ display: "flex", gap: 5 }}>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map(c => (
              <button key={c} onClick={() => setFilter(c)}
                style={{ background: filter === c ? "#00ff9d" : "#1f2d45", color: filter === c ? "#0a0f1e" : "#9ca3af", border: "none", borderRadius: 4, padding: "3px 9px", cursor: "pointer", fontSize: 11, fontWeight: filter === c ? 700 : 400 }}>{c}</button>
            ))}
          </div>
        </div>
        {filtered.map(a => {
          const c = riskColor(a.threat);
          return (
            <div key={a.id} style={{ background: "#0d1626", borderRadius: 7, padding: "10px 12px", marginBottom: 7, borderLeft: `3px solid ${c}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: "#9ca3af", fontSize: 10, fontFamily: "monospace" }}>{a.id}</span>
                  {a.active && <span style={{ marginLeft: 6, background: "#ff4d4d", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 3, padding: "1px 4px" }}>ACTIVE</span>}
                  <div style={{ fontWeight: 800, color: "#e2e8f0", fontSize: 13 }}>{a.name}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>Origin: <span style={{ color: "#ffd700" }}>{a.origin}</span> · {a.target}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {a.ttps.map((t, i) => <BADGE key={i} text={t} color="blue" />)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 8 }}>
                  <BADGE text={a.threat} color={riskBadgeColor(a.threat)} />
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 9, textAlign: "right", marginBottom: 1 }}>7d</div>
                    <MiniBar data={a.activity} color={c} />
                  </div>
                  {apiKey && (
                    <Btn onClick={() => analyzeActor(a)} disabled={aiLoading && selActor?.id === a.id} color="#1f2d45" style={{ fontSize: 10, padding: "3px 8px" }}>
                      {aiLoading && selActor?.id === a.id ? "⏳" : "🤖 AI Profile"}
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginBottom: 10 }}>{aiError}</div>}
      {aiResult && selActor && (
        <Card style={{ borderColor: "#00ff9d" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <LiveBadge />
            <span style={{ color: "#9ca3af", fontSize: 11 }}>AI ACTOR ASSESSMENT — {selActor.name}</span>
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7 }}>{aiResult}</div>
        </Card>
      )}

      <Card>
        <ST icon="🔎" label="IOC Feed" color="#ff9d00" />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>{["Type", "Indicator", "Actor", "Date"].map(h => <th key={h} style={{ textAlign: "left", color: "#9ca3af", padding: "5px 8px", borderBottom: "1px solid #1f2d45" }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {iocs.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #0d1626" }}>
                <td style={{ padding: "6px 8px" }}><BADGE text={r.type} color="blue" /></td>
                <td style={{ padding: "6px 8px", fontFamily: "monospace", color: "#ff4d4d", fontSize: 11 }}>{r.value}</td>
                <td style={{ padding: "6px 8px", color: "#ffd700" }}>{r.actor}</td>
                <td style={{ padding: "6px 8px", color: "#9ca3af" }}>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
