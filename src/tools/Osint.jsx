import { useState } from "react";
import { Card, Input, Btn, ST, MockBadge } from "../components/shared";

const nodes = [
  { id: "T-001", label: "Actor #1",      type: "Person",   risk: "HIGH",   x: 200, y: 80  },
  { id: "T-002", label: "Shell Corp XY", type: "Org",      risk: "MEDIUM", x: 360, y: 160 },
  { id: "T-003", label: "Port of Trieste",type: "Location", risk: "LOW",    x: 160, y: 220 },
  { id: "T-004", label: "Cargo 14/03",   type: "Event",    risk: "HIGH",   x: 300, y: 280 },
  { id: "T-005", label: "Actor #2",      type: "Person",   risk: "MEDIUM", x: 440, y: 280 },
  { id: "T-006", label: "Offshore Bank", type: "Org",      risk: "HIGH",   x: 80,  y: 140 },
];
const edges = [[0,1],[0,5],[1,2],[1,3],[1,4],[3,4]];
const cn = r => r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";

export default function Osint() {
  const [query, setQuery] = useState("");
  const [ran, setRan] = useState(false);

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>🔍 OSINT Correlation Engine</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>Entity correlation graphs from open-source intelligence. <MockBadge /></p>

      <Card>
        <Input label="🔎 Entity" value={query} onChange={setQuery} placeholder="Person name, company, vessel..." />
        <Btn onClick={() => setRan(true)}>Run Correlation</Btn>
      </Card>

      {ran && (
        <>
          <Card>
            <ST icon="📊" label="Entity Graph" color="#4db8ff" />
            <svg viewBox="0 0 520 320" style={{ width: "100%", background: "#0d1626", borderRadius: 8 }}>
              {edges.map(([a, b], i) => (
                <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke="#1f2d45" strokeWidth="2" strokeDasharray="4" />
              ))}
              {nodes.map((n, i) => (
                <g key={i}>
                  <circle cx={n.x} cy={n.y} r={22} fill="#111827" stroke={cn(n.risk)} strokeWidth="2" />
                  <text x={n.x} y={n.y - 28} textAnchor="middle" fill={cn(n.risk)} fontSize="10" fontWeight="bold">{n.label}</text>
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#9ca3af" fontSize="8">{n.type}</text>
                  <circle cx={n.x} cy={n.y} r={4} fill={cn(n.risk)} />
                </g>
              ))}
            </svg>
          </Card>
          <Card>
            <ST icon="🔗" label="Key Connections" color="#ffd700" />
            {[
              "Actor #1 → Shell Corp XY (financial, 3 tx)",
              "Shell Corp XY → Port of Trieste (logistics)",
              "Actor #1 → Offshore Bank (wire transfers)",
              "Cargo 14/03 → Actor #2 (timing correlation)",
            ].map((l, i) => (
              <div key={i} style={{ color: "#e2e8f0", fontSize: 13, marginBottom: 6, borderLeft: "2px solid #ffd700", paddingLeft: 12 }}>• {l}</div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
