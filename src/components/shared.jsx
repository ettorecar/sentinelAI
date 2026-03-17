import { useState } from "react";

export const BADGE = ({ text, color }) => {
  const c = { green: "#00ff9d", yellow: "#ffd700", red: "#ff4d4d", blue: "#4db8ff", gray: "#555", orange: "#ff9d00" };
  const bg = c[color] || color || c.gray;
  return (
    <span style={{
      background: `${bg}22`, color: bg,
      border: `1px solid ${bg}55`,
      borderRadius: 4, padding: "2px 7px",
      fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
      letterSpacing: "0.5px",
    }}>
      {text}
    </span>
  );
};

export const Card = ({ children, style, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const isClickable = !!onClick;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => isClickable && setHovered(false)}
      style={{
        background: hovered ? "#141e30" : "#111827",
        border: `1px solid ${hovered ? "#2a3f5f" : "#1f2d45"}`,
        borderRadius: 10, padding: 20, marginBottom: 14,
        cursor: isClickable ? "pointer" : "default",
        transition: "background 0.15s, border-color 0.15s",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Input = ({ label, value, onChange, placeholder, type = "text", rows }) => {
  const [focused, setFocused] = useState(false);
  const baseStyle = {
    width: "100%", background: "#0d1626",
    border: `1px solid ${focused ? "#00ff9d55" : "#1f2d45"}`,
    borderRadius: 6, padding: 10, color: "#e2e8f0", fontSize: 14,
    resize: "vertical", boxSizing: "border-box",
    outline: "none", transition: "border-color 0.2s",
    fontFamily: "inherit",
  };
  const handlers = {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 6, letterSpacing: "0.3px" }}>{label}</div>}
      {rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={baseStyle} {...handlers} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={baseStyle} {...handlers} />
      }
    </div>
  );
};

export const Btn = ({ onClick, children, disabled, color = "#00ff9d", size = "md" }) => {
  const [hovered, setHovered] = useState(false);
  const pad = size === "sm" ? "6px 14px" : "10px 22px";
  const fs = size === "sm" ? 12 : 14;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: disabled ? "#1a2234" : hovered ? color : `${color}22`,
        color: disabled ? "#3a4a5c" : hovered ? "#0a0f1e" : color,
        border: `1px solid ${disabled ? "#1f2d45" : hovered ? color : `${color}55`}`,
        borderRadius: 6, padding: pad,
        fontWeight: 700, fontSize: fs, cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
        letterSpacing: "0.3px",
      }}
    >
      {children}
    </button>
  );
};

// Section Title — left accent bar + label
export const ST = ({ icon, label, color = "#4db8ff", sub }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 3, height: 18, background: color, borderRadius: 2, flexShrink: 0 }} />
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      <span style={{ fontWeight: 700, color, fontSize: 13, letterSpacing: "0.3px" }}>{label}</span>
    </div>
    {sub && <div style={{ color: "#4a5568", fontSize: 11, marginTop: 4, paddingLeft: 11 }}>{sub}</div>}
  </div>
);

export const MockBadge = () => <BADGE text="Mock Data" color="yellow" />;
export const LiveBadge = () => <BADGE text="AI Live" color="green" />;

export const Pulse = ({ color = "#ff4d4d", size = 10 }) => (
  <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
    <span style={{ position: "absolute", borderRadius: "50%", background: color, width: size, height: size, animation: "sentinelPulse 1.5s infinite" }} />
    <span style={{ position: "absolute", borderRadius: "50%", background: color, width: size, height: size, opacity: 0.4, animation: "sentinelRing 1.5s infinite" }} />
    <style>{`
      @keyframes sentinelPulse{0%,100%{opacity:1}50%{opacity:0.5}}
      @keyframes sentinelRing{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.8);opacity:0}}
    `}</style>
  </span>
);

export const Spark = ({ data, color }) => {
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 55},${18 - ((v / max) * 16)}`).join(" ");
  return (
    <svg viewBox="0 0 55 20" style={{ width: 55, height: 20 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

export const riskColor = r =>
  r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";

export const riskBadgeColor = r =>
  r === "CRITICAL" || r === "HIGH" ? "red" : r === "MEDIUM" ? "yellow" : "green";

// Horizontal divider with optional label
export const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 16px" }}>
    <div style={{ flex: 1, height: 1, background: "#1f2d45" }} />
    {label && <span style={{ color: "#3a4a5c", fontSize: 10, letterSpacing: 2, fontWeight: 600 }}>{label}</span>}
    <div style={{ flex: 1, height: 1, background: "#1f2d45" }} />
  </div>
);
