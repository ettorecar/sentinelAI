import { useState } from "react";
import { BADGE, Card, Btn, ST, Input, LiveBadge } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

const DOMAINS = [
  { id: "kinetic",   label: "Kinetic / Military",     icon: "💥" },
  { id: "cyber",     label: "Cyber Threats",           icon: "🔐" },
  { id: "maritime",  label: "Maritime / Chokepoints",  icon: "🌊" },
  { id: "energy",    label: "Energy Infrastructure",   icon: "⚡" },
  { id: "bio",       label: "Bio-Threat",               icon: "🦠" },
  { id: "disinfo",   label: "Disinformation",           icon: "📰" },
];

const CLASSIFICATIONS = ["UNCLASSIFIED", "RESTRICTED", "CONFIDENTIAL"];
const FORMATS = ["Executive Brief", "Full Intelligence Report", "Tactical Summary"];

async function callClaude(apiKey, prompt, maxTokens = 2000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

export default function IntelReport() {
  const [apiKey] = useApiKey();
  const [selectedDomains, setSelectedDomains] = useState(["cyber", "maritime"]);
  const [focus, setFocus] = useState("");
  const [timeframe, setTimeframe] = useState("72h");
  const [format, setFormat] = useState("Executive Brief");
  const [classification, setClassification] = useState("RESTRICTED");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleDomain(id) {
    setSelectedDomains(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  }

  async function generate() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (selectedDomains.length === 0) { setError("Select at least one intelligence domain."); return; }
    setError(""); setLoading(true); setResult(null);

    const domainLabels = selectedDomains.map(id => DOMAINS.find(d => d.id === id)?.label).join(", ");

    const prompt = `You are a senior intelligence analyst at a defence intelligence organization. Generate a ${format} covering the following domains: ${domainLabels}.
${focus ? `Specific focus: ${focus}` : ""}
Timeframe: last ${timeframe}.
Classification: ${classification}.

Return ONLY a JSON object (no markdown, no backticks):
{
  "title": "Report title",
  "classification": "${classification}",
  "date": "current date",
  "executive_summary": "2-3 sentence summary of the key intelligence picture",
  "key_findings": [
    {"domain": "domain name", "finding": "key finding text", "severity": "CRITICAL|HIGH|MEDIUM|LOW"}
  ],
  "threat_actors": ["actor name and brief description"],
  "emerging_risks": ["risk description"],
  "recommended_actions": [
    {"priority": "IMMEDIATE|SHORT_TERM|LONG_TERM", "action": "action description"}
  ],
  "intelligence_gaps": ["gap description"],
  "confidence_level": "HIGH|MEDIUM|LOW",
  "analyst_note": "brief analyst assessment note"
}`;

    try {
      const raw = await callClaude(apiKey, prompt, 2000);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setResult(parsed);
    } catch (e) {
      setError("Error: " + e.message);
    }
    setLoading(false);
  }

  function printReport() {
    window.print();
  }

  const severityColor = s => s === "CRITICAL" ? "#ff0000" : s === "HIGH" ? "#ff4d4d" : s === "MEDIUM" ? "#ffd700" : "#00ff9d";
  const priorityColor = p => p === "IMMEDIATE" ? "#ff4d4d" : p === "SHORT_TERM" ? "#ffd700" : "#4db8ff";

  return (
    <div>
      <h2 style={{ color: "#b47fff", marginTop: 0 }}>📋 Intelligence Report Generator</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>
        Generate structured multi-domain intelligence briefs.{" "}
        {apiKey ? <LiveBadge /> : <BADGE text="API Key Required" color="yellow" />}
      </p>

      <Card>
        <ST icon="🎯" label="Intelligence Domains" color="#b47fff" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {DOMAINS.map(d => (
            <button key={d.id} onClick={() => toggleDomain(d.id)}
              style={{
                background: selectedDomains.includes(d.id) ? "#b47fff" : "#1f2d45",
                color: selectedDomains.includes(d.id) ? "#0a0f1e" : "#9ca3af",
                border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 12,
                fontWeight: selectedDomains.includes(d.id) ? 700 : 400,
              }}>{d.icon} {d.label}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>⏱ Timeframe</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["24h", "72h", "7d", "30d"].map(t => (
                <button key={t} onClick={() => setTimeframe(t)}
                  style={{ background: timeframe === t ? "#b47fff" : "#1f2d45", color: timeframe === t ? "#0a0f1e" : "#9ca3af", border: "none", borderRadius: 5, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: timeframe === t ? 700 : 400 }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>🔒 Classification</div>
            <div style={{ display: "flex", gap: 6 }}>
              {CLASSIFICATIONS.map(c => (
                <button key={c} onClick={() => setClassification(c)}
                  style={{ background: classification === c ? "#b47fff" : "#1f2d45", color: classification === c ? "#0a0f1e" : "#9ca3af", border: "none", borderRadius: 5, padding: "5px 8px", cursor: "pointer", fontSize: 11, fontWeight: classification === c ? 700 : 400 }}>{c}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>📄 Format</div>
          <div style={{ display: "flex", gap: 6 }}>
            {FORMATS.map(f => (
              <button key={f} onClick={() => setFormat(f)}
                style={{ background: format === f ? "#b47fff" : "#1f2d45", color: format === f ? "#0a0f1e" : "#9ca3af", border: "none", borderRadius: 5, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: format === f ? 700 : 400 }}>{f}</button>
            ))}
          </div>
        </div>

        <Input label="🔍 Specific Focus (optional)" value={focus} onChange={setFocus}
          placeholder="e.g. Iran-Israel tensions, Baltic undersea cables, Sahel region..." />

        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        {!apiKey && (
          <div style={{ color: "#ff9d00", fontSize: 13, marginBottom: 12 }}>
            ⚠ Set your Anthropic API key in the banner at the top to generate reports.
          </div>
        )}
        <Btn onClick={generate} disabled={loading || !apiKey} color="#b47fff">
          {loading ? "⏳ Generating Report..." : "📋 Generate Intelligence Report"}
        </Btn>
      </Card>

      {result && (
        <>
          {/* Report header */}
          <Card style={{ borderColor: "#b47fff", borderWidth: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ color: "#9ca3af", fontSize: 10, fontFamily: "monospace", marginBottom: 4 }}>
                  SENTINEL INTELLIGENCE REPORT · {result.date}
                </div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#e2e8f0" }}>{result.title}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                <BADGE text={result.classification} color="red" />
                <BADGE text={`Confidence: ${result.confidence_level}`} color={result.confidence_level === "HIGH" ? "green" : result.confidence_level === "MEDIUM" ? "yellow" : "red"} />
                <LiveBadge />
              </div>
            </div>
            <div style={{ background: "#0d1626", borderRadius: 8, padding: 14, borderLeft: "3px solid #b47fff" }}>
              <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6 }}>EXECUTIVE SUMMARY</div>
              <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.7 }}>{result.executive_summary}</div>
            </div>
          </Card>

          {/* Key findings */}
          <Card>
            <ST icon="🔍" label="Key Findings" color="#b47fff" />
            {result.key_findings?.map((f, i) => (
              <div key={i} style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px", marginBottom: 8, borderLeft: `3px solid ${severityColor(f.severity)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "#9ca3af", fontSize: 10, textTransform: "uppercase" }}>{f.domain}</span>
                    <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{f.finding}</div>
                  </div>
                  <BADGE text={f.severity} color={f.severity === "CRITICAL" || f.severity === "HIGH" ? "red" : f.severity === "MEDIUM" ? "yellow" : "green"} />
                </div>
              </div>
            ))}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Threat actors */}
            <Card style={{ marginBottom: 0 }}>
              <ST icon="👤" label="Threat Actors" color="#ff4d4d" />
              {result.threat_actors?.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7 }}>
                  <span style={{ color: "#ff4d4d", fontSize: 12, marginTop: 1 }}>▸</span>
                  <span style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{a}</span>
                </div>
              ))}
            </Card>

            {/* Emerging risks */}
            <Card style={{ marginBottom: 0 }}>
              <ST icon="⚠️" label="Emerging Risks" color="#ffd700" />
              {result.emerging_risks?.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7 }}>
                  <span style={{ color: "#ffd700", fontSize: 12, marginTop: 1 }}>▸</span>
                  <span style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Recommended actions */}
          <Card style={{ marginTop: 14 }}>
            <ST icon="✅" label="Recommended Actions" color="#00ff9d" />
            {result.recommended_actions?.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#0d1626", borderRadius: 6, padding: "8px 12px", marginBottom: 7 }}>
                <span style={{ color: priorityColor(a.priority), fontSize: 10, fontWeight: 700, minWidth: 80, marginTop: 2 }}>{a.priority}</span>
                <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{a.action}</span>
              </div>
            ))}
          </Card>

          {/* Intelligence gaps + analyst note */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Card style={{ marginBottom: 0 }}>
              <ST icon="❓" label="Intelligence Gaps" color="#4db8ff" />
              {result.intelligence_gaps?.map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                  <span style={{ color: "#4db8ff" }}>•</span>
                  <span style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5 }}>{g}</span>
                </div>
              ))}
            </Card>
            <Card style={{ marginBottom: 0 }}>
              <ST icon="🧠" label="Analyst Note" color="#b47fff" />
              <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7, fontStyle: "italic" }}>{result.analyst_note}</div>
            </Card>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <Btn onClick={printReport} color="#1f2d45">🖨 Export / Print</Btn>
            <Btn onClick={() => setResult(null)} color="#1f2d45">🔄 New Report</Btn>
          </div>
        </>
      )}
    </div>
  );
}
