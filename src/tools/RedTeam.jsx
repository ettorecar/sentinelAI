import { useState, useEffect } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { RC } from "../constants";
import { useApiKey } from "../context/ApiKeyContext";

const ACTORS = ["APT nation-state", "Hacktivist group", "Insider threat", "Criminal syndicate", "Terrorist cell"];

// F1 — MITRE ATT&CK 11 enterprise tactics
const MITRE_TACTICS = [
  "Initial Access", "Execution", "Persistence", "Privilege Escalation",
  "Defense Evasion", "Credential Access", "Discovery",
  "Lateral Movement", "Collection", "C2", "Exfiltration",
];

// F1 — Lockheed Martin Cyber Kill Chain
const KILL_CHAIN = [
  "Recon", "Weaponize", "Deliver", "Exploit", "Install", "C2", "Actions",
];
const KC_COLOR = ["#4a5568", "#ffd700", "#ff9d00", "#ff4d4d", "#ff0000", "#b47fff", "#ff4d4d"];

function ActorBtn({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      background: active ? "#00ff9d" : hovered ? "#00ff9d22" : "#1f2d45",
      color: active ? "#0a0f1e" : hovered ? "#00ff9d" : "#9ca3af",
      border: `1px solid ${active ? "#00ff9d" : hovered ? "#00ff9d44" : "transparent"}`,
      borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 12,
      fontWeight: active ? 700 : 400, transition: "background 0.15s, color 0.15s",
    }}>{label}</button>
  );
}

function BulletItem({ text, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 8px",
      borderRadius: 5, background: hovered ? "#0f1a2e" : "transparent", transition: "background 0.15s", marginBottom: 4,
    }}>
      <span style={{ color, fontSize: 12, marginTop: 2, flexShrink: 0 }}>▸</span>
      <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

// F1 — MITRE ATT&CK coverage heatmap
function MitreHeatmap({ mitreData }) {
  if (!mitreData) return null;
  const totalTechniques = Object.values(mitreData).reduce((s, t) => s + t.length, 0);
  const coveredTactics = Object.values(mitreData).filter(t => t.length > 0).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1 }}>MITRE ATT&CK COVERAGE</div>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ color: "#ff4d4d", fontSize: 10, fontWeight: 700 }}>{totalTechniques} techniques</span>
          <span style={{ color: "#9ca3af", fontSize: 10 }}>{coveredTactics}/{MITRE_TACTICS.length} tactics</span>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${MITRE_TACTICS.length}, 1fr)`, gap: 2, minWidth: 680 }}>
          {/* Tactic headers */}
          {MITRE_TACTICS.map(tactic => {
            const hasTech = (mitreData[tactic]?.length || 0) > 0;
            return (
              <div key={tactic} style={{
                background: hasTech ? "#ff4d4d18" : "#0d1626",
                border: `1px solid ${hasTech ? "#ff4d4d44" : "#1a2638"}`,
                borderRadius: "4px 4px 0 0", padding: "5px 3px", textAlign: "center",
              }}>
                <div style={{ color: hasTech ? "#ff4d4d" : "#2d3f55", fontSize: 6.5, letterSpacing: 0.4, lineHeight: 1.4, fontWeight: 700 }}>
                  {tactic.toUpperCase()}
                </div>
              </div>
            );
          })}
          {/* Technique cells per tactic */}
          {MITRE_TACTICS.map(tactic => {
            const techniques = mitreData[tactic] || [];
            const cellCount = Math.max(techniques.length, 1);
            return (
              <div key={tactic} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {techniques.slice(0, 5).map((tech, i) => (
                  <div key={i} style={{
                    background: "#ff4d4d1a", border: "1px solid #ff4d4d33",
                    borderRadius: 3, padding: "3px 3px", textAlign: "center",
                  }}>
                    <div style={{ color: "#ff9d8a", fontSize: 6, lineHeight: 1.3 }}>
                      {tech.length > 16 ? tech.slice(0, 15) + "…" : tech}
                    </div>
                  </div>
                ))}
                {techniques.length === 0 && (
                  <div style={{ background: "#0a1020", border: "1px solid #111d2e", borderRadius: 3, padding: "5px 3px", textAlign: "center" }}>
                    <div style={{ color: "#1a2638", fontSize: 8 }}>—</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 10, background: "#ff4d4d18", border: "1px solid #ff4d4d33", borderRadius: 2 }} />
          <span style={{ color: "#6b7a8d", fontSize: 9 }}>Covered by scenario</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 10, height: 10, background: "#0a1020", border: "1px solid #111d2e", borderRadius: 2 }} />
          <span style={{ color: "#6b7a8d", fontSize: 9 }}>Tactic not used</span>
        </div>
      </div>
    </div>
  );
}

// F1 — Animated kill-chain phase flow
function KillChainFlow({ phases }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % KILL_CHAIN.length), 1100);
    return () => clearInterval(t);
  }, []);

  const covered = new Set((phases || []).map(p => p.kill_chain_stage).filter(Boolean));

  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>KILL-CHAIN PHASE FLOW</div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, minWidth: 560 }}>
          {KILL_CHAIN.map((stage, i) => {
            const isActive = i === step;
            const isCovered = covered.has(stage) || covered.has(stage === "C2" ? "Command and Control" : stage);
            const color = KC_COLOR[i];
            return (
              <div key={stage} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{
                  flex: 1, background: isActive ? `${color}33` : isCovered ? `${color}14` : "#0d1626",
                  border: `1px solid ${isActive ? color : isCovered ? `${color}55` : "#1f2d45"}`,
                  borderRadius: 6, padding: "10px 6px", textAlign: "center",
                  transition: "all 0.35s ease",
                  boxShadow: isActive ? `0 0 14px ${color}44` : "none",
                }}>
                  <div style={{ color: isActive ? color : isCovered ? `${color}cc` : "#2d3f55", fontSize: 8, fontWeight: 800, letterSpacing: 0.5, marginBottom: 3 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ color: isActive ? color : isCovered ? "#e2e8f0" : "#4a5568", fontSize: 9, fontWeight: isActive ? 800 : 600, lineHeight: 1.3 }}>
                    {stage}
                  </div>
                  {isCovered && <div style={{ color: color, fontSize: 8, marginTop: 4 }}>●</div>}
                </div>
                {i < KILL_CHAIN.length - 1 && (
                  <div style={{ color: i === step ? "#ff4d4d" : "#1f2d45", fontSize: 13, padding: "0 2px", transition: "color 0.35s", flexShrink: 0 }}>→</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ color: "#2d3f55", fontSize: 9, marginTop: 6 }}>
        ● = mapped from scenario phases · animated sweep shows kill-chain progression
      </div>
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
  const { stamp } = useLastAnalysis("redteam");
  function handleKey(e) { if (e.ctrlKey && e.key === "Enter") generate(); }

  async function generate() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!target) { setError("Specify a target."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const prompt = `You are a senior red team analyst. Generate a detailed threat scenario in JSON only (no markdown, no backticks).
Target: ${target}
Context: ${context || "unspecified"}
Threat actor type: ${actor}
Return ONLY a JSON object:
{"scenario_title":"string","threat_actor":"string","objective":"string","attack_phases":[{"phase":"string","description":"string","techniques":["string"],"kill_chain_stage":"Recon|Weaponize|Deliver|Exploit|Install|C2|Actions"}],"likely_entry_points":["string"],"key_vulnerabilities":["string"],"indicators_of_compromise":["string"],"recommended_mitigations":["string"],"risk_level":"LOW|MEDIUM|HIGH|CRITICAL","mitre_tactics":{"Initial Access":["technique names"],"Execution":["technique names"],"Persistence":["technique names"],"Privilege Escalation":["technique names"],"Defense Evasion":["technique names"],"Credential Access":["technique names"],"Discovery":["technique names"],"Lateral Movement":["technique names"],"Collection":["technique names"],"C2":["technique names"],"Exfiltration":["technique names"]}}
For mitre_tactics, list only the techniques actually used in the scenario (0-4 per tactic). Use short technique names like "Spearphishing", "PowerShell", "Mimikatz", "Pass-the-Hash", etc.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1800, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setResult(JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim()));
      stamp();
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader icon="🤖" title="Red Team Scenario Generator" sub="AI-generated threat scenarios and attack paths for defensive planning." accent="#ff4d4d" dataMode="ai" />

      <Card>
        <Input label="🎯 Target" value={target} onChange={setTarget} placeholder="e.g. Nuclear power plant, pipeline infrastructure" maxLength={150} onClear={() => setTarget("")} onKeyDown={handleKey} />
        <Input label="📋 Context (optional)" value={context} onChange={setContext} placeholder="e.g. Legacy SCADA, recent layoffs, public-facing admin panel" rows={2} maxLength={500} onKeyDown={handleKey} hint="Ctrl+Enter per generare" />
        <ST icon="👤" label="Threat Actor" color="#ff4d4d" />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {ACTORS.map(a => (
            <ActorBtn key={a} label={a} active={actor === a} onClick={() => setActor(a)} />
          ))}
        </div>
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn onClick={generate} disabled={loading}>{loading ? "⏳ Generating..." : "⚡ Generate Scenario"}</Btn>
          <LastAnalysisTag toolId="redteam" />
        </div>
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
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ExportBtn data={result} filename={`sentinel-redteam-${target.replace(/\s/g, "-").slice(0, 20)}`} />
                <BADGE text={result.risk_level} color={result.risk_level === "CRITICAL" || result.risk_level === "HIGH" ? "red" : "yellow"} />
              </div>
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

          {/* F1 — Kill-chain animated flow */}
          <Card>
            <ST icon="⚔️" label="Kill-Chain Phase Flow" color="#ff4d4d" sub="Animated progression · mapped from scenario" style={{ marginBottom: 14 }} />
            <KillChainFlow phases={result.attack_phases} />
          </Card>

          {/* F1 — MITRE ATT&CK heatmap */}
          {result.mitre_tactics && (
            <Card>
              <ST icon="🗺️" label="MITRE ATT&CK Heatmap" color="#ff9d00" sub="Techniques identified per tactic" style={{ marginBottom: 14 }} />
              <MitreHeatmap mitreData={result.mitre_tactics} />
            </Card>
          )}

          {/* Attack timeline */}
          <Card>
            <ST icon="📋" label="Attack Timeline" color="#4db8ff" />
            <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingBottom: 8, gap: 0 }}>
              {result.attack_phases?.map((p, i) => {
                const isFirst = i === 0, isLast = i === result.attack_phases.length - 1;
                const bg = isFirst ? "#1a0505" : isLast ? "#0d0a1a" : "#0d1626";
                const border = isFirst ? "#ff4d4d" : isLast ? "#b47fff" : "#1f2d45";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", flex: 1, minWidth: 145 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 12px", marginRight: 4 }}>
                        <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 3 }}>PHASE {i + 1}</div>
                        <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 12, marginBottom: 4 }}>{p.phase}</div>
                        <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 7, lineHeight: 1.4 }}>{p.description?.substring(0, 70)}…</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {p.techniques?.slice(0, 2).map((t, j) => <BADGE key={j} text={t} color="blue" />)}
                        </div>
                        {p.kill_chain_stage && (
                          <div style={{ marginTop: 5 }}>
                            <BADGE text={p.kill_chain_stage} color="orange" />
                          </div>
                        )}
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
