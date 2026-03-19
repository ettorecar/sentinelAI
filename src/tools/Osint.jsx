import { useState, useEffect, useRef } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, LiveBadge, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
}

const riskColor = r => r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";
const riskBadge = r => r === "CRITICAL" || r === "HIGH" ? "red" : r === "MEDIUM" ? "yellow" : "green";

// Admiralty source reliability system (A–F source, 1–6 info)
const ADM_SOURCE = { A: "#00ff9d", B: "#4db8ff", C: "#ffd700", D: "#ff9d00", E: "#ff4d4d", F: "#6b7a8d" };
const ADM_INFO   = { 1: "#00ff9d", 2: "#4db8ff", 3: "#ffd700", 4: "#ff9d00", 5: "#ff4d4d", 6: "#6b7a8d" };
const ADM_SOURCE_LABEL = { A: "Reliable", B: "Usually Reliable", C: "Fairly Reliable", D: "Not Usually Reliable", E: "Unreliable", F: "Cannot Be Judged" };
const ADM_INFO_LABEL   = { 1: "Confirmed", 2: "Probably True", 3: "Possibly True", 4: "Doubtful", 5: "Improbable", 6: "Cannot Be Judged" };

const ENTITY_TYPE_COLOR = { Person: "#ff9d00", Organization: "#4db8ff", Location: "#00ff9d", Vessel: "#38bdf8", Username: "#b47fff", Domain: "#ffd700", IP: "#ff4d4d" };
const TIMELINE_TYPE_COLOR = { Digital: "#4db8ff", Financial: "#ffd700", Physical: "#ff9d00", Person: "#b47fff", Legal: "#ff4d4d", Other: "#9ca3af" };

function tabStyle(active, color) {
  return {
    background: active ? `${color}18` : "transparent",
    color: active ? color : "#6b7a8d",
    border: "none", borderBottom: `2px solid ${active ? color : "transparent"}`,
    padding: "8px 14px", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400,
    letterSpacing: 0.5, transition: "all 0.15s", whiteSpace: "nowrap",
  };
}

function AdmiraltyBadge({ source, info }) {
  if (!source || !info) return null;
  const sc = ADM_SOURCE[source] || "#6b7a8d";
  const ic = ADM_INFO[info] || "#6b7a8d";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }} title={`Source: ${ADM_SOURCE_LABEL[source] || source} · Info: ${ADM_INFO_LABEL[info] || info}`}>
      <span style={{ background: `${sc}22`, border: `1px solid ${sc}66`, borderRadius: "3px 0 0 3px", padding: "1px 5px", color: sc, fontSize: 9, fontWeight: 700, fontFamily: "monospace" }}>{source}</span>
      <span style={{ background: `${ic}22`, border: `1px solid ${ic}66`, borderRadius: "0 3px 3px 0", padding: "1px 5px", color: ic, fontSize: 9, fontWeight: 700, fontFamily: "monospace" }}>{info}</span>
    </div>
  );
}

function EntityGraph({ result, selNode, setSelNode, pivotChain, onPivot }) {
  const [dashOffset, setDashOffset] = useState(0);
  const animRef = useRef(null);
  useEffect(() => {
    animRef.current = setInterval(() => setDashOffset(x => (x - 1) % 20), 60);
    return () => clearInterval(animRef.current);
  }, []);

  const maxNodes = Math.min(6, (result.connections?.length || 0) + 1);
  const angles = Array.from({ length: maxNodes - 1 }, (_, i) => (2 * Math.PI * i) / (maxNodes - 1));
  const cx = 260, cy = 155, r = 110;
  const centerNode = { x: cx, y: cy, label: result.entity, type: result.entity_type, risk: result.risk_level };
  const outerNodes = (result.connections || []).slice(0, 5).map((c, i) => ({
    x: cx + r * Math.cos(angles[i] - Math.PI / 2),
    y: cy + r * Math.sin(angles[i] - Math.PI / 2),
    label: c.entity, type: c.relation, risk: c.risk, conn: c,
  }));

  return (
    <div>
      <svg viewBox="0 0 520 310" style={{ width: "100%", background: "#070e1c", borderRadius: 10 }}>
        {/* Grid */}
        {[80, 155, 230].map(y => <line key={y} x1={0} y1={y} x2={520} y2={y} stroke="#0d1a2e" strokeWidth="1" />)}
        {[130, 260, 390].map(x => <line key={x} x1={x} y1={0} x2={x} y2={310} stroke="#0d1a2e" strokeWidth="1" />)}
        {/* Animated edges */}
        {outerNodes.map((n, i) => {
          const isSel = selNode === i;
          const nc = riskColor(n.risk);
          return (
            <line key={i} x1={centerNode.x} y1={centerNode.y} x2={n.x} y2={n.y}
              stroke={isSel ? nc : nc + "55"} strokeWidth={isSel ? 2 : 1.5}
              strokeDasharray="6 4" strokeDashoffset={dashOffset}
              style={{ transition: "stroke 0.2s, stroke-width 0.2s" }} />
          );
        })}
        {/* Outer nodes */}
        {outerNodes.map((n, i) => {
          const isSel = selNode === i;
          const nc = riskColor(n.risk);
          const ec = ENTITY_TYPE_COLOR[n.conn?.entity_type] || nc;
          return (
            <g key={i} onClick={() => setSelNode(selNode === i ? null : i)} style={{ cursor: "pointer" }}>
              {isSel && <circle cx={n.x} cy={n.y} r={35} fill="none" stroke={nc} strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />}
              <circle cx={n.x} cy={n.y} r={isSel ? 25 : 22} fill={isSel ? `${nc}22` : "#0f1826"} stroke={nc} strokeWidth={isSel ? 2.5 : 1.5} style={{ transition: "all 0.2s" }} />
              <circle cx={n.x} cy={n.y} r={isSel ? 7 : 5} fill={nc} />
              <text x={n.x} y={n.y - 33} textAnchor="middle" fill={isSel ? nc : nc + "cc"} fontSize={isSel ? 10 : 9} fontWeight="bold">
                {n.label.length > 13 ? n.label.slice(0, 13) + "…" : n.label}
              </text>
              <text x={n.x} y={n.y + (isSel ? 6 : 4)} textAnchor="middle" fill={isSel ? "#9ca3af" : "#6b7a8d"} fontSize="7">{n.type.slice(0, 12)}</text>
            </g>
          );
        })}
        {/* Center node */}
        {(() => {
          const isSel = selNode === "center";
          const cc = riskColor(centerNode.risk);
          const ec = ENTITY_TYPE_COLOR[centerNode.type] || cc;
          return (
            <g onClick={() => setSelNode(selNode === "center" ? null : "center")} style={{ cursor: "pointer" }}>
              {isSel && <circle cx={cx} cy={cy} r={50} fill="none" stroke={cc} strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />}
              <circle cx={cx} cy={cy} r={36} fill={`${cc}15`} stroke={cc} strokeWidth={isSel ? 3 : 2} style={{ transition: "all 0.2s" }} />
              <circle cx={cx} cy={cy} r={42} fill="none" stroke={cc} strokeWidth="0.8" opacity="0.25" />
              <text x={cx} y={cy - 6} textAnchor="middle" fill={cc} fontSize="9" fontWeight="bold">
                {centerNode.label.length > 14 ? centerNode.label.slice(0, 14) + "…" : centerNode.label}
              </text>
              <text x={cx} y={cy + 7} textAnchor="middle" fill="#6b7a8d" fontSize="7">{centerNode.type}</text>
              {/* pivot chain breadcrumb */}
              {pivotChain.length > 1 && (
                <text x={cx} y={cy + 20} textAnchor="middle" fill="#2d3f55" fontSize="6">pivot {pivotChain.length}/∞</text>
              )}
            </g>
          );
        })()}
      </svg>

      {/* Node detail panel */}
      {selNode === "center" && (
        <div style={{ marginTop: 10, background: "#0d1626", borderRadius: 8, padding: 14, borderLeft: `3px solid ${riskColor(result.risk_level)}` }}>
          <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 2, marginBottom: 5 }}>PIVOT ENTITY</div>
          <div style={{ fontWeight: 800, color: "#e2e8f0", fontSize: 14, marginBottom: 6 }}>{result.entity}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <BADGE text={result.entity_type} color="blue" />
            <BADGE text={result.risk_level} color={riskBadge(result.risk_level)} />
            <span style={{ color: "#ffd700", fontSize: 11 }}>Conf: {result.confidence}%</span>
          </div>
          <div style={{ color: "#c9d1da", fontSize: 12, lineHeight: 1.6 }}>{result.summary}</div>
        </div>
      )}
      {selNode !== null && selNode !== "center" && (() => {
        const conn = result.connections?.[selNode];
        if (!conn) return null;
        const nc = riskColor(conn.risk);
        return (
          <div style={{ marginTop: 10, background: "#0d1626", borderRadius: 8, padding: 14, borderLeft: `3px solid ${nc}` }}>
            <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 2, marginBottom: 5 }}>CONNECTED ENTITY</div>
            <div style={{ fontWeight: 800, color: "#e2e8f0", fontSize: 14, marginBottom: 6 }}>{conn.entity}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <BADGE text={conn.relation} color="blue" />
              <BADGE text={conn.risk} color={riskBadge(conn.risk)} />
              {conn.admiralty_source && conn.admiralty_info && <AdmiraltyBadge source={conn.admiralty_source} info={conn.admiralty_info} />}
            </div>
            <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8 }}>
              Source: <span style={{ color: "#ffd700" }}>{conn.source}</span>
              <span style={{ margin: "0 8px" }}>·</span>
              Pivot: <span style={{ color: "#4db8ff" }}>{result.entity}</span>
            </div>
            <button onClick={() => onPivot(conn.entity)} style={{
              background: "#0a1525", border: "1px solid #4db8ff55", borderRadius: 5,
              color: "#4db8ff", fontSize: 11, padding: "5px 12px", cursor: "pointer", fontWeight: 600,
            }}>
              🔍 Pivot → {conn.entity.slice(0, 20)}
            </button>
          </div>
        );
      })()}
    </div>
  );
}

function TimelineView({ timeline }) {
  if (!timeline?.length) return <div style={{ color: "#4a5568", fontSize: 13, padding: 16 }}>No timeline data available.</div>;
  return (
    <div style={{ position: "relative", paddingLeft: 28 }}>
      <div style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, #1f2d45, #0d1626)" }} />
      {timeline.map((ev, i) => {
        const c = TIMELINE_TYPE_COLOR[ev.type] || "#9ca3af";
        return (
          <div key={i} style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ position: "absolute", left: -22, top: 4, width: 10, height: 10, borderRadius: "50%", background: c, border: `2px solid ${c}44`, boxShadow: `0 0 6px ${c}44` }} />
            <div style={{ background: "#0d1626", borderRadius: 7, padding: "9px 12px", borderLeft: `2px solid ${c}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ color: c, fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{ev.type?.toUpperCase()}</span>
                  <span style={{ color: "#2d3f55", fontSize: 9 }}>·</span>
                  <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "monospace" }}>{ev.date}</span>
                </div>
              </div>
              <div style={{ color: "#c9d1da", fontSize: 12, lineHeight: 1.5 }}>{ev.event}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FootprintView({ footprint, entity_type }) {
  if (!footprint) return <div style={{ color: "#4a5568", fontSize: 13, padding: 16 }}>No footprint data available.</div>;
  const sections = [
    { key: "social_media", label: "📱 Social Media", color: "#4db8ff" },
    { key: "financial",    label: "💰 Financial",    color: "#ffd700" },
    { key: "physical",     label: "📍 Physical",     color: "#ff9d00" },
    { key: "digital",      label: "🌐 Digital",      color: "#b47fff" },
    { key: "legal",        label: "⚖️ Legal",        color: "#ff4d4d" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
      {sections.filter(s => footprint[s.key]?.length > 0).map(({ key, label, color }) => (
        <div key={key} style={{ background: "#0a1220", borderRadius: 8, padding: "10px 12px", borderTop: `2px solid ${color}` }}>
          <div style={{ color, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>{label}</div>
          {footprint[key].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
              <span style={{ color, fontSize: 9, marginTop: 2, flexShrink: 0 }}>▸</span>
              <span style={{ color: "#c9d1da", fontSize: 11, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Osint() {
  const [apiKey] = useApiKey();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selNode, setSelNode] = useState(null);
  const [tab, setTab] = useState("graph");
  const [pivotChain, setPivotChain] = useState([]);
  const { stamp } = useLastAnalysis("osint");

  function handleKey(e) { if (e.ctrlKey && e.key === "Enter") run(); }

  async function run(overrideQuery) {
    const q = overrideQuery || query;
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!q) { setError("Enter an entity to correlate."); return; }
    setError(""); setLoading(true); setResult(null); setSelNode(null); setTab("graph");
    if (!overrideQuery) setPivotChain([q]);
    else setPivotChain(prev => [...prev, q]);
    try {
      const r = await callClaude(apiKey, `You are a senior OSINT analyst. Perform open-source intelligence correlation on the following entity. Return ONLY a JSON object (no markdown, no backticks).

Entity: ${q}

Return exactly this JSON:
{
  "entity": "string",
  "entity_type": "Person|Organization|Location|Vessel|Username|Domain|IP",
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "summary": "2-3 sentence intel summary",
  "connections": [
    {
      "entity": "string",
      "relation": "string",
      "risk": "LOW|MEDIUM|HIGH|CRITICAL",
      "source": "string (e.g. Corporate registry, Social media, Maritime AIS)",
      "admiralty_source": "A|B|C|D|E|F",
      "admiralty_info": "1|2|3|4|5|6"
    }
  ],
  "intelligence_notes": ["string"],
  "recommended_actions": ["string"],
  "confidence": 0_to_100,
  "timeline": [
    {"date": "string (e.g. 2023-Q3)", "event": "string", "type": "Digital|Financial|Physical|Person|Legal|Other"}
  ],
  "footprint": {
    "social_media": ["string"],
    "financial": ["string"],
    "physical": ["string"],
    "digital": ["string"],
    "legal": ["string"]
  }
}

Include 4-6 connections, 3-4 intel notes, 4-6 timeline events in chronological order, and footprint data for relevant categories. Admiralty scale: source A=Reliable, F=Unknown; info 1=Confirmed, 6=Unknown.`);
      setResult(r); stamp();
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  function handlePivot(entityName) {
    setQuery(entityName);
    run(entityName);
  }

  const color = result ? riskColor(result.risk_level) : "#4db8ff";

  return (
    <div>
      <PageHeader icon="🔍" title="OSINT Correlation Engine" sub="Entity correlation graphs, pivot chaining, source reliability scoring, and temporal analysis." accent="#00ff9d" dataMode="ai" />

      <Card>
        {/* Pivot chain breadcrumb */}
        {pivotChain.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ color: "#2d3f55", fontSize: 9, letterSpacing: 1 }}>PIVOT CHAIN:</span>
            {pivotChain.map((p, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                {i > 0 && <span style={{ color: "#2d3f55", fontSize: 10 }}>→</span>}
                <span style={{ color: i === pivotChain.length - 1 ? "#00ff9d" : "#4a5568", fontSize: 10, fontFamily: "monospace" }}>
                  {p.slice(0, 20)}
                </span>
              </span>
            ))}
          </div>
        )}
        <Input label="🔎 Entity" value={query} onChange={setQuery} placeholder="Person, company, vessel, domain, IP, username..." maxLength={200} onClear={() => { setQuery(""); setResult(null); setPivotChain([]); }} onKeyDown={handleKey} hint="Ctrl+Enter to run · click a connection node to pivot" />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn onClick={() => run()} disabled={loading}>{loading ? "⏳ Correlating..." : "🔍 Run OSINT Correlation"}</Btn>
          {pivotChain.length > 1 && (
            <button onClick={() => { const first = pivotChain[0]; setPivotChain([first]); setQuery(first); run(first); }}
              style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 5, color: "#4a5568", fontSize: 11, padding: "5px 10px", cursor: "pointer" }}>
              ↩ Back to root
            </button>
          )}
          <LastAnalysisTag toolId="osint" />
        </div>
      </Card>

      {result && (
        <>
          {/* Entity summary card */}
          <Card style={{ borderColor: color + "55", borderLeft: `3px solid ${color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>ENTITY PROFILE</div>
                <div style={{ fontWeight: 900, fontSize: 17, color: "#e2e8f0" }}>{result.entity}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                  <span style={{ background: `${ENTITY_TYPE_COLOR[result.entity_type] || "#4db8ff"}22`, border: `1px solid ${ENTITY_TYPE_COLOR[result.entity_type] || "#4db8ff"}55`, borderRadius: 4, padding: "2px 8px", color: ENTITY_TYPE_COLOR[result.entity_type] || "#4db8ff", fontSize: 10, fontWeight: 700 }}>{result.entity_type}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <ExportBtn data={result} filename={`sentinel-osint-${result.entity?.replace(/\s/g, "-").slice(0, 20)}`} />
                <BADGE text={result.risk_level} color={riskBadge(result.risk_level)} />
                <div style={{ color: "#4a5568", fontSize: 11 }}>Confidence: <span style={{ color: "#ffd700", fontWeight: 700 }}>{result.confidence}%</span></div>
                <LiveBadge />
              </div>
            </div>
            <div style={{ background: "#0d1626", borderRadius: 3, height: 5, marginBottom: 12 }}>
              <div style={{ background: color, height: 5, borderRadius: 3, width: `${result.confidence}%`, transition: "width 0.6s" }} />
            </div>
            <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.65 }}>{result.summary}</div>
          </Card>

          {/* Tab navigation */}
          <div style={{ display: "flex", borderBottom: "1px solid #1f2d45", marginBottom: 14, overflowX: "auto" }}>
            {[
              { id: "graph",       label: "📊 Entity Graph",    color: "#4db8ff" },
              { id: "connections", label: "🔗 Connections",     color: "#ffd700" },
              { id: "timeline",    label: "📅 Timeline",        color: "#b47fff" },
              { id: "footprint",   label: "👣 Footprint",       color: "#ff9d00" },
              { id: "intel",       label: "🧾 Intel Notes",     color: "#00ff9d" },
            ].map(({ id, label, color }) => (
              <button key={id} onClick={() => setTab(id)} style={tabStyle(tab === id, color)}>{label}</button>
            ))}
          </div>

          {tab === "graph" && (
            <Card>
              <ST icon="📊" label="Entity Correlation Graph" color="#4db8ff"
                sub={`${result.connections?.length || 0} connections · animated edges · click node to inspect · Pivot → to chain`}
                style={{ marginBottom: 12 }} />
              <EntityGraph result={result} selNode={selNode} setSelNode={setSelNode} pivotChain={pivotChain} onPivot={handlePivot} />
            </Card>
          )}

          {tab === "connections" && (
            <Card>
              <ST icon="🔗" label="Key Connections" color="#ffd700" sub={`${result.connections?.length} entities linked · Admiralty source/info rating`} style={{ marginBottom: 14 }} />
              {result.connections?.map((c, i) => {
                const nc = riskColor(c.risk);
                const [hovered, setHovered] = useState(false);
                return (
                  <div key={i}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    style={{ background: hovered ? "#0f1a2e" : "transparent", borderLeft: `2px solid ${hovered ? nc : nc + "55"}`, borderRadius: 6, padding: "10px 12px", marginBottom: 8, transition: "all 0.15s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 3 }}>
                          <span style={{ color: "#9ca3af" }}>{result.entity}</span>
                          <span style={{ color: "#4a5568", margin: "0 5px" }}>→</span>
                          <span style={{ color: "#4db8ff", fontWeight: 600 }}>{c.entity}</span>
                        </div>
                        <div style={{ color: "#4a5568", fontSize: 11, marginBottom: 4 }}>{c.relation} · via {c.source}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <AdmiraltyBadge source={c.admiralty_source} info={c.admiralty_info} />
                          {c.admiralty_source && <span style={{ color: "#2d3f55", fontSize: 9 }}>{ADM_SOURCE_LABEL[c.admiralty_source]}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <BADGE text={c.risk} color={riskBadge(c.risk)} />
                        <button onClick={() => handlePivot(c.entity)} style={{ background: "#0a1525", border: "1px solid #4db8ff44", borderRadius: 4, color: "#4db8ff", fontSize: 10, padding: "3px 8px", cursor: "pointer" }}>
                          Pivot →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {tab === "timeline" && (
            <Card>
              <ST icon="📅" label="Entity Timeline" color="#b47fff" sub="Chronological events from open-source records" style={{ marginBottom: 16 }} />
              <TimelineView timeline={result.timeline} />
            </Card>
          )}

          {tab === "footprint" && (
            <Card>
              <ST icon="👣" label="Digital & Physical Footprint" color="#ff9d00" sub="Cross-domain presence mapping" style={{ marginBottom: 14 }} />
              <FootprintView footprint={result.footprint} entity_type={result.entity_type} />
            </Card>
          )}

          {tab === "intel" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
              <Card>
                <ST icon="🧾" label="Intelligence Notes" color="#4db8ff" style={{ marginBottom: 10 }} />
                {result.intelligence_notes?.map((n, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "5px 8px", marginBottom: 4, borderRadius: 5 }}>
                    <span style={{ color: "#4db8ff", fontSize: 12, marginTop: 2, flexShrink: 0 }}>▸</span>
                    <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{n}</span>
                  </div>
                ))}
              </Card>
              <Card>
                <ST icon="🛡️" label="Recommended Actions" color="#00ff9d" style={{ marginBottom: 10 }} />
                {result.recommended_actions?.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "5px 8px", marginBottom: 4, borderRadius: 5 }}>
                    <span style={{ color: "#00ff9d", fontSize: 12, marginTop: 2, flexShrink: 0 }}>▸</span>
                    <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{a}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
