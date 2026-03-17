import { useState } from "react";
import { Card, Input, Btn, ST, MockBadge } from "../components/shared";

const bars = [
  ["Emotional Appeal", 87],
  ["False Attribution", 72],
  ["Coord. Behaviour", 91],
  ["Urgency Injection", 55],
  ["Authority Spoofing", 63],
];

export default function Disinfo() {
  const [text, setText] = useState("");
  const [ran, setRan] = useState(false);

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>📰 Disinformation Detector</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>Classify disinformation techniques, origin and narrative. <MockBadge /></p>

      <Card>
        <Input label="📄 Content" value={text} onChange={setText} placeholder="Paste article or social post..." rows={4} />
        <Btn onClick={() => setRan(true)} disabled={!text}>Analyze</Btn>
      </Card>

      {ran && (
        <>
          <Card style={{ borderColor: "#ff4d4d" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#ff4d4d" }}>LIKELY DISINFORMATION</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>CONFIDENCE</div>
                <div style={{ color: "#ffd700", fontWeight: 800, fontSize: 22 }}>87%</div>
              </div>
            </div>
            <div style={{ background: "#0d1626", borderRadius: 6, padding: 10 }}>
              <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 2 }}>NARRATIVE</div>
              <div style={{ color: "#e2e8f0" }}>NATO expansion as existential threat</div>
            </div>
          </Card>

          <Card>
            <ST icon="📊" label="Technique Intensity" color="#ff4d4d" />
            {bars.map(([l, v]) => (
              <div key={l} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ color: "#e2e8f0", fontSize: 12 }}>{l}</span>
                  <span style={{ color: "#ffd700", fontSize: 12, fontWeight: 700 }}>{v}%</span>
                </div>
                <div style={{ background: "#1f2d45", borderRadius: 4, height: 7 }}>
                  <div style={{ background: v > 80 ? "#ff4d4d" : v > 60 ? "#ffd700" : "#4db8ff", height: 7, borderRadius: 4, width: `${v}%` }} />
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
