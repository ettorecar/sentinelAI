import { useState } from "react";
import { Card, Input, Btn, ST, LiveBadge } from "../components/shared";
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

export default function Disinfo() {
  const [apiKey] = useApiKey();
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!text) { setError("Paste content to analyze."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const prompt = `You are a senior disinformation analyst working for a government intelligence agency. Analyze the following content for disinformation techniques. Return ONLY a JSON object (no markdown, no backticks, no commentary).

Content to analyze:
${text}

Return exactly this JSON structure:
{"verdict":"LIKELY DISINFORMATION|CONFIRMED DISINFORMATION|SUSPICIOUS|LEGITIMATE","confidence":number_0_to_100,"narrative":"brief string describing the narrative","origin":"e.g. State-sponsored IO, Grassroots Campaign, Unknown actor, Pro-Kremlin network, etc.","techniques":[{"name":"string","intensity":number_0_to_100}]}

Include 4-6 specific techniques from this list (or similar): Emotional Appeal, False Attribution, Coordinated Behaviour, Urgency Injection, Authority Spoofing, Decontextualization, Out-of-context media, Astroturfing, Whataboutism, Cherry-picking.`;
      setResult(await callClaude(apiKey, prompt));
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  const verdictColor = (v) =>
    v?.includes("DISINFORMATION") ? "#ff4d4d" : v === "SUSPICIOUS" ? "#ffd700" : "#00ff9d";

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>📰 Disinformation Detector</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>
        Classify disinformation techniques, origin and narrative. <LiveBadge />
      </p>

      <Card>
        <Input label="📄 Content" value={text} onChange={setText} placeholder="Paste article or social post..." rows={4} />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <Btn onClick={analyze} disabled={loading}>
          {loading ? "⏳ Analyzing..." : "Analyze"}
        </Btn>
      </Card>

      {result && (
        <>
          <Card style={{ borderColor: verdictColor(result.verdict) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: verdictColor(result.verdict) }}>{result.verdict}</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>CONFIDENCE</div>
                <div style={{ color: "#ffd700", fontWeight: 800, fontSize: 22 }}>{result.confidence}%</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
                <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 2 }}>NARRATIVE</div>
                <div style={{ color: "#e2e8f0" }}>{result.narrative}</div>
              </div>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
                <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 2 }}>ORIGIN</div>
                <div style={{ color: "#ffd700" }}>{result.origin}</div>
              </div>
            </div>
          </Card>

          <Card>
            <ST icon="📊" label="Technique Intensity" color="#ff4d4d" />
            {result.techniques?.map(({ name, intensity }) => (
              <div key={name} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ color: "#e2e8f0", fontSize: 12 }}>{name}</span>
                  <span style={{ color: "#ffd700", fontSize: 12, fontWeight: 700 }}>{intensity}%</span>
                </div>
                <div style={{ background: "#1f2d45", borderRadius: 4, height: 7 }}>
                  <div
                    style={{
                      background: intensity > 80 ? "#ff4d4d" : intensity > 60 ? "#ffd700" : "#4db8ff",
                      height: 7,
                      borderRadius: 4,
                      width: `${intensity}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
