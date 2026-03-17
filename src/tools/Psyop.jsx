import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, MockBadge } from "../components/shared";
import { RC } from "../constants";

const techniques = [
  { name: "Fear Appeal",        desc: "Exaggerates threats to bypass rational analysis",    severity: "HIGH",   val: 91 },
  { name: "In-group/Out-group", desc: "Us-vs-them narrative to polarise",                  severity: "HIGH",   val: 85 },
  { name: "False Urgency",      desc: "Artificial pressure prevents evaluation",            severity: "MEDIUM", val: 67 },
  { name: "Authority Spoofing", desc: "Mimics institutional language",                      severity: "MEDIUM", val: 72 },
];

export default function Psyop() {
  const [content, setContent] = useState("");
  const [ran, setRan] = useState(false);

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>🧠 PSYOP Content Analyzer</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>Identify psychological operation techniques in media. <MockBadge /></p>

      <Card>
        <Input label="📄 Content" value={content} onChange={setContent} placeholder="Paste text or transcript..." rows={5} />
        <Btn onClick={() => setRan(true)} disabled={!content}>Analyze</Btn>
      </Card>

      {ran && (
        <>
          <Card style={{ borderColor: "#ff4d4d" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#ff4d4d" }}>PSYOP DETECTED</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>CONFIDENCE</div>
                <div style={{ color: "#ffd700", fontWeight: 800, fontSize: 22 }}>91%</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>TARGET EFFECT</div>
                <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 2 }}>Demoralisation and distrust of institutions</div>
              </div>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>ORIGIN</div>
                <div style={{ color: "#ffd700", fontSize: 13, marginTop: 2 }}>State-sponsored influence op</div>
              </div>
            </div>
          </Card>

          <Card>
            <ST icon="🎭" label="Techniques" color="#ff4d4d" />
            {techniques.map((t, i) => (
              <div key={i} style={{ background: "#0d1626", borderRadius: 6, padding: "9px 12px", marginBottom: 7, borderLeft: `3px solid ${RC[t.severity]}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{t.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ color: "#ffd700", fontSize: 12, fontWeight: 700 }}>{t.val}%</span>
                    <BADGE text={t.severity} color={t.severity === "HIGH" ? "red" : "yellow"} />
                  </div>
                </div>
                <div style={{ background: "#111827", borderRadius: 3, height: 5, marginBottom: 3 }}>
                  <div style={{ background: RC[t.severity], height: 5, borderRadius: 3, width: `${t.val}%` }} />
                </div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>{t.desc}</div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
