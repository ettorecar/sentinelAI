import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, LiveBadge } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
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
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(
    data.content
      .map((b) => b.text || "")
      .join("")
      .replace(/```json|```/g, "")
      .trim()
  );
}

const riskColor = (r) =>
  r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";

const riskBadge = (r) =>
  r === "CRITICAL" || r === "HIGH" ? "red" : r === "MEDIUM" ? "yellow" : "green";

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

  // Build a simple SVG graph from AI-generated connections (up to 6 nodes)
  function buildGraph(result) {
    const maxNodes = Math.min(6, (result.connections?.length || 0) + 1);
    const angles = Array.from({ length: maxNodes - 1 }, (_, i) => (2 * Math.PI * i) / (maxNodes - 1));
    const cx = 260, cy = 160, r = 110;
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

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>🔍 OSINT Correlation Engine</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>
        Entity correlation graphs from open-source intelligence. <LiveBadge />
      </p>

      <Card>
        <Input label="🔎 Entity" value={query} onChange={setQuery} placeholder="Person name, company, vessel, domain, IP..." />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <Btn onClick={run} disabled={loading}>
          {loading ? "⏳ Correlating..." : "Run Correlation"}
        </Btn>
      </Card>

      {result && (() => {
        const { centerNode, outerNodes } = buildGraph(result);
        return (
          <>
            <Card style={{ borderColor: riskColor(result.risk_level) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#e2e8f0" }}>{result.entity}</div>
                  <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>{result.entity_type}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <BADGE text={result.risk_level} color={riskBadge(result.risk_level)} />
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>Confidence: <span style={{ color: "#ffd700" }}>{result.confidence}%</span></div>
                </div>
              </div>
              <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.6 }}>{result.summary}</div>
            </Card>

            <Card>
              <ST icon="📊" label="Entity Graph" color="#4db8ff" />
              <svg viewBox="0 0 520 320" style={{ width: "100%", background: "#0d1626", borderRadius: 8 }}>
                {outerNodes.map((n, i) => (
                  <line key={i} x1={centerNode.x} y1={centerNode.y} x2={n.x} y2={n.y}
                    stroke="#1f2d45" strokeWidth="2" strokeDasharray="4" />
                ))}
                {outerNodes.map((n, i) => (
                  <g key={i}>
                    <circle cx={n.x} cy={n.y} r={20} fill="#111827" stroke={riskColor(n.risk)} strokeWidth="2" />
                    <text x={n.x} y={n.y - 26} textAnchor="middle" fill={riskColor(n.risk)} fontSize="9" fontWeight="bold">
                      {n.label.length > 14 ? n.label.slice(0, 14) + "…" : n.label}
                    </text>
                    <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#9ca3af" fontSize="7">{n.type.slice(0, 10)}</text>
                    <circle cx={n.x} cy={n.y} r={4} fill={riskColor(n.risk)} />
                  </g>
                ))}
                <circle cx={centerNode.x} cy={centerNode.y} r={28} fill="#111827" stroke={riskColor(centerNode.risk)} strokeWidth="3" />
                <text x={centerNode.x} y={centerNode.y - 4} textAnchor="middle" fill={riskColor(centerNode.risk)} fontSize="9" fontWeight="bold">
                  {centerNode.label.length > 14 ? centerNode.label.slice(0, 14) + "…" : centerNode.label}
                </text>
                <text x={centerNode.x} y={centerNode.y + 8} textAnchor="middle" fill="#9ca3af" fontSize="7">{centerNode.type}</text>
              </svg>
            </Card>

            <Card>
              <ST icon="🔗" label="Key Connections" color="#ffd700" />
              {result.connections?.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, borderLeft: "2px solid #ffd700", paddingLeft: 12 }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 13 }}>{result.entity} → <span style={{ color: "#4db8ff" }}>{c.entity}</span></div>
                    <div style={{ color: "#9ca3af", fontSize: 11 }}>{c.relation} · via {c.source}</div>
                  </div>
                  <BADGE text={c.risk} color={riskBadge(c.risk)} />
                </div>
              ))}
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card>
                <ST icon="🧾" label="Intelligence Notes" color="#4db8ff" />
                {result.intelligence_notes?.map((n, i) => (
                  <div key={i} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 6 }}>• {n}</div>
                ))}
              </Card>
              <Card>
                <ST icon="🛡️" label="Recommended Actions" color="#00ff9d" />
                {result.recommended_actions?.map((a, i) => (
                  <div key={i} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 6 }}>• {a}</div>
                ))}
              </Card>
            </div>
          </>
        );
      })()}
    </div>
  );
}
