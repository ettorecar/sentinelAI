import { useState } from "react";
import { BADGE, Card, ST, Btn, MockBadge, riskColor, riskBadgeColor } from "../components/shared";

const countries = ["Germany", "Italy", "France", "Poland", "Japan", "South Korea", "India", "Turkey"];

const profiles = {
  Germany:      { import_dep: 95, vulnerability: "HIGH",     storage_days: 65, alt_score: 62, resilience_score: 58, chokepoint_exposure: ["Bab-el-Mandeb (LNG)", "Danish Straits (pipeline)"], top_suppliers: [{ name: "Norway", pct: 32, risk: "LOW" }, { name: "USA", pct: 18, risk: "LOW" }, { name: "Russia", pct: 12, risk: "CRITICAL" }, { name: "Algeria", pct: 11, risk: "MEDIUM" }, { name: "Others", pct: 27, risk: "LOW" }], scenarios: [{ name: "Russian gas cutoff", impact: "HIGH", gdp_loss: "1.8%", duration: "12–18 mo" }, { name: "Norwegian field disruption", impact: "MEDIUM", gdp_loss: "0.9%", duration: "3–6 mo" }, { name: "LNG terminal cyberattack", impact: "HIGH", gdp_loss: "1.2%", duration: "2–4 mo" }] },
  Italy:        { import_dep: 90, vulnerability: "HIGH",     storage_days: 55, alt_score: 55, resilience_score: 51, chokepoint_exposure: ["Strait of Hormuz (LNG)", "Bab-el-Mandeb (LNG)", "Suez Canal"],                top_suppliers: [{ name: "Algeria", pct: 31, risk: "MEDIUM" }, { name: "Russia", pct: 12, risk: "CRITICAL" }, { name: "Azerbaijan", pct: 15, risk: "MEDIUM" }, { name: "Libya", pct: 10, risk: "HIGH" }, { name: "Others", pct: 32, risk: "LOW" }],    scenarios: [{ name: "Libyan pipeline disruption", impact: "HIGH", gdp_loss: "1.4%", duration: "6–12 mo" }, { name: "Algerian political instability", impact: "HIGH", gdp_loss: "1.6%", duration: "12–24 mo" }, { name: "Strait of Hormuz closure", impact: "MEDIUM", gdp_loss: "0.7%", duration: "1–3 mo" }] },
  France:       { import_dep: 98, vulnerability: "MEDIUM",   storage_days: 90, alt_score: 72, resilience_score: 70, chokepoint_exposure: ["Bab-el-Mandeb (LNG)"],                                                        top_suppliers: [{ name: "Norway", pct: 36, risk: "LOW" }, { name: "USA", pct: 22, risk: "LOW" }, { name: "Algeria", pct: 14, risk: "MEDIUM" }, { name: "Russia", pct: 7, risk: "CRITICAL" }, { name: "Others", pct: 21, risk: "LOW" }],     scenarios: [{ name: "Norwegian field disruption", impact: "MEDIUM", gdp_loss: "0.8%", duration: "3–6 mo" }, { name: "Algerian instability", impact: "MEDIUM", gdp_loss: "0.6%", duration: "6–12 mo" }] },
  Poland:       { import_dep: 96, vulnerability: "MEDIUM",   storage_days: 75, alt_score: 68, resilience_score: 65, chokepoint_exposure: ["Danish Straits", "Bab-el-Mandeb (LNG)"],                                       top_suppliers: [{ name: "Norway", pct: 28, risk: "LOW" }, { name: "USA LNG", pct: 25, risk: "LOW" }, { name: "Qatar", pct: 18, risk: "MEDIUM" }, { name: "Russia", pct: 5, risk: "CRITICAL" }, { name: "Others", pct: 24, risk: "LOW" }],   scenarios: [{ name: "Baltic pipeline sabotage", impact: "HIGH", gdp_loss: "1.1%", duration: "3–9 mo" }] },
  Japan:        { import_dep: 99, vulnerability: "CRITICAL",  storage_days: 45, alt_score: 40, resilience_score: 38, chokepoint_exposure: ["Strait of Malacca", "Strait of Hormuz", "Taiwan Strait"],                     top_suppliers: [{ name: "Australia", pct: 39, risk: "LOW" }, { name: "Malaysia", pct: 13, risk: "LOW" }, { name: "Qatar", pct: 11, risk: "MEDIUM" }, { name: "Russia", pct: 9, risk: "HIGH" }, { name: "Others", pct: 28, risk: "LOW" }],       scenarios: [{ name: "Strait of Malacca closure", impact: "CRITICAL", gdp_loss: "3.2%", duration: "indefinite" }, { name: "Hormuz disruption", impact: "HIGH", gdp_loss: "2.1%", duration: "6–12 mo" }, { name: "Conflict in Taiwan Strait", impact: "CRITICAL", gdp_loss: "4.0%", duration: "indefinite" }] },
  "South Korea":{ import_dep:100, vulnerability: "CRITICAL",  storage_days: 40, alt_score: 42, resilience_score: 41, chokepoint_exposure: ["Strait of Malacca", "Strait of Hormuz", "Taiwan Strait"],                     top_suppliers: [{ name: "Qatar", pct: 24, risk: "MEDIUM" }, { name: "Australia", pct: 21, risk: "LOW" }, { name: "USA", pct: 16, risk: "LOW" }, { name: "Malaysia", pct: 11, risk: "LOW" }, { name: "Others", pct: 28, risk: "LOW" }],          scenarios: [{ name: "Malacca closure", impact: "CRITICAL", gdp_loss: "2.8%", duration: "indefinite" }, { name: "Hormuz disruption", impact: "HIGH", gdp_loss: "1.9%", duration: "6–12 mo" }] },
  India:        { import_dep: 87, vulnerability: "HIGH",     storage_days: 30, alt_score: 50, resilience_score: 44, chokepoint_exposure: ["Strait of Hormuz", "Bab-el-Mandeb"],                                           top_suppliers: [{ name: "Iraq", pct: 22, risk: "MEDIUM" }, { name: "Saudi Arabia", pct: 18, risk: "HIGH" }, { name: "Russia", pct: 17, risk: "HIGH" }, { name: "UAE", pct: 10, risk: "MEDIUM" }, { name: "Others", pct: 33, risk: "LOW" }],       scenarios: [{ name: "Hormuz closure", impact: "CRITICAL", gdp_loss: "2.5%", duration: "6–18 mo" }, { name: "Bab-el-Mandeb disruption", impact: "HIGH", gdp_loss: "1.3%", duration: "3–9 mo" }] },
  Turkey:       { import_dep: 99, vulnerability: "CRITICAL",  storage_days: 28, alt_score: 38, resilience_score: 35, chokepoint_exposure: ["Turkish Straits", "Strait of Hormuz (LNG)"],                                  top_suppliers: [{ name: "Russia", pct: 33, risk: "CRITICAL" }, { name: "Azerbaijan", pct: 20, risk: "MEDIUM" }, { name: "Iran", pct: 10, risk: "HIGH" }, { name: "Algeria", pct: 8, risk: "MEDIUM" }, { name: "Others", pct: 29, risk: "LOW" }],       scenarios: [{ name: "Russian gas cutoff", impact: "CRITICAL", gdp_loss: "3.5%", duration: "indefinite" }, { name: "Bosphorus closure", impact: "CRITICAL", gdp_loss: "2.8%", duration: "indefinite" }] },
};

function DonutChart({ suppliers, import_dep }) {
  let angle = -90;
  const r = 42, cx = 60, cy = 60;
  const colors = ["#4db8ff", "#00ff9d", "#ffd700", "#ff9d00", "#b47fff"];
  const slices = suppliers.map(s => { const a = (s.pct / 100) * 360; const start = angle; angle += a; return { ...s, startAngle: start, endAngle: start + a }; });
  const toXY = (cx, cy, r, deg) => { const rad = deg * Math.PI / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; };
  return (
    <svg viewBox="0 0 120 120" style={{ width: 120, height: 120 }}>
      {slices.map((s, i) => {
        const [x1, y1] = toXY(cx, cy, r, s.startAngle);
        const [x2, y2] = toXY(cx, cy, r, s.endAngle);
        const large = s.pct > 50 ? 1 : 0;
        const color = s.risk === "CRITICAL" ? "#ff0000" : s.risk === "HIGH" ? "#ff4d4d" : s.risk === "MEDIUM" ? "#ffd700" : colors[i % colors.length];
        return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={color} opacity="0.85" stroke="#111827" strokeWidth="1.5" />;
      })}
      <circle cx={cx} cy={cy} r={25} fill="#111827" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="bold">{import_dep}%</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#9ca3af" fontSize="7">import</text>
    </svg>
  );
}

export default function EnergyRisk() {
  const [country, setCountry] = useState("Germany");
  const [ran, setRan] = useState(false);
  const p = profiles[country];

  return (
    <div>
      <h2 style={{ color: "#ff9d00", marginTop: 0 }}>📊 Energy Supply Chain Risk Analyzer</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 16 }}>National energy dependency analysis and disruption scenario modeling. <MockBadge /></p>

      <Card>
        <ST icon="🌍" label="Select Country" color="#4db8ff" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {countries.map(c => (
            <button key={c} onClick={() => { setCountry(c); setRan(false); }}
              style={{ background: country === c ? "#ff9d00" : "#1f2d45", color: country === c ? "#0a0f1e" : "#9ca3af", border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: country === c ? 700 : 400 }}>{c}</button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <Btn onClick={() => setRan(true)} color="#ff9d00">⚡ Analyze Risk Profile</Btn>
        </div>
      </Card>

      {ran && p && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
            {[["Import Dependency", p.import_dep + "%", "#ff9d00"], ["Vulnerability", p.vulnerability, riskColor(p.vulnerability)], ["Storage Days", p.storage_days + "d", "#4db8ff"], ["Resilience Score", p.resilience_score + "/100", p.resilience_score > 65 ? "#00ff9d" : p.resilience_score > 45 ? "#ffd700" : "#ff4d4d"]].map(([l, v, c]) => (
              <Card key={l} style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>{l}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Card>
              <ST icon="🥧" label="Supplier Mix" color="#ff9d00" />
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <DonutChart suppliers={p.top_suppliers} import_dep={p.import_dep} />
                <div style={{ flex: 1 }}>
                  {p.top_suppliers.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: riskColor(s.risk), flexShrink: 0 }} />
                        <span style={{ color: "#e2e8f0", fontSize: 12 }}>{s.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#ff9d00", fontWeight: 700, fontSize: 12 }}>{s.pct}%</span>
                        <BADGE text={s.risk} color={riskBadgeColor(s.risk)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <ST icon="🛡️" label="Resilience Assessment" color="#00ff9d" />
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#9ca3af", fontSize: 12 }}>Overall Resilience Score</span>
                  <span style={{ color: p.resilience_score > 65 ? "#00ff9d" : p.resilience_score > 45 ? "#ffd700" : "#ff4d4d", fontWeight: 800 }}>{p.resilience_score}/100</span>
                </div>
                <div style={{ background: "#1f2d45", borderRadius: 6, height: 14 }}>
                  <div style={{ background: p.resilience_score > 65 ? "#00ff9d" : p.resilience_score > 45 ? "#ffd700" : "#ff4d4d", height: 14, borderRadius: 6, width: `${p.resilience_score}%`, transition: "width 1s" }} />
                </div>
              </div>
              {[["Alternative Supply Score", p.alt_score], ["Storage Coverage", Math.min(100, p.storage_days)], ["Diversification", 100 - p.top_suppliers[0].pct]].map(([l, v]) => (
                <div key={l} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ color: "#9ca3af", fontSize: 11 }}>{l}</span>
                    <span style={{ color: "#e2e8f0", fontSize: 11 }}>{v}/100</span>
                  </div>
                  <div style={{ background: "#1f2d45", borderRadius: 3, height: 6 }}>
                    <div style={{ background: "#4db8ff", height: 6, borderRadius: 3, width: `${v}%` }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 5 }}>CHOKEPOINT EXPOSURE</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {p.chokepoint_exposure.map((c, i) => <BADGE key={i} text={c} color="orange" />)}
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <ST icon="💥" label="Disruption Scenarios" color="#ff4d4d" />
            {p.scenarios.map((s, i) => (
              <div key={i} style={{ background: "#0d1626", borderRadius: 7, padding: "11px 14px", marginBottom: 8, borderLeft: `3px solid ${riskColor(s.impact)}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{s.name}</div>
                  <BADGE text={s.impact} color={s.impact === "CRITICAL" || s.impact === "HIGH" ? "red" : "yellow"} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><span style={{ color: "#9ca3af", fontSize: 11 }}>EST. GDP IMPACT </span><span style={{ color: "#ff4d4d", fontWeight: 700 }}>{s.gdp_loss}</span></div>
                  <div><span style={{ color: "#9ca3af", fontSize: 11 }}>DURATION </span><span style={{ color: "#ffd700" }}>{s.duration}</span></div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
