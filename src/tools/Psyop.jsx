import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, LiveBadge } from "../components/shared";
import { RC } from "../constants";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
}

function TechniqueItem({ t }) {
  const [hovered, setHovered] = useState(false);
  const color = RC[t.severity] || "#555";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 7,
        padding: "10px 12px",
        marginBottom: 7,
        borderLeft: `3px solid ${color}`,
        border: `1px solid ${hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${color}`,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ fontWeight: 700, color: hovered ? "#ffffff" : "#e2e8f0", fontSize: 13 }}>{t.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: "#ffd700", fontSize: 12, fontWeight: 700 }}>{t.val}%</span>
          <BADGE text={t.severity} color={t.severity === "HIGH" ? "red" : t.severity === "MEDIUM" ? "yellow" : "green"} />
        </div>
      </div>
      <div style={{ background: "#111827", borderRadius: 3, height: 5, marginBottom: 5 }}>
        <div style={{ background: color, height: 5, borderRadius: 3, width: `${t.val}%`, transition: "width 0.4s" }} />
      </div>
      <div style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5 }}>{t.desc}</div>
    </div>
  );
}

export default function Psyop() {
  const [apiKey] = useApiKey();
  const [content, setContent] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!content) { setError("Paste content to analyze."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const prompt = `You are a senior PSYOP analyst for a NATO intelligence unit. Analyze the following content for psychological operation techniques used to influence target audiences. Return ONLY a JSON object (no markdown, no backticks, no commentary).

Content to analyze:
${content}

Return exactly this JSON structure:
{"detected":true|false,"confidence":number_0_to_100,"target_effect":"string describing intended psychological effect on audience","origin":"string e.g. State-sponsored influence op, Hacktivist collective, Commercial propaganda, Unknown","techniques":[{"name":"string","desc":"string explaining the technique","severity":"HIGH|MEDIUM|LOW","val":number_0_to_100}]}

Include 3-5 specific PSYOP techniques from: Fear Appeal, In-group/Out-group polarisation, False Urgency, Authority Spoofing, Bandwagon Effect, Loaded Language, Scapegoating, Manufactured Consensus, Repetition/Hammering, Dehumanisation.`;
      setResult(await callClaude(apiKey, prompt));
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader icon="🧠" title="PSYOP Content Analyzer" sub="Identify psychological operation techniques in media and influence campaigns." accent="#b47fff" badges={[{text:"AI Live",color:"#00ff9d"}]} />

      <Card>
        <Input label="📄 Content" value={content} onChange={setContent} placeholder="Paste text, article, broadcast transcript..." rows={5} />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <Btn onClick={analyze} disabled={loading}>
          {loading ? "⏳ Analyzing..." : "Analyze for PSYOP"}
        </Btn>
      </Card>

      {result && (
        <>
          <Card style={{ borderColor: result.detected ? "#ff4d4d55" : "#00ff9d55", borderLeft: `3px solid ${result.detected ? "#ff4d4d" : "#00ff9d"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>PSYOP DETECTION</div>
                <div style={{ fontWeight: 900, fontSize: 18, color: result.detected ? "#ff4d4d" : "#00ff9d" }}>
                  {result.detected ? "PSYOP DETECTED" : "NO PSYOP DETECTED"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>CONFIDENCE</div>
                <div style={{ color: "#ffd700", fontWeight: 800, fontSize: 26, lineHeight: 1 }}>{result.confidence}%</div>
              </div>
            </div>

            {/* Confidence bar */}
            <div style={{ background: "#0d1626", borderRadius: 3, height: 6, marginBottom: 12 }}>
              <div style={{ background: result.detected ? "#ff4d4d" : "#00ff9d", height: 6, borderRadius: 3, width: `${result.confidence}%`, transition: "width 0.4s" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>TARGET EFFECT</div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{result.target_effect}</div>
              </div>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>ATTRIBUTED ORIGIN</div>
                <div style={{ color: "#ffd700", fontSize: 12, lineHeight: 1.5 }}>{result.origin}</div>
              </div>
            </div>
          </Card>

          {result.techniques?.length > 0 && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <ST icon="🎭" label="PSYOP Techniques" color="#ff4d4d" sub={`${result.techniques.length} techniques identified`} />
                <LiveBadge />
              </div>
              {result.techniques.map((t, i) => (
                <TechniqueItem key={i} t={t} />
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
