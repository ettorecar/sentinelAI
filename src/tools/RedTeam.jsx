import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader } from "../components/shared";
import { RC } from "../constants";
import { useApiKey } from "../context/ApiKeyContext";

const ACTORS = ["APT nation-state", "Hacktivist group", "Insider threat", "Criminal syndicate", "Terrorist cell"];

function ActorBtn({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? "#00ff9d" : hovered ? "#00ff9d22" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? "#00ff9d" : "#9ca3af",
        border: `1px solid ${active ? "#00ff9d" : hovered ? "#00ff9d44" : "transparent"}`,
        borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 12,
        fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function BulletItem({ text, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        padding: "5px 8px",
        borderRadius: 5,
        background: hovered ? "#0f1a2e" : "transparent",
        transition: "background 0.15s",
        marginBottom: 4,
      }}
    >
      <span style={{ color, fontSize: 12, marginTop: 2, flexShrink: 0 }}>▸</span>
      <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

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
      <PageHeader icon="🤖" title="Red Team Scenario Generator" sub="AI-generated threat scenarios and attack paths for defensive planning." accent="#ff4d4d" badges={[{text:"AI Live",color:"#00ff9d"}]} />

      <Card>
        <Input label="🎯 Target" value={target} onChange={setTarget} placeholder="e.g. Nuclear power plant, pipeline infrastructure" />
        <Input label="📋 Context (optional)" value={context} onChange={setContext} placeholder="e.g. Legacy SCADA, recent layoffs, public-facing admin panel" rows={2} />
        <ST icon="👤" label="Threat Actor" color="#ff4d4d" />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {ACTORS.map(a => (
            <ActorBtn key={a} label={a} active={actor === a} onClick={() => setActor(a)} />
          ))}
        </div>
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <Btn onClick={generate} disabled={loading}>
          {loading ? "⏳ Generating..." : "⚡ Generate Scenario"}
        </Btn>
      </Card>

      {result && (
        <>
          {/* Scenario header */}
          <Card style={{ borderColor: RC[result.risk_level] + "55", borderLeft: `3px solid ${RC[result.risk_level]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>THREAT SCENARIO</div>
                <div style={{ fontWeight: 900, fontSize: 16, color: "#e2e8f0" }}>{result.scenario_title}</div>
              </div>
              <BADGE text={result.risk_level} color={result.risk_level === "CRITICAL" || result.risk_level === "HIGH" ? "red" : "yellow"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>THREAT ACTOR</div>
                <div style={{ color: "#ffd700", fontWeight: 600 }}>{result.threat_actor}</div>
              </div>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>OBJECTIVE</div>
                <div style={{ color: "#e2e8f0", fontSize: 13 }}>{result.objective}</div>
              </div>
            </div>
          </Card>

          {/* Attack timeline */}
          <Card>
            <ST icon="⚔️" label="Attack Timeline" color="#4db8ff" />
            <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingBottom: 8, gap: 0 }}>
              {result.attack_phases?.map((p, i) => {
                const isFirst = i === 0;
                const isLast = i === result.attack_phases.length - 1;
                const bg = isFirst ? "#1a0505" : isLast ? "#0d0a1a" : "#0d1626";
                const border = isFirst ? "#ff4d4d" : isLast ? "#b47fff" : "#1f2d45";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", flex: 1, minWidth: 145 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 12px", marginRight: 4, height: "100%", boxSizing: "border-box" }}>
                        <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 3 }}>PHASE {i + 1}</div>
                        <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 12, marginBottom: 4 }}>{p.phase}</div>
                        <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 7, lineHeight: 1.4 }}>{p.description?.substring(0, 70)}…</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {p.techniques?.slice(0, 2).map((t, j) => <BADGE key={j} text={t} color="blue" />)}
                        </div>
                      </div>
                      {i < result.attack_phases.length - 1 && (
                        <div style={{ textAlign: "center", color: "#ff4d4d", fontSize: 14, marginTop: 6 }}>→</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 4-grid details */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
            <Card>
              <ST icon="🚪" label="Entry Points" color="#ff4d4d" />
              {result.likely_entry_points?.map((e, i) => <BulletItem key={i} text={e} color="#ff4d4d" />)}
            </Card>
            <Card>
              <ST icon="⚠️" label="Key Vulnerabilities" color="#ffd700" />
              {result.key_vulnerabilities?.map((v, i) => <BulletItem key={i} text={v} color="#ffd700" />)}
            </Card>
            <Card>
              <ST icon="🔎" label="IOCs" color="#ff9d00" />
              {result.indicators_of_compromise?.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "4px 8px", marginBottom: 3 }}>
                  <span style={{ color: "#ff9d00", fontSize: 11, fontFamily: "monospace", marginTop: 2 }}>•</span>
                  <span style={{ color: "#e2e8f0", fontSize: 12, fontFamily: "monospace", lineHeight: 1.5 }}>{c}</span>
                </div>
              ))}
            </Card>
            <Card>
              <ST icon="🛡️" label="Mitigations" color="#00ff9d" />
              {result.recommended_mitigations?.map((m, i) => <BulletItem key={i} text={m} color="#00ff9d" />)}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
