import { useState } from "react";
import { BADGE, Card, Btn, ST, Input, PageHeader, LiveBadge } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

const DOMAINS = [
  { id: "kinetic",  label: "Kinetic / Military",    icon: "💥" },
  { id: "cyber",    label: "Cyber Threats",          icon: "🔐" },
  { id: "maritime", label: "Maritime / Chokepoints", icon: "🌊" },
  { id: "energy",   label: "Energy Infrastructure",  icon: "⚡" },
  { id: "bio",      label: "Bio-Threat",              icon: "🦠" },
  { id: "disinfo",  label: "Disinformation",          icon: "📰" },
];

const CLASSIFICATIONS = ["UNCLASSIFIED", "RESTRICTED", "CONFIDENTIAL"];
const FORMATS = ["Executive Brief", "Full Intelligence Report", "Tactical Summary"];
const TIMEFRAMES = ["24h", "72h", "7d", "30d"];

async function callClaude(apiKey, prompt, maxTokens = 2000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

function ToggleBtn({ active, onClick, color = "#b47fff", children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? color : hovered ? color + "22" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? color : "#9ca3af",
        border: `1px solid ${active ? color : hovered ? color + "44" : "transparent"}`,
        borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12,
        fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function SmallToggle({ active, onClick, color = "#b47fff", children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? color : hovered ? color + "22" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? color : "#9ca3af",
        border: `1px solid ${active ? color : hovered ? color + "44" : "transparent"}`,
        borderRadius: 5, padding: "5px 10px", cursor: "pointer", fontSize: 11,
        fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

const severityColor = s => s === "CRITICAL" ? "#ff0000" : s === "HIGH" ? "#ff4d4d" : s === "MEDIUM" ? "#ffd700" : "#00ff9d";
const priorityColor = p => p === "IMMEDIATE" ? "#ff4d4d" : p === "SHORT_TERM" ? "#ffd700" : "#4db8ff";

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
    setSelectedDomains(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
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
      setResult(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader icon="📋" title="Intelligence Report Generator" sub="Generate structured multi-domain intelligence briefs." accent="#b47fff" classification="TOP SECRET" dataMode="ai" badges={apiKey ? [] : [{text:"API Key Required",color:"#ffd700"}]} />

      <Card>
        <ST icon="🎯" label="Intelligence Domains" color="#b47fff" sub="Select one or more domains to include" />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
          {DOMAINS.map(d => (
            <ToggleBtn key={d.id} active={selectedDomains.includes(d.id)} onClick={() => toggleDomain(d.id)}>
              {d.icon} {d.label}
            </ToggleBtn>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 6, letterSpacing: 0.5 }}>⏱ Timeframe</div>
            <div style={{ display: "flex", gap: 5 }}>
              {TIMEFRAMES.map(t => (
                <SmallToggle key={t} active={timeframe === t} onClick={() => setTimeframe(t)}>{t}</SmallToggle>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 6, letterSpacing: 0.5 }}>🔒 Classification</div>
            <div style={{ display: "flex", gap: 5 }}>
              {CLASSIFICATIONS.map(c => (
                <SmallToggle key={c} active={classification === c} onClick={() => setClassification(c)}>{c}</SmallToggle>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 6, letterSpacing: 0.5 }}>📄 Format</div>
          <div style={{ display: "flex", gap: 5 }}>
            {FORMATS.map(f => (
              <SmallToggle key={f} active={format === f} onClick={() => setFormat(f)}>{f}</SmallToggle>
            ))}
          </div>
        </div>

        <Input label="🔍 Specific Focus (optional)" value={focus} onChange={setFocus}
          placeholder="e.g. Iran-Israel tensions, Baltic undersea cables, Sahel region..." />

        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        {!apiKey && (
          <div style={{ color: "#ff9d00", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#1a0e0022", border: "1px solid #ff9d0033", borderRadius: 6 }}>
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
          <Card style={{ borderColor: "#b47fff55", borderLeft: "3px solid #b47fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ color: "#4a5568", fontSize: 10, fontFamily: "monospace", letterSpacing: 2, marginBottom: 5 }}>
                  SENTINEL INTELLIGENCE REPORT · {result.date}
                </div>
                <div style={{ fontWeight: 900, fontSize: 17, color: "#e2e8f0" }}>{result.title}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
                <BADGE text={result.classification} color="red" />
                <BADGE text={`Confidence: ${result.confidence_level}`} color={result.confidence_level === "HIGH" ? "green" : result.confidence_level === "MEDIUM" ? "yellow" : "red"} />
                <LiveBadge />
              </div>
            </div>
            <div style={{ background: "#0d1626", borderRadius: 8, padding: 14, borderLeft: "3px solid #b47fff" }}>
              <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>EXECUTIVE SUMMARY</div>
              <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.75 }}>{result.executive_summary}</div>
            </div>
          </Card>

          {/* Key findings */}
          <Card>
            <ST icon="🔍" label="Key Findings" color="#b47fff" sub={`${result.key_findings?.length} findings across ${selectedDomains.length} domains`} />
            {result.key_findings?.map((f, i) => (
              <div key={i} style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px", marginBottom: 8, borderLeft: `3px solid ${severityColor(f.severity)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{f.domain}</span>
                    <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 3, lineHeight: 1.55 }}>{f.finding}</div>
                  </div>
                  <BADGE text={f.severity} color={f.severity === "CRITICAL" || f.severity === "HIGH" ? "red" : f.severity === "MEDIUM" ? "yellow" : "green"} />
                </div>
              </div>
            ))}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 14 }}>
            <Card style={{ marginBottom: 0 }}>
              <ST icon="👤" label="Threat Actors" color="#ff4d4d" />
              {result.threat_actors?.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7 }}>
                  <span style={{ color: "#ff4d4d", fontSize: 12, marginTop: 1 }}>▸</span>
                  <span style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{a}</span>
                </div>
              ))}
            </Card>
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
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#0d1626", borderRadius: 6, padding: "9px 12px", marginBottom: 7, borderLeft: `2px solid ${priorityColor(a.priority)}` }}>
                <span style={{ color: priorityColor(a.priority), fontSize: 10, fontWeight: 700, minWidth: 88, marginTop: 2, letterSpacing: 0.5 }}>{a.priority}</span>
                <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{a.action}</span>
              </div>
            ))}
          </Card>

          {/* Gaps + analyst note */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 14 }}>
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
              <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.75, fontStyle: "italic" }}>{result.analyst_note}</div>
            </Card>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <Btn onClick={() => window.print()} color="#4db8ff" size="sm">🖨 Export / Print</Btn>
            <Btn onClick={() => setResult(null)} color="#4a5568" size="sm">🔄 New Report</Btn>
          </div>
        </>
      )}
    </div>
  );
}
