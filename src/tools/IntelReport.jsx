import { useState } from "react";
import { BADGE, Card, Btn, ST, Input, PageHeader, LiveBadge, ExportBtn, LastAnalysisTag, useLastAnalysis, CopyBtn } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

const DOMAINS = [
  { id: "kinetic",  label: "Kinetic / Military",    icon: "💥", color: "#ff4d4d" },
  { id: "cyber",    label: "Cyber Threats",          icon: "🔐", color: "#4db8ff" },
  { id: "maritime", label: "Maritime / Chokepoints", icon: "🌊", color: "#38bdf8" },
  { id: "energy",   label: "Energy Infrastructure",  icon: "⚡", color: "#ff9d00" },
  { id: "bio",      label: "Bio-Threat",              icon: "🦠", color: "#00ff9d" },
  { id: "disinfo",  label: "Disinformation",          icon: "📰", color: "#b47fff" },
];

const CLASSIFICATIONS = ["UNCLASSIFIED", "RESTRICTED", "CONFIDENTIAL"];
const FORMATS = ["Executive Brief", "Full Intelligence Report", "Tactical Summary"];
const TIMEFRAMES = ["24h", "72h", "7d", "30d"];

async function callClaude(apiKey, prompt, maxTokens = 2000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

function ToggleBtn({ active, onClick, color = "#b47fff", children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? color : hovered ? color + "22" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? color : "#9ca3af",
        border: `1px solid ${active ? color : hovered ? color + "44" : "transparent"}`,
        borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12,
        fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function SmallToggle({ active, onClick, color = "#b47fff", children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? color : hovered ? color + "22" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? color : "#9ca3af",
        border: `1px solid ${active ? color : hovered ? color + "44" : "transparent"}`,
        borderRadius: 5, padding: "5px 10px", cursor: "pointer", fontSize: 11,
        fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

const severityColor = s => s === "CRITICAL" ? "#ff0000" : s === "HIGH" ? "#ff4d4d" : s === "MEDIUM" ? "#ffd700" : "#00ff9d";
const priorityColor = p => p === "IMMEDIATE" ? "#ff4d4d" : p === "SHORT_TERM" ? "#ffd700" : "#4db8ff";

const CLASS_STYLE = {
  "TOP SECRET":     { bg: "#2d0000", text: "#ff4d4d", border: "#ff4d4d" },
  "SECRET":         { bg: "#1a0a00", text: "#ff9d00", border: "#ff9d00" },
  "CONFIDENTIAL":   { bg: "#001a0a", text: "#00ff9d", border: "#00ff9d" },
  "RESTRICTED":     { bg: "#0a0a1a", text: "#4db8ff", border: "#4db8ff" },
  "UNCLASSIFIED":   { bg: "#0a1220", text: "#6b7a8d", border: "#2d3f55" },
};

function ClassificationBanner({ level, date, title }) {
  const s = CLASS_STYLE[level] || CLASS_STYLE["RESTRICTED"];
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ background: s.border, padding: "4px 0", textAlign: "center" }}>
        <span style={{ color: s.bg, fontSize: 10, fontWeight: 900, letterSpacing: 3 }}>{level}</span>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ color: s.text, fontSize: 9, letterSpacing: 2, marginBottom: 4, fontFamily: "monospace" }}>
              SENTINEL INTELLIGENCE REPORT · {date}
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#e2e8f0" }}>{title}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: s.text, fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>HANDLE VIA COMINT CHANNELS ONLY</div>
            <div style={{ color: "#4a5568", fontSize: 9, fontFamily: "monospace" }}>REF: SNT-{Math.floor(Math.random() * 9000 + 1000)}-{level.slice(0, 3)}</div>
          </div>
        </div>
      </div>
      <div style={{ background: s.border, padding: "4px 0", textAlign: "center" }}>
        <span style={{ color: s.bg, fontSize: 10, fontWeight: 900, letterSpacing: 3 }}>{level}</span>
      </div>
    </div>
  );
}

function FindingsChart({ findings, selectedDomains }) {
  const SEV_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const domainCounts = {};
  DOMAINS.filter(d => selectedDomains.includes(d.id)).forEach(d => {
    domainCounts[d.id] = { label: d.label, icon: d.icon, color: d.color };
    SEV_ORDER.forEach(s => { domainCounts[d.id][s] = 0; });
  });
  (findings || []).forEach(f => {
    const key = (f.domain || "").toLowerCase().split(/[\s/]/)[0];
    const match = DOMAINS.find(d => d.label.toLowerCase().includes(key) || d.id === key);
    if (match && domainCounts[match.id]) domainCounts[match.id][f.severity] = (domainCounts[match.id][f.severity] || 0) + 1;
  });
  const maxTotal = Math.max(...Object.values(domainCounts).map(d => SEV_ORDER.reduce((s, k) => s + (d[k] || 0), 0)), 1);
  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>FINDINGS DISTRIBUTION BY DOMAIN</div>
      {Object.values(domainCounts).map(d => {
        const total = SEV_ORDER.reduce((s, k) => s + (d[k] || 0), 0);
        if (total === 0) return null;
        return (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <div style={{ minWidth: 120, color: d.color, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <span>{d.icon}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label.split(" ")[0]}</span>
            </div>
            <div style={{ flex: 1, display: "flex", gap: 1, height: 18, borderRadius: 4, overflow: "hidden" }}>
              {SEV_ORDER.map(sev => d[sev] > 0 ? (
                <div key={sev} title={`${sev}: ${d[sev]}`}
                  style={{ width: `${(d[sev] / maxTotal) * 100}%`, minWidth: d[sev] > 0 ? 12 : 0, background: severityColor(sev), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {d[sev] > 0 && <span style={{ color: "#000", fontSize: 8, fontWeight: 700 }}>{d[sev]}</span>}
                </div>
              ) : null)}
            </div>
            <span style={{ color: "#9ca3af", fontSize: 11, minWidth: 16, textAlign: "right" }}>{total}</span>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        {SEV_ORDER.map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, background: severityColor(s), borderRadius: 2 }} />
            <span style={{ color: "#4a5568", fontSize: 9 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// F4 — Tab button
function TabBtn({ active, onClick, children }) {
  const [hovered, setHovered] = useState(false);
  const color = "#b47fff";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? `${color}22` : hovered ? "#141e30" : "transparent",
        color: active ? color : hovered ? "#9ca3af" : "#4a5568",
        border: "none",
        borderBottom: `2px solid ${active ? color : "transparent"}`,
        padding: "8px 14px", cursor: "pointer", fontSize: 12,
        fontWeight: active ? 700 : 400, letterSpacing: 0.4,
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// F4 — KPI card
function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{ background: "#0d1626", borderRadius: 8, padding: "14px 16px", borderLeft: `3px solid ${color}`, flex: 1, minWidth: 120 }}>
      <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontWeight: 900, fontSize: 20, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: "#4a5568", fontSize: 10, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function IntelReport() {
  const [apiKey] = useApiKey();
  const [selectedDomains, setSelectedDomains] = useState(["cyber", "maritime"]);
  const [focus, setFocus] = useState("");
  const [timeframe, setTimeframe] = useState("72h");
  const [format, setFormat] = useState("Executive Brief");
  const [classification, setClassification] = useState("RESTRICTED");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { stamp } = useLastAnalysis("intelreport");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [importOpen, setImportOpen] = useState(false);

  function toggleDomain(id) {
    setSelectedDomains(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  }

  // H3 — import prefill from a prior tool analysis
  const IMPORT_SOURCES = [
    { id: "threatmap", label: "Threat Map",    domains: ["kinetic", "cyber"] },
    { id: "cti",       label: "Cyber Intel",   domains: ["cyber"] },
    { id: "maritime",  label: "Maritime",      domains: ["maritime"] },
    { id: "biothreat", label: "Bio-Threat",    domains: ["bio"] },
    { id: "disinfo",   label: "Disinformation", domains: ["disinfo"] },
  ];

  function importFrom(src) {
    setImportOpen(false);
    // add relevant domains
    setSelectedDomains(prev => {
      const next = [...new Set([...prev, ...src.domains])];
      return next;
    });
    // read prefill text, fall back to tool description
    let text = "";
    try { text = localStorage.getItem(`sentinel_prefill_${src.id}`) || ""; } catch {}
    if (!text) text = `Context from recent ${src.label} analysis`;
    setFocus(text.slice(0, 400));
  }

  async function generate() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (selectedDomains.length === 0) { setError("Select at least one intelligence domain."); return; }
    setError(""); setLoading(true); setResult(null);

    const domainLabels = selectedDomains.map(id => DOMAINS.find(d => d.id === id)?.label).join(", ");
    const prompt = `You are a senior intelligence analyst at a defence intelligence organization. Generate a ${format} covering the following domains: ${domainLabels}.
${focus ? `Specific focus: ${focus}` : ""}
Timeframe: last ${timeframe}.
Classification: ${classification}.

Return ONLY a JSON object (no markdown, no backticks):
{
  "title": "Report title",
  "classification": "${classification}",
  "date": "current date",
  "executive_summary": "2-3 sentence summary of the key intelligence picture",
  "key_findings": [
    {"domain": "domain name", "finding": "key finding text", "severity": "CRITICAL|HIGH|MEDIUM|LOW"}
  ],
  "threat_actors": ["actor name and brief description"],
  "emerging_risks": ["risk description"],
  "recommended_actions": [
    {"priority": "IMMEDIATE|SHORT_TERM|LONG_TERM", "action": "action description"}
  ],
  "intelligence_gaps": ["gap description"],
  "confidence_level": "HIGH|MEDIUM|LOW",
  "analyst_note": "brief analyst assessment note"
}`;

    try {
      const raw = await callClaude(apiKey, prompt, 2000);
      setResult(JSON.parse(raw.replace(/```json|```/g, "").trim())); stamp();
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader icon="📋" title="Intelligence Report Generator" sub="Generate structured multi-domain intelligence briefs." accent="#b47fff" classification="TOP SECRET" dataMode="ai" badges={apiKey ? [] : [{text:"API Key Required",color:"#ffd700"}]} />

      <Card>
        <ST icon="🎯" label="Intelligence Domains" color="#b47fff" sub="Select one or more domains to include" />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
          {DOMAINS.map(d => (
            <ToggleBtn key={d.id} active={selectedDomains.includes(d.id)} onClick={() => toggleDomain(d.id)}>
              {d.icon} {d.label}
            </ToggleBtn>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 6, letterSpacing: 0.5 }}>⏱ Timeframe</div>
            <div style={{ display: "flex", gap: 5 }}>
              {TIMEFRAMES.map(t => (
                <SmallToggle key={t} active={timeframe === t} onClick={() => setTimeframe(t)}>{t}</SmallToggle>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 6, letterSpacing: 0.5 }}>🔒 Classification</div>
            <div style={{ display: "flex", gap: 5 }}>
              {CLASSIFICATIONS.map(c => (
                <SmallToggle key={c} active={classification === c} onClick={() => setClassification(c)}>{c}</SmallToggle>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 6, letterSpacing: 0.5 }}>📄 Format</div>
          <div style={{ display: "flex", gap: 5 }}>
            {FORMATS.map(f => (
              <SmallToggle key={f} active={format === f} onClick={() => setFormat(f)}>{f}</SmallToggle>
            ))}
          </div>
        </div>

        <Input label="🔍 Specific Focus (optional)" value={focus} onChange={setFocus}
          placeholder="e.g. Iran-Israel tensions, Baltic undersea cables, Sahel region..." />

        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        {!apiKey && (
          <div style={{ color: "#ff9d00", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#1a0e0022", border: "1px solid #ff9d0033", borderRadius: 6 }}>
            ⚠ Set your Anthropic API key in the banner at the top to generate reports.
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Btn onClick={generate} disabled={loading || !apiKey} color="#b47fff">
            {loading ? "⏳ Generating Report..." : "📋 Generate Intelligence Report"}
          </Btn>
          {/* H3 — Import from prior tool analysis */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setImportOpen(x => !x)}
              style={{
                background: importOpen ? "#b47fff22" : "#1f2d45",
                border: `1px solid ${importOpen ? "#b47fff55" : "transparent"}`,
                borderRadius: 6, padding: "6px 12px", cursor: "pointer",
                color: importOpen ? "#b47fff" : "#9ca3af", fontSize: 12,
                transition: "all 0.15s",
              }}
            >
              ↗ Import from →
            </button>
            {importOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setImportOpen(false)} />
                <div style={{
                  position: "absolute", top: "calc(100% + 5px)", left: 0,
                  background: "#0b111e", border: "1px solid #1f2d45",
                  borderRadius: 8, zIndex: 50, minWidth: 180,
                  boxShadow: "0 8px 32px #000a", overflow: "hidden",
                }}>
                  <div style={{ padding: "7px 12px", borderBottom: "1px solid #1f2d45", color: "#4a5568", fontSize: 10, letterSpacing: 1 }}>
                    IMPORT FROM TOOL
                  </div>
                  {IMPORT_SOURCES.map(src => {
                    const hasData = (() => { try { return !!localStorage.getItem(`sentinel_last_${src.id}`); } catch { return false; } })();
                    return (
                      <button key={src.id}
                        onClick={() => importFrom(src)}
                        disabled={!hasData}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          width: "100%", textAlign: "left", background: "transparent",
                          border: "none", padding: "9px 12px", cursor: hasData ? "pointer" : "not-allowed",
                          color: hasData ? "#e2e8f0" : "#2d3f55", fontSize: 12,
                          borderBottom: "1px solid #0d1626",
                        }}
                        onMouseEnter={e => { if (hasData) e.currentTarget.style.background = "#0d1626"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span>{src.label}</span>
                        {hasData
                          ? <span style={{ color: "#00ff9d", fontSize: 9, fontWeight: 700 }}>✓ disponibile</span>
                          : <span style={{ color: "#2d3f55", fontSize: 9 }}>no analisi</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <LastAnalysisTag toolId="intelreport" />
        </div>
      </Card>

      {result && (
        <>
          {/* Classified document header */}
          <ClassificationBanner level={result.classification || classification} date={result.date} title={result.title} />

          {/* KPI strip */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            {(() => {
              const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
              const peak = (result.key_findings || []).reduce((max, f) => (order[f.severity] || 0) > (order[max] || 0) ? f.severity : max, "LOW");
              return [
                { label: "PEAK SEVERITY", value: peak, color: severityColor(peak), sub: "highest finding" },
                { label: "CONFIDENCE", value: result.confidence_level, color: result.confidence_level === "HIGH" ? "#00ff9d" : result.confidence_level === "MEDIUM" ? "#ffd700" : "#ff4d4d", sub: "analyst assessment" },
                { label: "TOTAL FINDINGS", value: String(result.key_findings?.length ?? 0), color: "#b47fff", sub: `${selectedDomains.length} domain${selectedDomains.length !== 1 ? "s" : ""}` },
                { label: "ACTIONS REQUIRED", value: String((result.recommended_actions || []).filter(a => a.priority === "IMMEDIATE").length), color: "#ff4d4d", sub: "immediate priority" },
              ].map(k => <KpiCard key={k.label} label={k.label} value={k.value} color={k.color} sub={k.sub} />);
            })()}
          </div>

          {/* Findings distribution chart */}
          {result.key_findings?.length > 0 && (
            <Card style={{ marginBottom: 14 }}>
              <FindingsChart findings={result.key_findings} selectedDomains={selectedDomains} />
            </Card>
          )}

          {/* Export */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 14 }}>
            <LiveBadge />
            <ExportBtn data={result} filename={`sentinel-intelreport-${result.date?.replace(/\s/g, "-") || "report"}`} />
          </div>

          {/* F4 — Tabbed output */}
          <Card style={{ paddingTop: 0 }}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "1px solid #1f2d45", marginBottom: 16, overflowX: "auto" }}>
              <TabBtn active={activeTab === "summary"}  onClick={() => setActiveTab("summary")}>📋 Executive Summary</TabBtn>
              <TabBtn active={activeTab === "actors"}   onClick={() => setActiveTab("actors")}>👤 Threat Actors</TabBtn>
              <TabBtn active={activeTab === "iocs"}     onClick={() => setActiveTab("iocs")}>🔍 Key Findings</TabBtn>
              <TabBtn active={activeTab === "actions"}  onClick={() => setActiveTab("actions")}>✅ Recommended Actions</TabBtn>
            </div>

            {/* Tab: Executive Summary */}
            {activeTab === "summary" && (
              <div>
                <div style={{ background: "#0d1626", borderRadius: 8, padding: 14, borderLeft: "3px solid #b47fff", marginBottom: 14 }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>EXECUTIVE SUMMARY</div>
                  <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.75 }}>{result.executive_summary}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
                  <div>
                    <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>EMERGING RISKS</div>
                    {result.emerging_risks?.map((r, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7 }}>
                        <span style={{ color: "#ffd700", fontSize: 12, marginTop: 1 }}>▸</span>
                        <span style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{r}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>ANALYST NOTE</div>
                    <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.75, fontStyle: "italic" }}>{result.analyst_note}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Threat Actors */}
            {activeTab === "actors" && (
              <div>
                {result.threat_actors?.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#0d1626", borderRadius: 6, padding: "10px 12px", marginBottom: 8, borderLeft: "3px solid #ff4d4d" }}>
                    <span style={{ color: "#ff4d4d", fontSize: 14, marginTop: 1, flexShrink: 0 }}>▸</span>
                    <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.55 }}>{a}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14 }}>
                  <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>INTELLIGENCE GAPS</div>
                  {result.intelligence_gaps?.map((g, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                      <span style={{ color: "#4db8ff" }}>•</span>
                      <span style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5 }}>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Key Findings */}
            {activeTab === "iocs" && (
              <div>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 10 }}>
                  {result.key_findings?.length} FINDINGS ACROSS {selectedDomains.length} DOMAIN{selectedDomains.length !== 1 ? "S" : ""}
                </div>
                {result.key_findings?.map((f, i) => (
                  <div key={i} style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px", marginBottom: 8, borderLeft: `3px solid ${severityColor(f.severity)}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{f.domain}</span>
                        <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 3, lineHeight: 1.55 }}>{f.finding}</div>
                      </div>
                      <BADGE text={f.severity} color={f.severity === "CRITICAL" || f.severity === "HIGH" ? "red" : f.severity === "MEDIUM" ? "yellow" : "green"} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Recommended Actions */}
            {activeTab === "actions" && (
              <div>
                {result.recommended_actions?.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#0d1626", borderRadius: 6, padding: "9px 12px", marginBottom: 7, borderLeft: `2px solid ${priorityColor(a.priority)}` }}>
                    <span style={{ color: priorityColor(a.priority), fontSize: 10, fontWeight: 700, minWidth: 88, marginTop: 2, letterSpacing: 0.5 }}>{a.priority}</span>
                    <span style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{a.action}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Bottom classification banner */}
          {(() => {
            const s = CLASS_STYLE[result.classification || classification] || CLASS_STYLE["RESTRICTED"];
            return (
              <div style={{ background: s.border, borderRadius: 6, padding: "6px 0", textAlign: "center", marginBottom: 14 }}>
                <span style={{ color: s.bg, fontSize: 10, fontWeight: 900, letterSpacing: 3 }}>
                  {result.classification || classification} — HANDLE VIA AUTHORISED CHANNELS ONLY
                </span>
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => window.print()} color="#4db8ff" size="sm">🖨 Export / Print</Btn>
            <Btn onClick={() => { setResult(null); setActiveTab("summary"); }} color="#4a5568" size="sm">🔄 New Report</Btn>
          </div>
        </>
      )}
    </div>
  );
}
