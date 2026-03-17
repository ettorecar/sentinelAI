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

const alerts = [
  { id: "BT-2026-031", region: "Eastern Balkans", signal: "Unusual pneumonia cluster",     sources: 4,  confidence: 72, level: "HIGH",     date: "13/03", type: "Respiratory",  trend: [12,15,14,18,22,28,35] },
  { id: "BT-2026-028", region: "Central Asia",    signal: "Livestock mass mortality",      sources: 6,  confidence: 65, level: "MEDIUM",   date: "11/03", type: "Zoonotic",      trend: [8,8,10,9,12,11,14]    },
  { id: "BT-2026-019", region: "West Africa",     signal: "Haemorrhagic fever signals",   sources: 8,  confidence: 81, level: "HIGH",     date: "07/03", type: "Haemorrhagic",  trend: [30,35,40,38,45,50,48] },
  { id: "BT-2026-003", region: "Horn of Africa",  signal: "Cholera, elevated fatality rate",sources:11,confidence: 93, level: "CRITICAL", date: "21/02", type: "Enteric",       trend: [60,70,80,75,90,95,100]},
];

export default function BioThreat() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function analyzeAlert(a) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey, `You are a biosurveillance intelligence analyst. Assess this epidemiological signal in 3-4 sentences covering: likely pathogen profile, transmission risk, weaponization potential, and recommended health security posture. Signal: ${a.id} — ${a.region}: ${a.signal} (Type: ${a.type}, Confidence: ${a.confidence}%, Level: ${a.level}).`);
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  return (
    <div>
      <PageHeader icon="🦠" title="Bio-Threat Early Warning" sub="Epidemiological signal aggregation and biosurveillance." accent="#00ff9d" mock />

      <StatBar stats={[
        { label: "Active Alerts",  value: "14",   color: "#ff4d4d" },
        { label: "Critical",       value: "1",    color: "#ff0000" },
        { label: "Regions",        value: "47",   color: "#4db8ff" },
        { label: "Sources",        value: "230+", color: "#00ff9d" },
      ]} />

      <Card>
        <ST icon="🚨" label="Active Signals" color="#ff4d4d" />
        {alerts.map(a => {
          const c = a.level === "CRITICAL" ? "#ff0000" : a.level === "HIGH" ? "#ff4d4d" : "#ffd700";
          return (
            <div key={a.id} onClick={() => setSel(sel?.id === a.id ? null : a)}
              style={{ background: sel?.id === a.id ? "#1a2535" : "#0d1626", border: `1px solid ${sel?.id === a.id ? c : "#1f2d45"}`, borderRadius: 7, padding: "10px 12px", marginBottom: 6, cursor: "pointer", borderLeft: `4px solid ${c}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: "#9ca3af", fontSize: 10 }}>{a.id} · {a.date}</span>
                  <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{a.region}</div>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>{a.signal}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, marginLeft: 10 }}>
                  <BADGE text={a.level} color={a.level === "CRITICAL" || a.level === "HIGH" ? "red" : "yellow"} />
                  <Spark data={a.trend} color={c} />
                  <span style={{ color: "#9ca3af", fontSize: 10 }}>{a.confidence}%</span>
                </div>
              </div>
              {sel?.id === a.id && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1f2d45" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <div><div style={{ color: "#9ca3af", fontSize: 10 }}>TYPE</div><div style={{ color: "#4db8ff" }}>{a.type}</div></div>
                    <div><div style={{ color: "#9ca3af", fontSize: 10 }}>SOURCES</div><div style={{ color: "#e2e8f0" }}>{a.sources}</div></div>
                    <div><div style={{ color: "#9ca3af", fontSize: 10 }}>STATUS</div><div style={{ color: "#ffd700" }}>Monitoring</div></div>
                  </div>
                  {apiKey && (
                    <Btn onClick={() => analyzeAlert(a)} disabled={aiLoading} color="#1f2d45">
                      {aiLoading ? "⏳ Analyzing..." : "🤖 AI Bio Assessment"}
                    </Btn>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>
      {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginBottom: 10 }}>{aiError}</div>}
      {aiResult && (
        <Card style={{ borderColor: "#00ff9d" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <LiveBadge />
            <span style={{ color: "#9ca3af", fontSize: 11 }}>AI BIOSURVEILLANCE ASSESSMENT</span>
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7 }}>{aiResult}</div>
        </Card>
      )}
    </div>
  );
}
