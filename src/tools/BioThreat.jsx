import { useState } from "react";
import { BADGE, Card, ST, PageHeader, StatBar, Spark, Btn, LiveBadge } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

const ALERTS = [
  { id: "BT-2026-031", region: "Eastern Balkans", signal: "Unusual pneumonia cluster",       sources: 4,  confidence: 72, level: "HIGH",     date: "13/03", type: "Respiratory",  trend: [12,15,14,18,22,28,35] },
  { id: "BT-2026-028", region: "Central Asia",    signal: "Livestock mass mortality",        sources: 6,  confidence: 65, level: "MEDIUM",   date: "11/03", type: "Zoonotic",      trend: [8,8,10,9,12,11,14]   },
  { id: "BT-2026-019", region: "West Africa",     signal: "Haemorrhagic fever signals",     sources: 8,  confidence: 81, level: "HIGH",     date: "07/03", type: "Haemorrhagic",  trend: [30,35,40,38,45,50,48] },
  { id: "BT-2026-003", region: "Horn of Africa",  signal: "Cholera, elevated fatality rate", sources: 11, confidence: 93, level: "CRITICAL", date: "21/02", type: "Enteric",       trend: [60,70,80,75,90,95,100] },
];

const lc = level => level === "CRITICAL" ? "#ff0000" : level === "HIGH" ? "#ff4d4d" : level === "MEDIUM" ? "#ffd700" : "#00ff9d";
const lb = level => level === "CRITICAL" || level === "HIGH" ? "red" : level === "MEDIUM" ? "yellow" : "green";

function ConfidenceBar({ value, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1 }}>CONFIDENCE</span>
        <span style={{ color, fontSize: 10, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ background: "#111827", borderRadius: 2, height: 4 }}>
        <div style={{ background: color, height: 4, borderRadius: 2, width: `${value}%`, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function AlertRow({ a, selected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const color = lc(a.level);
  const active = selected || hovered;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? "#141e30" : hovered ? "#0f1a2e" : "#0d1626",
        border: `1px solid ${selected ? color + "55" : hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${active ? color : color + "66"}`,
        borderRadius: 8,
        padding: "11px 12px",
        marginBottom: 7,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>
            {a.id} · {a.date}
          </div>
          <div style={{ fontWeight: 700, color: selected ? "#ffffff" : "#e2e8f0", fontSize: 14, marginBottom: 2 }}>
            {a.region}
          </div>
          <div style={{ color: "#9ca3af", fontSize: 12 }}>{a.signal}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, marginLeft: 12 }}>
          <BADGE text={a.level} color={lb(a.level)} />
          <Spark data={a.trend} color={color} />
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "monospace" }}>{a.confidence}% conf</span>
        </div>
      </div>

      {/* Expanded detail */}
      {selected && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1f2d45" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 120px), 1fr))", gap: 8, marginBottom: 12 }}>
            {[
              ["TYPE",    a.type,             "#4db8ff"],
              ["SOURCES", String(a.sources),  "#e2e8f0"],
              ["STATUS",  "Monitoring",       "#ffd700"],
            ].map(([label, value, textColor]) => (
              <div key={label} style={{ background: "#0a1628", borderRadius: 6, padding: "8px 10px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                <div style={{ color: textColor, fontSize: 12, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <ConfidenceBar value={a.confidence} color={color} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function BioThreat() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  function selectAlert(a) {
    setSel(sel?.id === a.id ? null : a);
    setAiResult(null);
    setAiError("");
  }

  async function analyzeAlert(a) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey,
        `You are a biosurveillance intelligence analyst. Assess this epidemiological signal in 3-4 sentences covering: likely pathogen profile, transmission risk, weaponization potential, and recommended health security posture. Signal: ${a.id} — ${a.region}: ${a.signal} (Type: ${a.type}, Confidence: ${a.confidence}%, Level: ${a.level}).`
      );
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  return (
    <div>
      <PageHeader
        icon="🦠"
        title="Bio-Threat Early Warning"
        sub="Epidemiological signal aggregation, biosurveillance, and pathogen intelligence."
        accent="#00ff9d"
        dataMode={apiKey ? "hybrid" : "mock"}
      />

      <StatBar stats={[
        { label: "Active Alerts", value: "14",   color: "#ff4d4d" },
        { label: "Critical",      value: "1",    color: "#ff0000" },
        { label: "Regions",       value: "47",   color: "#4db8ff" },
        { label: "Sources",       value: "230+", color: "#00ff9d" },
      ]} />

      <Card>
        <ST icon="🚨" label="Active Signals" color="#ff4d4d" sub="Ranked by threat level · click to expand" />
        {ALERTS.map(a => (
          <AlertRow
            key={a.id}
            a={a}
            selected={sel?.id === a.id}
            onSelect={() => selectAlert(a)}
          />
        ))}

        {/* AI Analyze button shown inside expanded card */}
        {sel && apiKey && (
          <div style={{ marginTop: 4, paddingLeft: 3 }}>
            <Btn onClick={() => analyzeAlert(sel)} disabled={aiLoading} color="#00ff9d" size="sm">
              {aiLoading ? "⏳ Analyzing..." : "🤖 AI Bio Assessment"}
            </Btn>
          </div>
        )}
        {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
      </Card>

      {aiResult && (
        <Card style={{ borderColor: "#00ff9d33", borderLeft: "3px solid #00ff9d" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <LiveBadge />
            <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>
              AI BIOSURVEILLANCE ASSESSMENT · {sel?.id}
            </span>
          </div>
          <div style={{ color: "#4a5568", fontSize: 11, marginBottom: 10 }}>
            {sel?.region} — {sel?.signal}
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7 }}>{aiResult}</div>
        </Card>
      )}
    </div>
  );
}
