import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, LiveBadge } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
}

const riskColor = r => r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";
const riskBadge = r => r === "CRITICAL" || r === "HIGH" ? "red" : r === "MEDIUM" ? "yellow" : "green";

function ConnectionRow({ entity, relation, source, risk, pivot }) {
  const [hovered, setHovered] = useState(false);
  const color = riskColor(risk);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 12px",
        borderRadius: 6,
        background: hovered ? "#0f1a2e" : "transparent",
        borderLeft: `2px solid ${hovered ? color : color + "66"}`,
        transition: "background 0.15s, border-color 0.15s",
        marginBottom: 7,
      }}
    >
      <div>
        <div style={{ color: "#e2e8f0", fontSize: 13 }}>
          <span style={{ color: "#9ca3af" }}>{pivot}</span> → <span style={{ color: "#4db8ff", fontWeight: 600 }}>{entity}</span>
        </div>
        <div style={{ color: "#4a5568", fontSize: 11, marginTop: 2 }}>{relation} · via {source}</div>
      </div>
      <BADGE text={risk} color={riskBadge(risk)} />
    </div>
  );
}

function ListItem({ text, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", gap: 8, alignItems: "flex-start",
        padding: "5px 8px", borderRadius: 5,
        background: hovered ? "#0f1a2e" : "transparent",
        transition: "background 0.15s",
        marginBottom: 5,
      }}
    >
      <span style={{ color, fontSize: 12, marginTop: 2, flexShrink: 0 }}>▸</span>
      <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function buildGraph(result) {
  const maxNodes = Math.min(6, (result.connections?.length || 0) + 1);
  const angles = Array.from({ length: maxNodes - 1 }, (_, i) => (2 * Math.PI * i) / (maxNodes - 1));
  const cx = 260, cy = 155, r = 108;
  const centerNode = { x: cx, y: cy, label: result.entity, type: result.entity_type, risk: result.risk_level };
  const outerNodes = (result.connections || []).slice(0, 5).map((c, i) => ({
    x: cx + r * Math.cos(angles[i] - Math.PI / 2),
    y: cy + r * Math.sin(angles[i] - Math.PI / 2),
    label: c.entity,
    type: c.relation,
    risk: c.risk,
  }));
  return { centerNode, outerNodes };
}

export default function Osint() {
  const [apiKey] = useApiKey();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!query) { setError("Enter an entity to correlate."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const prompt = `You are a senior OSINT analyst at a government intelligence agency. Perform an open-source intelligence correlation analysis on the following entity. Generate a realistic intelligence report based on publicly available information patterns. Return ONLY a JSON object (no markdown, no backticks, no commentary).

Entity to analyze: ${query}

Return exactly this JSON structure:
{
  "entity": "string (clean entity name)",
  "entity_type": "Person|Organization|Location|Vessel|Username|Domain|IP",
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "summary": "string (2-3 sentence intelligence summary)",
  "connections": [
    {"entity": "string", "relation": "string (type of connection)", "risk": "LOW|MEDIUM|HIGH|CRITICAL", "source": "string (e.g. Corporate registry, Social media, Maritime AIS, Financial records)"}
  ],
  "intelligence_notes": ["string"],
  "recommended_actions": ["string"],
  "confidence": number_0_to_100
}

Include 4-6 realistic connections and 3-4 intelligence notes. Make connections plausible for this type of entity.`;
      setResult(await callClaude(apiKey, prompt));
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader icon="🔍" title="OSINT Correlation Engine" sub="Entity correlation graphs from open-source intelligence." accent="#00ff9d" dataMode="ai" />

      <Card>
        <Input label="🔎 Entity" value={query} onChange={setQuery} placeholder="Person name, company, vessel, domain, IP address, username..." />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <Btn onClick={run} disabled={loading}>
          {loading ? "⏳ Correlating..." : "Run OSINT Correlation"}
        </Btn>
      </Card>

      {result && (() => {
        const { centerNode, outerNodes } = buildGraph(result);
        const color = riskColor(result.risk_level);
        return (
          <>
            {/* Entity summary */}
            <Card style={{ borderColor: color + "55", borderLeft: `3px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>ENTITY PROFILE</div>
                  <div style={{ fontWeight: 900, fontSize: 17, color: "#e2e8f0" }}>{result.entity}</div>
                  <div style={{ color: "#4a5568", fontSize: 12, marginTop: 3 }}>{result.entity_type}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                  <BADGE text={result.risk_level} color={riskBadge(result.risk_level)} />
                  <div style={{ color: "#4a5568", fontSize: 11 }}>
                    Confidence: <span style={{ color: "#ffd700", fontWeight: 700 }}>{result.confidence}%</span>
                  </div>
                  <LiveBadge />
                </div>
              </div>
              {/* Confidence bar */}
              <div style={{ background: "#0d1626", borderRadius: 3, height: 5, marginBottom: 12 }}>
                <div style={{ background: color, height: 5, borderRadius: 3, width: `${result.confidence}%`, transition: "width 0.4s" }} />
              </div>
              <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.65 }}>{result.summary}</div>
            </Card>

            {/* Graph */}
            <Card>
              <ST icon="📊" label="Entity Graph" color="#4db8ff" sub={`${result.connections?.length || 0} connections mapped`} />
              <svg viewBox="0 0 520 310" style={{ width: "100%", background: "#0a1628", borderRadius: 8 }}>
                {/* Background grid */}
                {[80,155,230].map(y => <line key={y} x1={0} y1={y} x2={520} y2={y} stroke="#0d1a2e" strokeWidth="1" />)}
                {[130,260,390].map(x => <line key={x} x1={x} y1={0} x2={x} y2={310} stroke="#0d1a2e" strokeWidth="1" />)}
                {/* Edges */}
                {outerNodes.map((n, i) => (
                  <g key={i}>
                    <line x1={centerNode.x} y1={centerNode.y} x2={n.x} y2={n.y}
                      stroke={riskColor(n.risk) + "44"} strokeWidth="1.5" strokeDasharray="5" />
                  </g>
                ))}
                {/* Outer nodes */}
                {outerNodes.map((n, i) => (
                  <g key={i}>
                    <circle cx={n.x} cy={n.y} r={22} fill="#111827" stroke={riskColor(n.risk)} strokeWidth="1.5" />
                    <circle cx={n.x} cy={n.y} r={4} fill={riskColor(n.risk)} />
                    <text x={n.x} y={n.y - 29} textAnchor="middle" fill={riskColor(n.risk)} fontSize="9" fontWeight="bold">
                      {n.label.length > 14 ? n.label.slice(0, 14) + "…" : n.label}
                    </text>
                    <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#6b7a8d" fontSize="7">{n.type.slice(0, 10)}</text>
                  </g>
                ))}
                {/* Center node */}
                <circle cx={centerNode.x} cy={centerNode.y} r={32} fill="#111827" stroke={riskColor(centerNode.risk)} strokeWidth="2.5" />
                <circle cx={centerNode.x} cy={centerNode.y} r={38} fill="none" stroke={riskColor(centerNode.risk)} strokeWidth="0.8" opacity="0.3" />
                <text x={centerNode.x} y={centerNode.y - 5} textAnchor="middle" fill={riskColor(centerNode.risk)} fontSize="9" fontWeight="bold">
                  {centerNode.label.length > 14 ? centerNode.label.slice(0, 14) + "…" : centerNode.label}
                </text>
                <text x={centerNode.x} y={centerNode.y + 8} textAnchor="middle" fill="#6b7a8d" fontSize="8">{centerNode.type}</text>
              </svg>
            </Card>

            {/* Connections */}
            <Card>
              <ST icon="🔗" label="Key Connections" color="#ffd700" sub={`${result.connections?.length} entities linked`} />
              {result.connections?.map((c, i) => (
                <ConnectionRow key={i} entity={c.entity} relation={c.relation} source={c.source} risk={c.risk} pivot={result.entity} />
              ))}
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
              <Card>
                <ST icon="🧾" label="Intelligence Notes" color="#4db8ff" />
                {result.intelligence_notes?.map((n, i) => <ListItem key={i} text={n} color="#4db8ff" />)}
              </Card>
              <Card>
                <ST icon="🛡️" label="Recommended Actions" color="#00ff9d" />
                {result.recommended_actions?.map((a, i) => <ListItem key={i} text={a} color="#00ff9d" />)}
              </Card>
            </div>
          </>
        );
      })()}
    </div>
  );
}
