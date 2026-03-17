import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, LiveBadge } from "../components/shared";
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

const verdictColor = v => v?.includes("DISINFORMATION") ? "#ff4d4d" : v === "SUSPICIOUS" ? "#ffd700" : "#00ff9d";
const verdictBadge = v => v?.includes("DISINFORMATION") ? "red" : v === "SUSPICIOUS" ? "yellow" : "green";

function TechniqueBar({ name, intensity }) {
  const [hovered, setHovered] = useState(false);
  const color = intensity > 80 ? "#ff4d4d" : intensity > 60 ? "#ffd700" : "#4db8ff";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 6,
        padding: "10px 12px",
        marginBottom: 7,
        border: `1px solid ${hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderLeft: `3px solid ${color}`,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ color: hovered ? "#e2e8f0" : "#c8d0dc", fontSize: 13, fontWeight: 500 }}>{name}</span>
        <span style={{ color, fontWeight: 800, fontSize: 13 }}>{intensity}%</span>
      </div>
      <div style={{ background: "#1f2d45", borderRadius: 3, height: 6 }}>
        <div style={{ background: color, height: 6, borderRadius: 3, width: `${intensity}%`, transition: "width 0.4s" }} />
      </div>
    </div>
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

  return (
    <div>
      <PageHeader icon="📰" title="Disinformation Detector" sub="Classify disinformation techniques, origin and narrative." accent="#ff4d4d" badges={[{text:"AI Live",color:"#00ff9d"}]} />

      <Card>
        <Input label="📄 Content" value={text} onChange={setText} placeholder="Paste article, social post, broadcast transcript..." rows={4} />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <Btn onClick={analyze} disabled={loading}>
          {loading ? "⏳ Analyzing..." : "Analyze Content"}
        </Btn>
      </Card>

      {result && (
        <>
          {/* Verdict card */}
          <Card style={{ borderColor: verdictColor(result.verdict) + "55", borderLeft: `3px solid ${verdictColor(result.verdict)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 5 }}>ANALYSIS VERDICT</div>
                <div style={{ fontWeight: 900, fontSize: 18, color: verdictColor(result.verdict) }}>{result.verdict}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>CONFIDENCE</div>
                <div style={{ color: "#ffd700", fontWeight: 800, fontSize: 26, lineHeight: 1 }}>{result.confidence}%</div>
              </div>
            </div>

            {/* Confidence bar */}
            <div style={{ background: "#0d1626", borderRadius: 3, height: 6, marginBottom: 12 }}>
              <div style={{ background: verdictColor(result.verdict), height: 6, borderRadius: 3, width: `${result.confidence}%`, transition: "width 0.4s" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 10 }}>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>NARRATIVE</div>
                <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{result.narrative}</div>
              </div>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>ATTRIBUTED ORIGIN</div>
                <div style={{ color: "#ffd700", fontSize: 12, lineHeight: 1.5 }}>{result.origin}</div>
              </div>
            </div>
          </Card>

          {/* Techniques */}
          {result.techniques?.length > 0 && (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <ST icon="📊" label="Technique Intensity" color="#ff4d4d" sub={`${result.techniques.length} techniques identified`} />
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <LiveBadge />
                  <BADGE text={result.verdict} color={verdictBadge(result.verdict)} />
                </div>
              </div>
              {result.techniques.map(({ name, intensity }) => (
                <TechniqueBar key={name} name={name} intensity={intensity} />
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
