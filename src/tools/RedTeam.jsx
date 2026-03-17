import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, LiveBadge } from "../components/shared";
import { RC } from "../constants";
import { useApiKey } from "../context/ApiKeyContext";

const actors = ["APT nation-state", "Hacktivist group", "Insider threat", "Criminal syndicate", "Terrorist cell"];

export default function RedTeam() {
  const [apiKey] = useApiKey();
  const [target, setTarget] = useState("");
  const [context, setContext] = useState("");
  const [actor, setActor] = useState("APT nation-state");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!target) { setError("Specify a target."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const prompt = `You are a senior red team analyst. Generate a detailed threat scenario in JSON only (no markdown, no backticks).
Target: ${target}
Context: ${context || "unspecified"}
Threat actor type: ${actor}
Return ONLY a JSON object: {"scenario_title":"string","threat_actor":"string","objective":"string","attack_phases":[{"phase":"string","description":"string","techniques":["string"]}],"likely_entry_points":["string"],"key_vulnerabilities":["string"],"indicators_of_compromise":["string"],"recommended_mitigations":["string"],"risk_level":"LOW|MEDIUM|HIGH|CRITICAL"}`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setResult(JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim()));
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>🤖 Red Team Scenario Generator</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>AI generates realistic threat scenarios. <LiveBadge /></p>

      <Card>
        <Input label="🎯 Target" value={target} onChange={setTarget} placeholder="e.g. Nuclear power plant, pipeline infrastructure" />
        <Input label="📋 Context (optional)" value={context} onChange={setContext} placeholder="e.g. Legacy SCADA, recent layoffs" rows={2} />
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>👤 Threat Actor</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {actors.map(a => (
              <button key={a} onClick={() => setActor(a)}
                style={{ background: actor === a ? "#00ff9d" : "#1f2d45", color: actor === a ? "#0a0f1e" : "#9ca3af", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: actor === a ? 700 : 400 }}>{a}</button>
            ))}
          </div>
        </div>
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <Btn onClick={generate} disabled={loading}>{loading ? "⏳ Generating..." : "⚡ Generate Scenario"}</Btn>
      </Card>

      {result && (
        <>
          <Card style={{ borderColor: RC[result.risk_level] }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#e2e8f0" }}>{result.scenario_title}</div>
              <BADGE text={result.risk_level} color={result.risk_level === "CRITICAL" || result.risk_level === "HIGH" ? "red" : "yellow"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><span style={{ color: "#9ca3af", fontSize: 11 }}>THREAT ACTOR</span><br /><span style={{ color: "#ffd700" }}>{result.threat_actor}</span></div>
              <div><span style={{ color: "#9ca3af", fontSize: 11 }}>OBJECTIVE</span><br /><span style={{ color: "#e2e8f0", fontSize: 13 }}>{result.objective}</span></div>
            </div>
          </Card>

          <Card>
            <ST icon="⚔️" label="Attack Timeline" color="#4db8ff" />
            <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingBottom: 8, gap: 0 }}>
              {result.attack_phases?.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", flex: 1, minWidth: 140 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: i === 0 ? "#ff4d4d" : i === result.attack_phases.length - 1 ? "#b47fff" : "#1f2d45", borderRadius: 8, padding: "10px 12px", marginRight: 4 }}>
                      <div style={{ color: "#9ca3af", fontSize: 10 }}>PHASE {i + 1}</div>
                      <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 12, marginTop: 2 }}>{p.phase}</div>
                      <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}>{p.description?.substring(0, 70)}...</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                        {p.techniques?.slice(0, 2).map((t, j) => <BADGE key={j} text={t} color="blue" />)}
                      </div>
                    </div>
                    {i < result.attack_phases.length - 1 && <div style={{ textAlign: "center", color: "#ff4d4d", fontSize: 16, marginTop: 4 }}>→</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card><ST icon="🚪" label="Entry Points" color="#ff4d4d" />{result.likely_entry_points?.map((e, i) => <div key={i} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 4 }}>• {e}</div>)}</Card>
            <Card><ST icon="⚠️" label="Vulnerabilities" color="#ffd700" />{result.key_vulnerabilities?.map((v, i) => <div key={i} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 4 }}>• {v}</div>)}</Card>
            <Card><ST icon="🔎" label="IOCs" color="#ff9d00" />{result.indicators_of_compromise?.map((c, i) => <div key={i} style={{ color: "#e2e8f0", fontSize: 12, marginBottom: 4, fontFamily: "monospace" }}>• {c}</div>)}</Card>
            <Card><ST icon="🛡️" label="Mitigations" color="#00ff9d" />{result.recommended_mitigations?.map((m, i) => <div key={i} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 4 }}>• {m}</div>)}</Card>
          </div>
        </>
      )}
    </div>
  );
}
