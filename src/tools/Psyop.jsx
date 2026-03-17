import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, LiveBadge } from "../components/shared";
import { RC } from "../constants";
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
      max_tokens: 1200,
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
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>🧠 PSYOP Content Analyzer</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>
        Identify psychological operation techniques in media. <LiveBadge />
      </p>

      <Card>
        <Input label="📄 Content" value={content} onChange={setContent} placeholder="Paste text or transcript..." rows={5} />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <Btn onClick={analyze} disabled={loading}>
          {loading ? "⏳ Analyzing..." : "Analyze"}
        </Btn>
      </Card>

      {result && (
        <>
          <Card style={{ borderColor: result.detected ? "#ff4d4d" : "#00ff9d" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: result.detected ? "#ff4d4d" : "#00ff9d" }}>
                {result.detected ? "PSYOP DETECTED" : "NO PSYOP DETECTED"}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>CONFIDENCE</div>
                <div style={{ color: "#ffd700", fontWeight: 800, fontSize: 22 }}>{result.confidence}%</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>TARGET EFFECT</div>
                <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 2 }}>{result.target_effect}</div>
              </div>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>ORIGIN</div>
                <div style={{ color: "#ffd700", fontSize: 13, marginTop: 2 }}>{result.origin}</div>
              </div>
            </div>
          </Card>

          {result.techniques?.length > 0 && (
            <Card>
              <ST icon="🎭" label="Techniques" color="#ff4d4d" />
              {result.techniques.map((t, i) => (
                <div
                  key={i}
                  style={{
                    background: "#0d1626",
                    borderRadius: 6,
                    padding: "9px 12px",
                    marginBottom: 7,
                    borderLeft: `3px solid ${RC[t.severity] || "#555"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{t.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ color: "#ffd700", fontSize: 12, fontWeight: 700 }}>{t.val}%</span>
                      <BADGE text={t.severity} color={t.severity === "HIGH" ? "red" : t.severity === "MEDIUM" ? "yellow" : "green"} />
                    </div>
                  </div>
                  <div style={{ background: "#111827", borderRadius: 3, height: 5, marginBottom: 3 }}>
                    <div style={{ background: RC[t.severity] || "#555", height: 5, borderRadius: 3, width: `${t.val}%` }} />
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>{t.desc}</div>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
