import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, MockBadge } from "../components/shared";

const timeline = [
  { day: "Mon–Fri",  time: "06:45", location: "Residential, Zone B",  exposure: "LOW"    },
  { day: "Mon–Fri",  time: "07:30", location: "Central Station",       exposure: "MEDIUM" },
  { day: "Mon–Fri",  time: "08:00", location: "Office District",       exposure: "LOW"    },
  { day: "Tue/Thu",  time: "18:15", location: "Sports Centre",         exposure: "MEDIUM" },
  { day: "Saturday", time: "10:00", location: "Open Market",           exposure: "HIGH"   },
  { day: "Variable", time: "21:00", location: "Restaurant district",   exposure: "HIGH"   },
];
const heatmap = [
  [1,1,1,1,1,0,0],
  [0,1,1,1,1,0,0],
  [0,0,1,1,0,0,0],
  [0,0,0,0,0,1,0],
  [0,0,0,1,0,1,0],
  [0,0,0,0,0,0,1],
];
const days  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const slots = ["06–09","09–12","12–15","15–18","18–21","21–24"];

export default function PatLife() {
  const [subject, setSubject] = useState("");
  const [ran, setRan] = useState(false);

  return (
    <div>
      <h2 style={{ color: "#00ff9d", marginTop: 0 }}>📍 Pattern-of-Life Analyzer</h2>
      <p style={{ color: "#9ca3af", marginTop: -8, marginBottom: 20 }}>Spatio-temporal behaviour reconstruction. <MockBadge /></p>

      <Card>
        <Input label="🎯 Subject" value={subject} onChange={setSubject} placeholder="Subject Alpha, plate, username..." />
        <Btn onClick={() => setRan(true)}>Analyze</Btn>
      </Card>

      {ran && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
            {[["Predictability", "78%", "#ff4d4d"], ["Sources", "6", "#4db8ff"], ["Exposures", "3", "#ffd700"]].map(([l, v, c]) => (
              <Card key={l} style={{ textAlign: "center", padding: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>{l}</div>
              </Card>
            ))}
          </div>

          <Card>
            <ST icon="🗓️" label="Activity Heatmap" color="#4db8ff" />
            <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ color: "#9ca3af", padding: "2px 5px", fontWeight: 400 }}></th>
                  {days.map(d => <th key={d} style={{ color: "#9ca3af", padding: "2px 5px", fontWeight: 400, minWidth: 34 }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {slots.map((s, si) => (
                  <tr key={s}>
                    <td style={{ color: "#9ca3af", padding: "2px 5px", fontSize: 10 }}>{s}</td>
                    {days.map((_, di) => (
                      <td key={di} style={{ padding: 2 }}>
                        <div style={{ width: 30, height: 18, background: heatmap[si][di] ? "#ff4d4d22" : "#0d1626", border: `1px solid ${heatmap[si][di] ? "#ff4d4d" : "#1f2d45"}`, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {heatmap[si][di] && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4d4d" }} />}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <ST icon="🕐" label="Timeline" color="#4db8ff" />
            {timeline.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid #0d1626" }}>
                <div style={{ minWidth: 60, color: "#9ca3af", fontSize: 11 }}>{r.day}</div>
                <div style={{ minWidth: 45, color: "#e2e8f0", fontFamily: "monospace", fontSize: 11 }}>{r.time}</div>
                <div style={{ flex: 1, color: "#9ca3af", fontSize: 12 }}>{r.location}</div>
                <BADGE text={r.exposure} color={r.exposure === "HIGH" ? "red" : r.exposure === "MEDIUM" ? "yellow" : "green"} />
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
