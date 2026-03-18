import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, LiveBadge, ExportBtn, LastAnalysisTag, useLastAnalysis } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1400, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
}

const verdictColor = v => v?.includes("DISINFORMATION") ? "#ff4d4d" : v === "SUSPICIOUS" ? "#ffd700" : "#00ff9d";
const verdictBadge = v => v?.includes("DISINFORMATION") ? "red" : v === "SUSPICIOUS" ? "yellow" : "green";

const PLATFORM_COLORS = { Twitter: "#1DA1F2", Telegram: "#0088cc", Facebook: "#4267B2", TikTok: "#ff0050" };
const DAY_FACTORS = [0.28, 0.40, 0.52, 0.64, 0.76, 0.89, 1.00];
const DAYS_LABEL = ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Today"];

function TechniqueBar({ name, intensity }) {
  const [hovered, setHovered] = useState(false);
  const color = intensity > 80 ? "#ff4d4d" : intensity > 60 ? "#ffd700" : "#4db8ff";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#0f1a2e" : "#0d1626",
        borderRadius: 6, padding: "10px 12px", marginBottom: 7,
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

// E1 — Spread velocity sparkline (shown inside verdict card)
function SpreadVelocitySparkline({ data }) {
  if (!data?.length) return null;
  const W = 110, H = 28;
  const max = Math.max(...data, 1);
  const xs = data.map((_, i) => (i / (data.length - 1)) * W);
  const ys = data.map(v => H - (v / max) * H);
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const areaD = `M 0,${H} ${xs.map((x, i) => `L ${x},${ys[i]}`).join(" ")} L ${W},${H} Z`;
  const rising = data[data.length - 1] >= data[data.length - 2];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, flexShrink: 0 }}>SPREAD VELOCITY 7D</span>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H, flexShrink: 0 }}>
        <defs>
          <linearGradient id="sv-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4d4d" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff4d4d" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#sv-grad)" />
        <polyline points={pts} fill="none" stroke="#ff4d4d" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill="#ff4d4d" />
      </svg>
      <span style={{ color: "#ff4d4d", fontSize: 11, fontWeight: 700 }}>
        {rising ? "▲" : "▼"} {data[data.length - 1]}
      </span>
    </div>
  );
}

// E1 — 7-day campaign intensity bar chart per platform
function CampaignIntensityChart({ pi }) {
  if (!pi) return null;
  const names = Object.keys(pi);
  const BW = 9, GAP = 2, GP = 14;
  const gW = names.length * (BW + GAP) + GP;
  const SVG_W = 7 * gW + 10;
  const CH = 80, SH = CH + 22;

  return (
    <div>
      <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>
        7-DAY CAMPAIGN INTENSITY BY PLATFORM
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${SVG_W} ${SH}`} style={{ width: "100%", minWidth: 240, height: SH }}>
          {[0, 50, 100].map(v => (
            <line key={v} x1={0} y1={CH - (v / 100) * CH} x2={SVG_W} y2={CH - (v / 100) * CH}
              stroke="#1f2d45" strokeWidth="0.5" />
          ))}
          {DAYS_LABEL.map((day, di) => {
            const gx = di * gW;
            return (
              <g key={day}>
                {names.map((name, ni) => {
                  const jitter = ((di * 7 + ni * 3) % 9) - 4;
                  const val = Math.max(2, Math.min(100, Math.round(pi[name] * DAY_FACTORS[di] + jitter * DAY_FACTORS[di])));
                  const bh = (val / 100) * CH;
                  const color = PLATFORM_COLORS[name] || "#4db8ff";
                  return (
                    <rect key={name} x={gx + ni * (BW + GAP)} y={CH - bh} width={BW} height={bh}
                      fill={color} opacity={di === 6 ? 1 : 0.50 + di * 0.07} rx="1.5" />
                  );
                })}
                <text x={gx + (names.length * (BW + GAP)) / 2} y={SH - 4}
                  textAnchor="middle" fill="#2d3f55" fontSize="6.5">{day}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
        {names.map(name => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: PLATFORM_COLORS[name] || "#4db8ff" }} />
            <span style={{ color: "#9ca3af", fontSize: 10 }}>{name}</span>
            <span style={{ color: PLATFORM_COLORS[name] || "#4db8ff", fontSize: 10, fontWeight: 700 }}>{pi[name]}%</span>
          </div>
        ))}
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
  const { stamp } = useLastAnalysis("disinfo");
  function handleKey(e) { if (e.ctrlKey && e.key === "Enter") analyze(); }

  async function analyze() {
    if (!apiKey) { setError("Set the Anthropic API key using the banner above."); return; }
    if (!text) { setError("Paste content to analyze."); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const prompt = `You are a senior disinformation analyst working for a government intelligence agency. Analyze the following content for disinformation techniques. Return ONLY a JSON object (no markdown, no backticks, no commentary).

Content to analyze:
${text}

Return exactly this JSON structure:
{"verdict":"LIKELY DISINFORMATION|CONFIRMED DISINFORMATION|SUSPICIOUS|LEGITIMATE","confidence":number_0_to_100,"narrative":"brief string describing the narrative","origin":"e.g. State-sponsored IO, Grassroots Campaign, Unknown actor, Pro-Kremlin network, etc.","techniques":[{"name":"string","intensity":number_0_to_100}],"platform_intensity":{"Twitter":number_0_to_100,"Telegram":number_0_to_100,"Facebook":number_0_to_100,"TikTok":number_0_to_100},"spread_velocity":[n0,n1,n2,n3,n4,n5,n6]}

Include 4-6 specific techniques. spread_velocity is 7 numbers oldest→today (0-100) representing daily spread rate trend. platform_intensity is estimated current campaign strength per platform based on content style and reach signals.`;
      setResult(await callClaude(apiKey, prompt)); stamp();
    } catch (e) { setError("Error: " + e.message); }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader icon="📰" title="Disinformation Detector" sub="Classify disinformation techniques, origin and narrative." accent="#ff4d4d" dataMode="ai" />

      <Card>
        <Input label="📄 Content" value={text} onChange={setText} placeholder="Paste article, social post, broadcast transcript..." rows={4} maxLength={4000} onKeyDown={handleKey} hint="Ctrl+Enter per analizzare" />
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn onClick={analyze} disabled={loading}>{loading ? "⏳ Analyzing..." : "Analyze Content"}</Btn>
          <LastAnalysisTag toolId="disinfo" />
        </div>
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
                <ExportBtn data={result} filename="sentinel-disinfo" />
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4, marginTop: 8 }}>CONFIDENCE</div>
                <div style={{ color: "#ffd700", fontWeight: 800, fontSize: 26, lineHeight: 1 }}>{result.confidence}%</div>
              </div>
            </div>

            <div style={{ background: "#0d1626", borderRadius: 3, height: 6, marginBottom: 12 }}>
              <div style={{ background: verdictColor(result.verdict), height: 6, borderRadius: 3, width: `${result.confidence}%`, transition: "width 0.4s" }} />
            </div>

            {/* E1 — spread velocity sparkline */}
            <SpreadVelocitySparkline data={result.spread_velocity} />

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

          {/* E1 — platform campaign intensity chart */}
          {result.platform_intensity && (
            <Card>
              <ST icon="📡" label="Platform Spread Analysis" color="#1DA1F2" sub="7-day campaign intensity across social platforms" style={{ marginBottom: 14 }} />
              <CampaignIntensityChart pi={result.platform_intensity} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
