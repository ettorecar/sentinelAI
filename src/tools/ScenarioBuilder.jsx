import { useState } from "react";
import { BADGE, Card, Btn, ST, PageHeader, LiveBadge } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

const ACCENT = "#22d3ee";

const REGIONS = [
  "Middle East", "Eastern Europe", "Indo-Pacific", "Sub-Saharan Africa",
  "North Africa", "Central Asia", "Arctic / High North", "Global / Multi-Region", "Cyber Domain",
];

const CRISIS_TYPES = [
  { id: "conflict",  label: "Regional Conflict", icon: "💥" },
  { id: "hybrid",    label: "Hybrid Warfare",     icon: "⚔️" },
  { id: "energy",    label: "Energy Crisis",      icon: "⚡" },
  { id: "pandemic",  label: "Pandemic / Bio",     icon: "🦠" },
  { id: "cyber",     label: "Cyber Campaign",     icon: "🔐" },
  { id: "climate",   label: "Climate / Disaster", icon: "🌪️" },
];

const TIMEFRAMES = ["T+24h", "T+72h", "T+7d", "T+30d", "T+6m", "T+1y"];

const ACTOR_TYPES = ["Nation-State", "Non-State Actor", "Proxy Force", "Criminal Syndicate", "Hacktivist", "IGO/NGO"];

const CAPABILITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const DOMAINS = [
  { id: "kinetic",    label: "Kinetic",      icon: "💥", color: "#ff4d4d" },
  { id: "cyber",      label: "Cyber",        icon: "🔐", color: "#22d3ee" },
  { id: "maritime",   label: "Maritime",     icon: "🌊", color: "#4db8ff" },
  { id: "energy",     label: "Energy",       icon: "⚡", color: "#ff9d00" },
  { id: "bio",        label: "Bio-Threat",   icon: "🦠", color: "#00ff9d" },
  { id: "disinfo",    label: "Disinfo",      icon: "📰", color: "#b47fff" },
  { id: "diplomatic", label: "Diplomatic",   icon: "🏛️", color: "#ffd700" },
  { id: "economic",   label: "Economic",     icon: "📈", color: "#f97316" },
];

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const TIMINGS = ["T+0h", "T+6h", "T+12h", "T+24h", "T+48h", "T+72h", "T+7d", "T+14d", "T+30d"];

async function callClaude(apiKey, prompt, maxTokens = 2800) {
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
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

function capColor(c) {
  return c === "CRITICAL" ? "#ff0000" : c === "HIGH" ? "#ff4d4d" : c === "MEDIUM" ? "#ffd700" : "#00ff9d";
}
function sevColor(s) {
  return s === "CRITICAL" ? "#ff0000" : s === "HIGH" ? "#ff4d4d" : s === "MEDIUM" ? "#ffd700" : "#00ff9d";
}
function sevBadge(s) {
  return s === "CRITICAL" || s === "HIGH" ? "red" : s === "MEDIUM" ? "yellow" : "green";
}
function domainInfo(id) {
  return DOMAINS.find(d => d.id === (id || "").toLowerCase()) || { label: id, icon: "•", color: "#9ca3af" };
}

function Stepper({ step }) {
  const steps = ["Scenario Setup", "Domain Events", "AI Analysis"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 4 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: i + 1 < step ? ACCENT : i + 1 === step ? "#0d1626" : "#1f2d45",
            color: i + 1 < step ? "#0a0f1e" : i + 1 === step ? ACCENT : "#555",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 13, flexShrink: 0,
            border: i + 1 === step ? `2px solid ${ACCENT}` : "2px solid transparent",
            boxShadow: i + 1 === step ? `0 0 10px ${ACCENT}55` : "none",
          }}>
            {i + 1 < step ? "✓" : i + 1}
          </div>
          <span style={{
            color: i + 1 === step ? ACCENT : i + 1 < step ? "#9ca3af" : "#555",
            fontSize: 12, fontWeight: i + 1 === step ? 700 : 400,
            marginLeft: 7, marginRight: 8, whiteSpace: "nowrap",
          }}>{s}</span>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, background: i + 1 < step ? ACCENT : "#1f2d45", minWidth: 16, transition: "background 0.3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function SelectBtn({ options, value, onChange, colorFn }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(o => {
        const id = typeof o === "string" ? o : o.id;
        const label = typeof o === "string" ? o : `${o.icon || ""} ${o.label}`;
        const active = value === id;
        const accent = colorFn ? colorFn(id) : ACCENT;
        return (
          <SelectOption key={id} id={id} label={label} active={active} accent={accent} onChange={onChange} />
        );
      })}
    </div>
  );
}

function SelectOption({ id, label, active, accent, onChange }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onChange(id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? accent : hovered ? accent + "22" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? accent : "#9ca3af",
        border: `1px solid ${active ? accent : hovered ? accent + "44" : "transparent"}`,
        borderRadius: 6, padding: "6px 12px",
        cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, whiteSpace: "nowrap",
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export default function ScenarioBuilder() {
  const [apiKey] = useApiKey();
  const [step, setStep] = useState(1);

  // Step 1
  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("Middle East");
  const [crisisType, setCrisisType] = useState("conflict");
  const [timeframe, setTimeframe] = useState("T+7d");
  const [actors, setActors] = useState([{ name: "", type: "Nation-State", capability: "HIGH", intent: "" }]);

  // Step 2
  const [events, setEvents] = useState([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ domain: "kinetic", title: "", description: "", severity: "HIGH", timing: "T+0h" });

  // Step 3
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Actor helpers ──
  function addActor() {
    setActors(p => [...p, { name: "", type: "Nation-State", capability: "HIGH", intent: "" }]);
  }
  function removeActor(i) {
    setActors(p => p.filter((_, idx) => idx !== i));
  }
  function updateActor(i, field, value) {
    setActors(p => p.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  }

  // ── Event helpers ──
  function confirmAddEvent() {
    if (!newEvent.title.trim()) return;
    setEvents(p => [...p, { ...newEvent, id: Date.now() }]);
    setNewEvent({ domain: "kinetic", title: "", description: "", severity: "HIGH", timing: "T+0h" });
    setShowAddEvent(false);
  }
  function removeEvent(id) {
    setEvents(p => p.filter(e => e.id !== id));
  }

  const canStep2 = title.trim() && actors.some(a => a.name.trim());
  const canAnalyze = events.length > 0;

  // ── AI Analysis ──
  async function runAnalysis() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    setError(""); setLoading(true); setAnalysis(null);

    const actorDesc = actors
      .filter(a => a.name)
      .map(a => `${a.name} (${a.type}, capability: ${a.capability}${a.intent ? `, intent: ${a.intent}` : ""})`)
      .join("; ");

    const eventDesc = events
      .map(e => {
        const d = DOMAINS.find(d => d.id === e.domain);
        return `[${e.timing}] ${d?.label || e.domain}: ${e.title} — severity: ${e.severity}${e.description ? `. ${e.description}` : ""}`;
      })
      .join("\n");

    const crisis = CRISIS_TYPES.find(c => c.id === crisisType)?.label || crisisType;

    const prompt = `You are a senior strategic analyst at a defence intelligence organization. Produce a comprehensive multi-domain scenario analysis in JSON only (no markdown, no backticks).

SCENARIO: "${title}"
Region: ${region}
Crisis Type: ${crisis}
Timeframe: ${timeframe}
Threat Actors: ${actorDesc}

Domain Events:
${eventDesc}

Return ONLY this JSON structure:
{
  "scenario_overview": "2-3 sentence strategic overview of the scenario",
  "threat_level": "CRITICAL|HIGH|MEDIUM|LOW",
  "cascade_effects": [
    {
      "trigger_domain": "domain name (e.g. Kinetic, Cyber, Maritime)",
      "trigger_event": "brief trigger description",
      "cascades_to": "affected domain name",
      "effect": "cascade effect description",
      "probability": "HIGH|MEDIUM|LOW",
      "time_to_impact": "e.g. T+6h, T+24h, T+7d"
    }
  ],
  "escalation_ladder": [
    {
      "level": 1,
      "label": "level short name",
      "description": "what happens at this level",
      "trigger": "what causes escalation to the next level",
      "current": true
    }
  ],
  "second_order_effects": [
    {"domain": "domain name", "effect": "effect description", "severity": "CRITICAL|HIGH|MEDIUM|LOW"}
  ],
  "key_inflection_points": [
    {"timing": "T+Xh or T+Xd", "event": "decision point or tipping event", "outcome_if_missed": "consequence of inaction"}
  ],
  "response_options": [
    {
      "type": "Diplomatic|Military|Cyber|Economic|Information",
      "action": "specific actionable response",
      "priority": "IMMEDIATE|SHORT_TERM|LONG_TERM",
      "effectiveness": "HIGH|MEDIUM|LOW",
      "risk": "HIGH|MEDIUM|LOW"
    }
  ],
  "worst_case": "worst case outcome in 1-2 sentences",
  "best_case": "best case outcome if responses are timely in 1-2 sentences",
  "strategic_assessment": "3-4 sentence analyst assessment with key recommendations",
  "confidence": "HIGH|MEDIUM|LOW"
}`;

    try {
      const raw = await callClaude(apiKey, prompt, 2800);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setAnalysis(parsed);
    } catch (e) {
      setError("Error: " + e.message);
    }
    setLoading(false);
  }

  // Timeline grouping
  const eventsByTiming = TIMINGS.reduce((acc, t) => {
    const evs = events.filter(e => e.timing === t);
    if (evs.length) acc[t] = evs;
    return acc;
  }, {});
  const timelineCols = TIMINGS.filter(t => eventsByTiming[t]);

  const crisisLabel = CRISIS_TYPES.find(c => c.id === crisisType)?.label || crisisType;

  return (
    <div>
      <PageHeader icon="🎯" title="Scenario Builder" sub="Multi-domain crisis scenarios — cascade effects, escalation paths and strategic responses." accent={ACCENT} badges={apiKey ? [{text:"AI Live",color:"#00ff9d"}] : [{text:"API Key Required",color:"#ffd700"}]} />

      <Stepper step={step} />

      {/* ═══════════════════════════════════════════
          STEP 1 — SCENARIO SETUP
      ═══════════════════════════════════════════ */}
      {step === 1 && (
        <>
          <Card>
            <ST icon="📋" label="Scenario Setup" color={ACCENT} />
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>📝 Scenario Title</div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Strait of Hormuz Blockade + Coordinated Cyber Campaign"
                style={{ width: "100%", background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 6, padding: 10, color: "#e2e8f0", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>🌍 Region</div>
              <SelectBtn options={REGIONS} value={region} onChange={setRegion} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>⚡ Crisis Type</div>
              <SelectBtn options={CRISIS_TYPES} value={crisisType} onChange={setCrisisType} />
            </div>

            <div>
              <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>⏱ Scenario Timeframe</div>
              <SelectBtn options={TIMEFRAMES} value={timeframe} onChange={setTimeframe} />
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <ST icon="👤" label="Threat Actors" color="#ff4d4d" />
              <button onClick={addActor} style={{ background: "#1f2d45", color: ACCENT, border: `1px solid ${ACCENT}55`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>+ Add Actor</button>
            </div>

            {actors.map((a, i) => (
              <div key={i} style={{ background: "#0d1626", borderRadius: 8, padding: 14, marginBottom: 10, border: "1px solid #1f2d45" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ color: "#9ca3af", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>ACTOR {i + 1}</span>
                  {actors.length > 1 && (
                    <button onClick={() => removeActor(i)} style={{ background: "none", border: "none", color: "#ff4d4d88", cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>NAME / DESIGNATION</div>
                    <input value={a.name} onChange={e => updateActor(i, "name", e.target.value)} placeholder="e.g. Iran IRGC"
                      style={{ width: "100%", background: "#111827", border: "1px solid #1f2d45", borderRadius: 5, padding: "8px 10px", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>ACTOR TYPE</div>
                    <select value={a.type} onChange={e => updateActor(i, "type", e.target.value)}
                      style={{ width: "100%", background: "#111827", border: "1px solid #1f2d45", borderRadius: 5, padding: "8px 10px", color: "#e2e8f0", fontSize: 13 }}>
                      {ACTOR_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>CAPABILITY</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {CAPABILITIES.map(c => (
                        <button key={c} onClick={() => updateActor(i, "capability", c)} style={{
                          flex: 1, background: a.capability === c ? capColor(c) : "#1f2d45",
                          color: a.capability === c ? "#0a0f1e" : "#9ca3af",
                          border: "none", borderRadius: 4, padding: "5px 0", cursor: "pointer", fontSize: 10, fontWeight: 700,
                        }}>{c[0]}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingRight: 2 }}>
                      {CAPABILITIES.map(c => <span key={c} style={{ color: "#555", fontSize: 9, flex: 1, textAlign: "center" }}>{c[0]}</span>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>STRATEGIC INTENT</div>
                    <input value={a.intent} onChange={e => updateActor(i, "intent", e.target.value)} placeholder="e.g. Disrupt oil exports"
                      style={{ width: "100%", background: "#111827", border: "1px solid #1f2d45", borderRadius: 5, padding: "8px 10px", color: "#e2e8f0", fontSize: 12, boxSizing: "border-box" }} />
                  </div>
                </div>
              </div>
            ))}
          </Card>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={() => setStep(2)} disabled={!canStep2} color={ACCENT}>
              Next: Domain Events →
            </Btn>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          STEP 2 — DOMAIN EVENTS
      ═══════════════════════════════════════════ */}
      {step === 2 && (
        <>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <ST icon="🗓️" label="Domain Events" color={ACCENT} />
              <button onClick={() => setShowAddEvent(true)} style={{
                background: ACCENT, color: "#0a0f1e", border: "none", borderRadius: 6,
                padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700,
              }}>+ Add Event</button>
            </div>

            {events.length === 0 && !showAddEvent && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: 14 }}>No events yet. Add domain events to build your scenario timeline.</div>
                <button onClick={() => setShowAddEvent(true)} style={{
                  marginTop: 14, background: "#1f2d45", color: ACCENT, border: `1px solid ${ACCENT}55`,
                  borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700,
                }}>+ Add First Event</button>
              </div>
            )}

            {events.map((e) => {
              const d = domainInfo(e.domain);
              return (
                <div key={e.id} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  background: "#0d1626", borderRadius: 7, padding: "10px 12px",
                  marginBottom: 7, borderLeft: `3px solid ${d.color}`,
                }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{d.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ color: d.color, fontSize: 11, fontWeight: 700 }}>{d.label}</span>
                      <BADGE text={e.timing} color="blue" />
                      <BADGE text={e.severity} color={sevBadge(e.severity)} />
                    </div>
                    <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                    {e.description && <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>{e.description}</div>}
                  </div>
                  <button onClick={() => removeEvent(e.id)} style={{
                    background: "none", border: "none", color: "#ff4d4d44",
                    cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1,
                    transition: "color 0.2s",
                  }} onMouseEnter={ev => ev.target.style.color = "#ff4d4d"} onMouseLeave={ev => ev.target.style.color = "#ff4d4d44"}>✕</button>
                </div>
              );
            })}

            {/* Add event panel */}
            {showAddEvent && (
              <div style={{ background: "#0a0f1e", borderRadius: 8, padding: 16, border: `1px solid ${ACCENT}44`, marginTop: 10 }}>
                <div style={{ color: ACCENT, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>➕ New Domain Event</div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6 }}>DOMAIN</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {DOMAINS.map(d => (
                      <button key={d.id} onClick={() => setNewEvent(p => ({ ...p, domain: d.id }))} style={{
                        background: newEvent.domain === d.id ? d.color : "#1f2d45",
                        color: newEvent.domain === d.id ? "#0a0f1e" : "#9ca3af",
                        border: "none", borderRadius: 5, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: newEvent.domain === d.id ? 700 : 400,
                      }}>{d.icon} {d.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6 }}>SEVERITY</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {SEVERITIES.map(s => (
                        <button key={s} onClick={() => setNewEvent(p => ({ ...p, severity: s }))} style={{
                          flex: 1, background: newEvent.severity === s ? sevColor(s) : "#1f2d45",
                          color: newEvent.severity === s ? "#0a0f1e" : "#9ca3af",
                          border: "none", borderRadius: 4, padding: "5px 0", cursor: "pointer", fontSize: 10, fontWeight: 700,
                        }}>{s[0]}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      {SEVERITIES.map(s => <span key={s} style={{ color: "#555", fontSize: 9, flex: 1, textAlign: "center" }}>{s[0]}</span>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6 }}>TIMING</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {TIMINGS.map(t => (
                        <button key={t} onClick={() => setNewEvent(p => ({ ...p, timing: t }))} style={{
                          background: newEvent.timing === t ? ACCENT : "#1f2d45",
                          color: newEvent.timing === t ? "#0a0f1e" : "#9ca3af",
                          border: "none", borderRadius: 4, padding: "4px 7px", cursor: "pointer", fontSize: 10, fontWeight: newEvent.timing === t ? 700 : 400,
                        }}>{t}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 5 }}>EVENT TITLE</div>
                  <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Mine-laying operation in Strait of Hormuz"
                    onKeyDown={e => e.key === "Enter" && confirmAddEvent()}
                    style={{ width: "100%", background: "#111827", border: "1px solid #1f2d45", borderRadius: 5, padding: "9px 10px", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 5 }}>DESCRIPTION <span style={{ color: "#555" }}>(optional)</span></div>
                  <textarea value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                    placeholder="Additional context, method, or source..."
                    rows={2} style={{ width: "100%", background: "#111827", border: "1px solid #1f2d45", borderRadius: 5, padding: "9px 10px", color: "#e2e8f0", fontSize: 12, resize: "vertical", boxSizing: "border-box" }} />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={confirmAddEvent} disabled={!newEvent.title.trim()} color={ACCENT}>Add Event</Btn>
                  <Btn onClick={() => setShowAddEvent(false)} color="#4a5568" size="sm">Cancel</Btn>
                </div>
              </div>
            )}
          </Card>

          {/* Timeline */}
          {timelineCols.length > 0 && (
            <Card>
              <ST icon="📅" label="Scenario Timeline" color={ACCENT} />
              <div style={{ overflowX: "auto", paddingBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "stretch", gap: 2, minWidth: "max-content" }}>
                  {timelineCols.map((t, colIdx) => {
                    const evs = eventsByTiming[t];
                    return (
                      <div key={t} style={{ display: "flex", alignItems: "stretch", minWidth: 148 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ background: "#0d1626", borderRadius: 6, padding: "8px 10px", marginRight: 2, height: "100%", boxSizing: "border-box" }}>
                            <div style={{ color: ACCENT, fontSize: 11, fontWeight: 700, marginBottom: 7, borderBottom: `1px solid ${ACCENT}22`, paddingBottom: 5 }}>{t}</div>
                            {evs.map((e, j) => {
                              const d = domainInfo(e.domain);
                              return (
                                <div key={j} style={{ marginBottom: j < evs.length - 1 ? 8 : 0 }}>
                                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                    <span style={{ fontSize: 10 }}>{d.icon}</span>
                                    <span style={{ color: d.color, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>{d.label}</span>
                                  </div>
                                  <div style={{ color: "#e2e8f0", fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>
                                    {e.title.length > 42 ? e.title.substring(0, 42) + "…" : e.title}
                                  </div>
                                  <div style={{ width: "100%", height: 2, borderRadius: 1, background: sevColor(e.severity), marginTop: 3, opacity: 0.7 }} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {colIdx < timelineCols.length - 1 && (
                          <div style={{ display: "flex", alignItems: "center", padding: "0 2px" }}>
                            <span style={{ color: ACCENT, fontSize: 14, opacity: 0.6 }}>›</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DOMAINS.filter(d => events.some(e => e.domain === d.id)).map(d => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                    <span style={{ color: "#9ca3af", fontSize: 11 }}>{d.icon} {d.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Btn onClick={() => setStep(1)} color="#4a5568" size="sm">← Back</Btn>
            <Btn onClick={() => setStep(3)} disabled={!canAnalyze} color={ACCENT}>Analyze Scenario →</Btn>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          STEP 3 — AI ANALYSIS
      ═══════════════════════════════════════════ */}
      {step === 3 && (
        <>
          {!analysis && (
            <Card>
              <ST icon="🧠" label="AI Scenario Analysis" color={ACCENT} />

              {/* Summary card */}
              <div style={{ background: "#0d1626", borderRadius: 8, padding: 14, marginBottom: 18, border: `1px solid ${ACCENT}22` }}>
                <div style={{ color: "#9ca3af", fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>SCENARIO BRIEF</div>
                <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{title}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <BADGE text={region} color="blue" />
                  <BADGE text={crisisLabel} color={ACCENT} />
                  <BADGE text={timeframe} color="gray" />
                  <BADGE text={`${actors.filter(a => a.name).length} actor${actors.filter(a => a.name).length !== 1 ? "s" : ""}`} color="yellow" />
                  <BADGE text={`${events.length} event${events.length !== 1 ? "s" : ""}`} color="orange" />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DOMAINS.filter(d => events.some(e => e.domain === d.id)).map(d => (
                    <span key={d.id} style={{ background: d.color + "22", color: d.color, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>{d.icon} {d.label}</span>
                  ))}
                </div>
              </div>

              {error && <div style={{ color: "#ff4d4d", marginBottom: 12, fontSize: 13 }}>⚠ {error}</div>}
              {!apiKey && (
                <div style={{ color: "#ff9d00", fontSize: 13, marginBottom: 14, background: "#1a0e0022", border: "1px solid #ff9d0044", borderRadius: 6, padding: "10px 12px" }}>
                  ⚠ Set your Anthropic API key in the banner at the top to run the analysis.
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn onClick={runAnalysis} disabled={loading || !apiKey} color={ACCENT}>
                  {loading ? "⏳ Analyzing Scenario..." : "🧠 Run AI Analysis"}
                </Btn>
                <Btn onClick={() => setStep(2)} color="#4a5568" size="sm">← Back to Events</Btn>
              </div>
            </Card>
          )}

          {analysis && (
            <>
              {/* Report header */}
              <Card style={{ borderColor: ACCENT, borderWidth: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 10, fontFamily: "monospace", marginBottom: 4, letterSpacing: 1 }}>
                      SENTINEL · SCENARIO ANALYSIS
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: "#e2e8f0", marginBottom: 8 }}>{title}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <BADGE text={region} color="blue" />
                      <BADGE text={crisisLabel} color={ACCENT} />
                      <BADGE text={timeframe} color="gray" />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
                    <BADGE text={`THREAT: ${analysis.threat_level}`} color={analysis.threat_level === "CRITICAL" || analysis.threat_level === "HIGH" ? "red" : "yellow"} />
                    <BADGE text={`Confidence: ${analysis.confidence}`} color={analysis.confidence === "HIGH" ? "green" : analysis.confidence === "MEDIUM" ? "yellow" : "red"} />
                    <LiveBadge />
                  </div>
                </div>
                <div style={{ background: "#0d1626", borderRadius: 8, padding: 14, borderLeft: `3px solid ${ACCENT}` }}>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6, letterSpacing: 1 }}>STRATEGIC OVERVIEW</div>
                  <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.75 }}>{analysis.scenario_overview}</div>
                </div>
              </Card>

              {/* Cascade effects */}
              <Card>
                <ST icon="🔗" label="Cascade Effects" color={ACCENT} />
                {analysis.cascade_effects?.map((c, i) => {
                  const from = domainInfo(c.trigger_domain?.toLowerCase());
                  const to = domainInfo(c.cascades_to?.toLowerCase());
                  return (
                    <div key={i} style={{ background: "#0d1626", borderRadius: 7, padding: "10px 14px", marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ textAlign: "center", minWidth: 90 }}>
                        <div style={{ color: from.color, fontSize: 18 }}>{from.icon}</div>
                        <div style={{ color: from.color, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>{c.trigger_domain}</div>
                        <div style={{ color: ACCENT, fontSize: 16, margin: "3px 0" }}>↓</div>
                        <div style={{ color: to.color, fontSize: 18 }}>{to.icon}</div>
                        <div style={{ color: to.color, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>{c.cascades_to}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 5, marginBottom: 5, flexWrap: "wrap" }}>
                          <span style={{ color: "#9ca3af", fontSize: 11, fontStyle: "italic" }}>{c.trigger_event}</span>
                          <BADGE text={`P: ${c.probability}`} color={c.probability === "HIGH" ? "red" : c.probability === "MEDIUM" ? "yellow" : "green"} />
                          <BADGE text={c.time_to_impact} color="blue" />
                        </div>
                        <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.55 }}>{c.effect}</div>
                      </div>
                    </div>
                  );
                })}
              </Card>

              {/* Escalation ladder */}
              <Card>
                <ST icon="📈" label="Escalation Ladder" color="#ff4d4d" />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {analysis.escalation_ladder?.map((lvl, i) => (
                    <div key={i} style={{
                      background: lvl.current ? "#1a0808" : "#0d1626",
                      border: `1px solid ${lvl.current ? "#ff4d4d" : "#1f2d45"}`,
                      borderRadius: 7, padding: "11px 14px",
                      display: "flex", gap: 12, alignItems: "flex-start",
                      boxShadow: lvl.current ? "0 0 12px #ff4d4d22" : "none",
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: lvl.current ? "#ff4d4d" : "#1f2d45",
                        color: lvl.current ? "#fff" : "#555",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 13, flexShrink: 0,
                      }}>{lvl.level}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ color: lvl.current ? "#ff4d4d" : "#e2e8f0", fontWeight: 700, fontSize: 13 }}>{lvl.label}</span>
                          {lvl.current && <BADGE text="◉ CURRENT LEVEL" color="red" />}
                        </div>
                        <div style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.55, marginBottom: lvl.trigger ? 4 : 0 }}>{lvl.description}</div>
                        {lvl.trigger && <div style={{ color: "#ffd70088", fontSize: 11 }}>⚡ Escalation trigger: {lvl.trigger}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Second-order + inflection points */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
                <Card style={{ marginBottom: 0 }}>
                  <ST icon="🌊" label="Second-Order Effects" color="#ffd700" />
                  {analysis.second_order_effects?.map((e, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7, background: "#0d1626", borderRadius: 5, padding: "8px 10px" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: sevColor(e.severity), marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <div style={{ color: "#ffd700", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{e.domain}</div>
                        <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.45 }}>{e.effect}</div>
                      </div>
                      <BADGE text={e.severity[0]} color={sevBadge(e.severity)} />
                    </div>
                  ))}
                </Card>

                <Card style={{ marginBottom: 0 }}>
                  <ST icon="⏱" label="Key Inflection Points" color="#ff9d00" />
                  {analysis.key_inflection_points?.map((p, i) => (
                    <div key={i} style={{ marginBottom: 8, background: "#0d1626", borderRadius: 5, padding: "9px 10px", borderLeft: "2px solid #ff9d00" }}>
                      <div style={{ marginBottom: 3 }}><BADGE text={p.timing} color="orange" /></div>
                      <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{p.event}</div>
                      <div style={{ color: "#ff4d4d", fontSize: 11 }}>↳ If missed: {p.outcome_if_missed}</div>
                    </div>
                  ))}
                </Card>
              </div>

              {/* Response options */}
              <Card style={{ marginTop: 14 }}>
                <ST icon="🛡️" label="Response Options" color="#00ff9d" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 9 }}>
                  {analysis.response_options?.map((r, i) => {
                    const typeColor = r.type === "Military" ? "red" : r.type === "Diplomatic" ? "blue" : r.type === "Cyber" ? ACCENT : r.type === "Economic" ? "orange" : "yellow";
                    return (
                      <div key={i} style={{ background: "#0d1626", borderRadius: 7, padding: 12, border: "1px solid #1f2d45" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, flexWrap: "wrap", gap: 4 }}>
                          <BADGE text={r.type} color={typeColor} />
                          <BADGE text={r.priority} color={r.priority === "IMMEDIATE" ? "red" : r.priority === "SHORT_TERM" ? "yellow" : "green"} />
                        </div>
                        <div style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>{r.action}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ color: "#9ca3af", fontSize: 10 }}>Eff:</span>
                          <BADGE text={r.effectiveness} color={r.effectiveness === "HIGH" ? "green" : r.effectiveness === "MEDIUM" ? "yellow" : "red"} />
                          <span style={{ color: "#9ca3af", fontSize: 10, marginLeft: 2 }}>Risk:</span>
                          <BADGE text={r.risk} color={r.risk === "HIGH" ? "red" : r.risk === "MEDIUM" ? "yellow" : "green"} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Outcomes */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginTop: 14 }}>
                <Card style={{ marginBottom: 0, borderColor: "#ff4d4d33" }}>
                  <ST icon="⛔" label="Worst Case" color="#ff4d4d" />
                  <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.75 }}>{analysis.worst_case}</div>
                </Card>
                <Card style={{ marginBottom: 0, borderColor: "#00ff9d33" }}>
                  <ST icon="✅" label="Best Case" color="#00ff9d" />
                  <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.75 }}>{analysis.best_case}</div>
                </Card>
              </div>

              {/* Strategic assessment */}
              <Card style={{ marginTop: 14, borderColor: `${ACCENT}33` }}>
                <ST icon="🧠" label="Strategic Assessment" color={ACCENT} />
                <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.85, fontStyle: "italic", borderLeft: `3px solid ${ACCENT}`, paddingLeft: 14 }}>
                  {analysis.strategic_assessment}
                </div>
              </Card>

              <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                <Btn onClick={() => window.print()} color="#4a5568" size="sm">🖨 Export / Print</Btn>
                <Btn onClick={() => { setAnalysis(null); setStep(2); }} color="#4a5568" size="sm">🔄 Modify Scenario</Btn>
                <Btn onClick={() => { setAnalysis(null); setTitle(""); setRegion("Middle East"); setCrisisType("conflict"); setTimeframe("T+7d"); setActors([{ name: "", type: "Nation-State", capability: "HIGH", intent: "" }]); setEvents([]); setStep(1); }} color="#4a5568" size="sm">🆕 New Scenario</Btn>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
