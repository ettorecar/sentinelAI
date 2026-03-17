import { useState, useEffect } from "react";
import { BADGE, Card, ST, PageHeader, StatBar, Spark, Btn, LiveBadge, riskColor, riskBadgeColor } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

async function callClaude(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 750, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

const chokepoints = [
  { id: "CP-01", name: "Strait of Hormuz",    location: "Persian Gulf",          mx: 455, my: 188, risk: "CRITICAL", flow: "21Mb/d", pct: "21%", tension: "Extreme",  threats: ["Iranian naval exercises", "Mine laying reports", "Drone harassment of tankers"],        altRoute: "None — no viable alternative",                        history: [18, 19, 20, 21, 20, 19, 21] },
  { id: "CP-02", name: "Strait of Malacca",   location: "SE Asia",               mx: 590, my: 215, risk: "HIGH",     flow: "16Mb/d", pct: "16%", tension: "Elevated", threats: ["Piracy incidents up 40%", "Territorial disputes", "Cyber attacks on port systems"],    altRoute: "Lombok Strait (+4 days transit)",                      history: [14, 15, 15, 16, 16, 15, 16] },
  { id: "CP-03", name: "Bab-el-Mandeb",       location: "Red Sea / Yemen",       mx: 405, my: 218, risk: "CRITICAL", flow: "8.8Mb/d",pct: "9%",  tension: "Extreme",  threats: ["Houthi missile attacks", "Drone boats", "Coalition naval response"],                  altRoute: "Cape of Good Hope (+15 days, +$1.2M/voyage)",          history: [9, 8, 7, 6, 5, 4, 4] },
  { id: "CP-04", name: "Suez Canal",          location: "Egypt",                 mx: 375, my: 178, risk: "MEDIUM",   flow: "5.5Mb/d", pct: "5%",  tension: "Moderate", threats: ["Diversion due to Houthi threat", "Congestion incidents"],                            altRoute: "Cape of Good Hope or SUMED pipeline",                  history: [7, 7, 6, 6, 5, 5, 6] },
  { id: "CP-05", name: "Turkish Straits",     location: "Bosphorus/Dardanelles", mx: 365, my: 138, risk: "MEDIUM",   flow: "2.4Mb/d", pct: "2%",  tension: "Moderate", threats: ["Russian Black Sea fleet movements", "Sanctions complications"],                      altRoute: "Trans-Anatolian Pipeline (TANAP)",                     history: [3, 3, 2, 2, 2, 2, 2] },
  { id: "CP-06", name: "Danish Straits",      location: "North Sea",             mx: 322, my: 88,  risk: "LOW",      flow: "1.5Mb/d", pct: "1%",  tension: "Low",      threats: ["Occasional Russian submarine activity"],                                              altRoute: "Pipeline alternatives available",                      history: [1, 1, 2, 1, 1, 2, 1] },
];

export default function Chokepoint() {
  const [apiKey] = useApiKey();
  const [sel, setSel] = useState(null);
  const [tick, setTick] = useState(0);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1800); return () => clearInterval(t); }, []);

  async function analyzeChokepoint(cp) {
    setAiResult(null); setAiError(""); setAiLoading(true);
    try {
      const text = await callClaude(apiKey, `You are a geopolitical energy analyst. Analyze this strategic chokepoint in 3-4 sentences covering: current geopolitical situation, threat actors and their intent, economic impact of a closure, and recommended diplomatic/military posture. Chokepoint: ${cp.name} (${cp.location}, Flow: ${cp.flow} = ${cp.pct} of global trade, Tension: ${cp.tension}). Active threats: ${cp.threats.join("; ")}.`);
      setAiResult(text);
    } catch (e) { setAiError("Error: " + e.message); }
    setAiLoading(false);
  }

  return (
    <div>
      <PageHeader icon="🚢" title="Strategic Chokepoint Monitor" sub="Global maritime energy chokepoints — flow, tension and disruption risk." accent="#ff9d00" mock />

      <StatBar stats={[
        { label: "Total Flow",         value: "55Mb/d", color: "#ff9d00" },
        { label: "Critical",           value: "2",      color: "#ff4d4d" },
        { label: "Extreme Tension",    value: "2",      color: "#ff4d4d" },
        { label: "Rerouting Events",   value: "3",      color: "#ffd700" },
      ]} />

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px 0", fontWeight: 700, color: "#4db8ff" }}>🗺️ Global Chokepoint Map — Click for detail</div>
        <svg viewBox="0 0 700 310" style={{ width: "100%", background: "#050d1a", display: "block" }}>
          {[65, 125, 195, 265].map(y => <line key={y} x1={0} y1={y} x2={700} y2={y} stroke="#0d2040" strokeWidth="1" />)}
          {[0, 140, 280, 420, 560, 700].map(x => <line key={x} x1={x} y1={0} x2={x} y2={310} stroke="#0d2040" strokeWidth="1" />)}
          <path d="M 60 78 Q 80 60 120 64 Q 150 59 175 79 Q 185 99 180 129 Q 170 158 155 178 Q 140 198 120 208 Q 100 193 85 173 Q 65 148 55 119 Q 48 93 60 78Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 145 218 Q 165 213 180 228 Q 190 248 185 278 Q 178 308 165 316 Q 150 318 138 306 Q 125 288 125 258 Q 125 236 145 218Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 293 68 Q 330 58 365 68 Q 385 78 390 98 Q 385 113 365 116 Q 340 120 315 113 Q 293 103 288 88 Q 286 76 293 68Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 293 128 Q 330 123 360 133 Q 375 153 372 183 Q 368 218 355 246 Q 338 266 318 263 Q 298 258 288 236 Q 278 208 280 178 Q 282 150 293 128Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 398 63 Q 468 53 538 63 Q 598 68 648 83 Q 683 98 693 123 Q 688 148 663 158 Q 628 166 588 160 Q 543 153 498 146 Q 453 138 418 126 Q 393 113 388 93 Q 388 76 398 63Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 598 253 Q 638 248 668 261 Q 683 278 676 298 Q 663 313 638 313 Q 613 310 603 293 Q 594 275 598 253Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1" />
          <path d="M 455 188 Q 430 200 405 218" fill="none" stroke="#ff9d00" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
          <path d="M 405 218 Q 390 200 375 178" fill="none" stroke="#ff9d00" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
          <path d="M 455 188 Q 520 200 590 215" fill="none" stroke="#ff9d00" strokeWidth="1" strokeDasharray="4" opacity="0.4" />
          {chokepoints.map((cp, i) => {
            const c = riskColor(cp.risk);
            const pulse = (tick + i * 3) % 10;
            const crit = cp.risk === "CRITICAL";
            return (
              <g key={cp.id} onClick={() => setSel(sel?.id === cp.id ? null : cp)} style={{ cursor: "pointer" }}>
                {crit && <circle cx={cp.mx} cy={cp.my} r={14 + pulse * 1.2} fill="none" stroke={c} strokeWidth="0.8" opacity={Math.max(0, 0.5 - pulse * 0.05)} />}
                <circle cx={cp.mx} cy={cp.my} r={crit ? 10 : 7} fill={c} opacity={0.85} />
                <circle cx={cp.mx} cy={cp.my} r={crit ? 15 : 11} fill="none" stroke={c} strokeWidth="1.5" opacity="0.3" />
                <text x={cp.mx} y={cp.my - 16} textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="bold">{cp.name.split(" ").slice(-1)[0]}</text>
                <text x={cp.mx} y={cp.my + 4} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold">{cp.flow}</text>
              </g>
            );
          })}
          {[["CRITICAL", "#ff0000", 10], ["HIGH", "#ff4d4d", 72], ["MEDIUM", "#ffd700", 128], ["LOW", "#00ff9d", 186]].map(([l, c, x]) => (
            <g key={l}><circle cx={x + 7} cy={298} r={5} fill={c} /><text x={x + 15} y={302} fill="#9ca3af" fontSize="8">{l}</text></g>
          ))}
        </svg>
      </Card>

      {sel && (
        <Card style={{ borderColor: riskColor(sel.risk), borderWidth: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#e2e8f0" }}>{sel.name}</div>
              <div style={{ color: "#9ca3af", fontSize: 13 }}>{sel.location}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <BADGE text={sel.risk} color={riskBadgeColor(sel.risk)} />
              <div style={{ color: "#ff9d00", fontWeight: 800, fontSize: 20, marginTop: 4 }}>{sel.flow}</div>
              <div style={{ color: "#9ca3af", fontSize: 11 }}>{sel.pct} of global oil trade</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
              <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>ACTIVE THREATS</div>
              {sel.threats.map((t, i) => <div key={i} style={{ color: "#ffd700", fontSize: 12, marginBottom: 3 }}>• {t}</div>)}
            </div>
            <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
              <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>ALTERNATIVE ROUTE</div>
              <div style={{ color: "#e2e8f0", fontSize: 12 }}>{sel.altRoute}</div>
              <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 8, marginBottom: 2 }}>7-DAY FLOW TREND (Mb/d)</div>
              <Spark data={sel.history} color={riskColor(sel.risk)} />
            </div>
          </div>
          <div style={{ background: "#0d1626", borderRadius: 6, padding: 10, marginBottom: 12 }}>
            <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>TENSION LEVEL</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, background: "#1f2d45", borderRadius: 4, height: 10 }}>
                <div style={{ background: riskColor(sel.risk), height: 10, borderRadius: 4, width: sel.risk === "CRITICAL" ? "95%" : sel.risk === "HIGH" ? "75%" : sel.risk === "MEDIUM" ? "50%" : "25%", transition: "width 1s" }} />
              </div>
              <span style={{ color: riskColor(sel.risk), fontWeight: 700, fontSize: 14 }}>{sel.tension}</span>
            </div>
          </div>
          {apiKey && (
            <Btn onClick={() => analyzeChokepoint(sel)} disabled={aiLoading} color="#ff9d00" size="sm">
              {aiLoading ? "⏳ Analyzing..." : "🤖 AI Geopolitical Analysis"}
            </Btn>
          )}
          {aiError && <div style={{ color: "#ff4d4d", fontSize: 12, marginTop: 8 }}>{aiError}</div>}
          {aiResult && (
            <div style={{ background: "#0a0c00", border: "1px solid #ff9d0033", borderLeft: "3px solid #ff9d00", borderRadius: 6, padding: 12, marginTop: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <LiveBadge />
                <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>AI CHOKEPOINT ANALYSIS · {sel.id}</span>
              </div>
              <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7 }}>{aiResult}</div>
            </div>
          )}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
        {chokepoints.map(cp => (
          <Card key={cp.id} style={{ cursor: "pointer", borderColor: sel?.id === cp.id ? riskColor(cp.risk) : "#1f2d45", padding: 14 }}
            onClick={() => setSel(sel?.id === cp.id ? null : cp)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 14 }}>{cp.name}</div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>{cp.location}</div>
              </div>
              <BADGE text={cp.risk} color={riskBadgeColor(cp.risk)} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ color: "#ff9d00", fontWeight: 800, fontSize: 18 }}>{cp.flow}</div>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>{cp.pct} of global trade</div>
              </div>
              <Spark data={cp.history} color={riskColor(cp.risk)} />
            </div>
            <div style={{ background: "#1f2d45", borderRadius: 3, height: 5, marginTop: 8 }}>
              <div style={{ background: riskColor(cp.risk), height: 5, borderRadius: 3, width: cp.risk === "CRITICAL" ? "95%" : cp.risk === "HIGH" ? "75%" : cp.risk === "MEDIUM" ? "50%" : "25%" }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
