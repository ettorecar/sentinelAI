import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader } from "../components/shared";
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
      max_tokens: 1400,
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

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const slots = ["06–09", "09–12", "12–15", "15–18", "18–21", "21–24"];

export default function PatLife() {
  const [apiKey] = useApiKey();
  const [subject, setSubject] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!subject) { setError("Enter a subject identifier."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const prompt = `You are a senior intelligence analyst performing a pattern-of-life analysis for a government surveillance operation. Generate a realistic spatio-temporal behaviour reconstruction for the following subject identifier. Return ONLY a JSON object (no markdown, no backticks, no commentary).

Subject identifier: ${subject}

Return exactly this JSON structure:
{
  "predictability": number_0_to_100,
  "risk_assessment": "LOW|MEDIUM|HIGH|CRITICAL",
  "sources_count": number,
  "high_exposure_events": number,
  "intelligence_summary": "string (2-3 sentence assessment)",
  "routine_patterns": [
    {"day": "string e.g. Mon–Fri", "time": "HH:MM", "location": "string", "exposure": "LOW|MEDIUM|HIGH", "activity": "string"}
  ],
  "heatmap": [[number 0 or 1 for each of 7 days], ...repeat for 6 time slots],
  "vulnerabilities": ["string"],
  "counter_surveillance_indicators": ["string"]
}

Include 5-7 routine patterns. The heatmap must be a 6×7 matrix (6 time slots × 7 days) with 0 or 1 values.`;
      setResult(await callClaude(apiKey, prompt));
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  const expColor = (e) => e === "HIGH" ? "red" : e === "MEDIUM" ? "yellow" : "green";
  const riskColor = (r) => r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";

  return (
    <div>
      <PageHeader icon="📍" title="Pattern-of-Life Analyzer" sub="Spatio-temporal behaviour reconstruction." accent="#4db8ff" badges={[{text:"AI Live",color:"#00ff9d"}]} />

      <Card>
        <Input label="🎯 Subject" value={subject} onChange={setSubject} placeholder="Subject Alpha, plate LK-4422, @username, IP 91.x.x.x..." />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <Btn onClick={analyze} disabled={loading}>
          {loading ? "⏳ Analyzing..." : "Analyze"}
        </Btn>
      </Card>

      {result && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
            {[
              ["Predictability", `${result.predictability}%`, "#ff4d4d"],
              ["Sources", String(result.sources_count), "#4db8ff"],
              ["High-Exposure Events", String(result.high_exposure_events), "#ffd700"],
            ].map(([l, v, c]) => (
              <Card key={l} style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>{l}</div>
              </Card>
            ))}
          </div>

          <Card style={{ borderColor: riskColor(result.risk_assessment) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <ST icon="🧠" label="Intelligence Summary" color="#4db8ff" />
              <BADGE
                text={result.risk_assessment}
                color={result.risk_assessment === "CRITICAL" || result.risk_assessment === "HIGH" ? "red" : result.risk_assessment === "MEDIUM" ? "yellow" : "green"}
              />
            </div>
            <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.6 }}>{result.intelligence_summary}</div>
          </Card>

          {result.heatmap && (
            <Card>
              <ST icon="🗓️" label="Activity Heatmap" color="#4db8ff" />
              <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ color: "#9ca3af", padding: "2px 5px", fontWeight: 400 }}></th>
                    {days.map((d) => (
                      <th key={d} style={{ color: "#9ca3af", padding: "2px 5px", fontWeight: 400, minWidth: 34 }}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((s, si) => (
                    <tr key={s}>
                      <td style={{ color: "#9ca3af", padding: "2px 5px", fontSize: 10 }}>{s}</td>
                      {days.map((_, di) => {
                        const active = result.heatmap[si]?.[di] === 1;
                        return (
                          <td key={di} style={{ padding: 2 }}>
                            <div
                              style={{
                                width: 30,
                                height: 18,
                                background: active ? "#ff4d4d22" : "#0d1626",
                                border: `1px solid ${active ? "#ff4d4d" : "#1f2d45"}`,
                                borderRadius: 3,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4d4d" }} />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <Card>
            <ST icon="🕐" label="Routine Pattern Timeline" color="#4db8ff" />
            {result.routine_patterns?.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid #0d1626" }}>
                <div style={{ minWidth: 60, color: "#9ca3af", fontSize: 11 }}>{r.day}</div>
                <div style={{ minWidth: 45, color: "#e2e8f0", fontFamily: "monospace", fontSize: 11 }}>{r.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>{r.location}</div>
                  {r.activity && <div style={{ color: "#555", fontSize: 11 }}>{r.activity}</div>}
                </div>
                <BADGE text={r.exposure} color={expColor(r.exposure)} />
              </div>
            ))}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card>
              <ST icon="⚠️" label="Vulnerabilities" color="#ff4d4d" />
              {result.vulnerabilities?.map((v, i) => (
                <div key={i} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 6 }}>• {v}</div>
              ))}
            </Card>
            <Card>
              <ST icon="👁️" label="Counter-Surveillance Indicators" color="#ffd700" />
              {result.counter_surveillance_indicators?.map((c, i) => (
                <div key={i} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 6 }}>• {c}</div>
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
