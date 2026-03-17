export const BADGE = ({ text, color }) => {
  const c = { green: "#00ff9d", yellow: "#ffd700", red: "#ff4d4d", blue: "#4db8ff", gray: "#555", orange: "#ff9d00" };
  return (
    <span style={{ background: c[color] || color || c.gray, color: "#0a0f1e", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
};

export const Card = ({ children, style }) => (
  <div style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: 10, padding: 20, marginBottom: 14, ...style }}>
    {children}
  </div>
);

export const Input = ({ label, value, onChange, placeholder, type = "text", rows }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>{label}</div>}
    {rows
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
          style={{ width: "100%", background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 6, padding: 10, color: "#e2e8f0", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
      : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 6, padding: 10, color: "#e2e8f0", fontSize: 14, boxSizing: "border-box" }} />}
  </div>
);

export const Btn = ({ onClick, children, disabled, color = "#00ff9d" }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ background: disabled ? "#1f2d45" : color, color: disabled ? "#555" : "#0a0f1e", border: "none", borderRadius: 6, padding: "10px 22px", fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer" }}>
    {children}
  </button>
);

export const ST = ({ icon, label, color = "#4db8ff" }) => (
  <div style={{ fontWeight: 700, color, marginBottom: 12 }}>{icon} {label}</div>
);

export const MockBadge = () => <BADGE text="Mock Data" color="yellow" />;

export const LiveBadge = () => <BADGE text="AI Live" color="green" />;

export const Pulse = ({ color = "#ff4d4d", size = 10 }) => (
  <span style={{ position: "relative", display: "inline-block", width: size, height: size }}>
    <span style={{ position: "absolute", borderRadius: "50%", background: color, width: size, height: size, animation: "pulse 1.5s infinite" }} />
    <span style={{ position: "absolute", borderRadius: "50%", background: color, width: size, height: size, opacity: 0.4, transform: "scale(2)", animation: "pulseRing 1.5s infinite" }} />
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}} @keyframes pulseRing{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.5);opacity:0}}`}</style>
  </span>
);

export const Spark = ({ data, color }) => {
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 55},${18 - ((v / max) * 16)}`).join(" ");
  return <svg viewBox="0 0 55 20" style={{ width: 55, height: 20 }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
};

export const riskColor = r =>
  r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";

export const riskBadgeColor = r =>
  r === "CRITICAL" || r === "HIGH" ? "red" : r === "MEDIUM" ? "yellow" : "green";
