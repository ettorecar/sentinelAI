import { useState, useEffect, useContext, createContext, useRef, useCallback } from "react";

// ── Toast context ──────────────────────────────────────────────────────────
const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, duration = 2400) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 20, zIndex: 9998, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: "#0d1626", border: "1px solid #00ff9d44",
            borderLeft: "3px solid #00ff9d",
            borderRadius: 6, padding: "9px 16px",
            color: "#e2e8f0", fontSize: 12, fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            animation: "sentinelSlideIn 0.2s ease",
            whiteSpace: "nowrap",
          }}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ── API key validation ─────────────────────────────────────────────────────
export function validateApiKey(key) {
  if (!key) return "Inserisci la API key Anthropic.";
  if (!key.startsWith("sk-ant-")) return "Formato non valido — deve iniziare con sk-ant-";
  if (key.length < 40) return "Key troppo corta — controlla di averla copiata per intero.";
  return null; // ok
}

// ── Download JSON utility ──────────────────────────────────────────────────
export function downloadJson(data, filename = "sentinel-export") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Last analysis hook + tag ───────────────────────────────────────────────
export function useLastAnalysis(toolId) {
  const KEY = `sentinel_last_${toolId}`;
  function stamp() { localStorage.setItem(KEY, String(Date.now())); }
  function read()  { return localStorage.getItem(KEY) ? Number(localStorage.getItem(KEY)) : null; }
  return { stamp, read };
}

export function LastAnalysisTag({ toolId }) {
  const KEY = `sentinel_last_${toolId}`;
  const [label, setLabel] = useState(null);
  useEffect(() => {
    function update() {
      const ts = localStorage.getItem(KEY);
      if (!ts) { setLabel(null); return; }
      const diff = Math.round((Date.now() - Number(ts)) / 60000);
      setLabel(diff === 0 ? "Analisi effettuata adesso" : diff === 1 ? "Analisi 1 minuto fa" : `Analisi ${diff} minuti fa`);
    }
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [KEY]);
  if (!label) return null;
  return (
    <span style={{ color: "#3a4a5c", fontSize: 10, fontStyle: "italic", letterSpacing: 0.3 }}>
      · {label}
    </span>
  );
}

// ── CountUp animation ──────────────────────────────────────────────────────
function useCountUp(target, duration = 700) {
  const n = parseInt(target, 10) || 0;
  const [val, setVal] = useState(0);
  const rafRef = useRef();
  useEffect(() => {
    if (n === 0) return;
    let start = null;
    function tick(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // ease-out: progress^0.5
      setVal(Math.floor(Math.sqrt(progress) * n));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else setVal(n);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [n, duration]);
  return val;
}

function AnimatedValue({ value }) {
  // Extract number + suffix from strings like "38", "67%", "72/100", "14 GW"
  const match = String(value).match(/^(\d+)(.*)/);
  const count = useCountUp(match ? parseInt(match[1], 10) : 0);
  if (!match) return <>{value}</>;
  return <>{count}{match[2]}</>;
}

// ── Global keyframe injector (render once in App) ─────────────────────────
export const GlobalStyles = () => (
  <style>{`
    @keyframes sentinelPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    @keyframes sentinelRing  { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(2.8);opacity:0} }
    @keyframes sentinelFlicker {
      0%,88%,92%,95%,100%{opacity:1} 89%{opacity:0.45} 91%{opacity:0.9} 93%{opacity:0.25}
    }
    @keyframes sentinelDash   { to { stroke-dashoffset: -20; } }
    @keyframes sentinelSlideIn {
      from { opacity:0; transform:translateY(-5px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes sentinelFadeIn {
      from { opacity:0; } to { opacity:1; }
    }
    @keyframes sentinelSweep {
      0%   { opacity:0.7; top:-1%; }
      85%  { opacity:0.2; }
      100% { opacity:0;   top:102%; }
    }
  `}</style>
);

// ── Badge ─────────────────────────────────────────────────────────────────
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

// ── Card ──────────────────────────────────────────────────────────────────
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

// ── Input ─────────────────────────────────────────────────────────────────
export const Input = ({ label, value, onChange, placeholder, type = "text", rows, maxLength, onKeyDown, onClear, hint }) => {
  const [focused, setFocused] = useState(false);
  const baseStyle = {
    width: "100%", background: "#0d1626",
    border: `1px solid ${focused ? "#00ff9d55" : "#1f2d45"}`,
    borderRadius: 6, padding: rows ? "10px 10px" : "10px 36px 10px 10px",
    color: "#e2e8f0", fontSize: 14,
    resize: "vertical", boxSizing: "border-box",
    outline: "none", transition: "border-color 0.2s",
    fontFamily: "inherit",
  };
  const handlers = {
    onFocus: () => setFocused(true),
    onBlur:  () => setFocused(false),
    onKeyDown,
  };
  const hasValue = String(value).length > 0;
  return (
    <div style={{ marginBottom: 14 }}>
      {/* Label row */}
      {(label || maxLength) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          {label && <div style={{ color: "#9ca3af", fontSize: 12, letterSpacing: "0.3px" }}>{label}</div>}
          {maxLength && (
            <div style={{ fontSize: 10, color: value.length > maxLength * 0.85 ? "#ffd700" : "#3a4a5c", fontVariantNumeric: "tabular-nums" }}>
              {value.length}/{maxLength}
            </div>
          )}
        </div>
      )}
      {/* Field wrapper */}
      <div style={{ position: "relative" }}>
        {rows
          ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} maxLength={maxLength} style={{ ...baseStyle, padding: "10px 10px" }} {...handlers} />
          : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} style={baseStyle} {...handlers} />
        }
        {/* Clear button — only on single-line inputs */}
        {!rows && onClear && hasValue && (
          <button onClick={onClear} tabIndex={-1} style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "#3a4a5c", cursor: "pointer",
            fontSize: 14, lineHeight: 1, padding: 2,
            transition: "color 0.15s",
          }}
          onMouseEnter={e => e.target.style.color = "#9ca3af"}
          onMouseLeave={e => e.target.style.color = "#3a4a5c"}>
            ✕
          </button>
        )}
      </div>
      {hint && <div style={{ color: "#4a5568", fontSize: 10, marginTop: 4 }}>{hint}</div>}
    </div>
  );
};

// ── Button ────────────────────────────────────────────────────────────────
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

// ── Section Title ─────────────────────────────────────────────────────────
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

// ── Badges ────────────────────────────────────────────────────────────────
export const MockBadge = () => <BADGE text="Mock Data" color="yellow" />;
export const LiveBadge = () => <BADGE text="AI Live" color="green" />;

// ── Data Mode pill config ──────────────────────────────────────────────────
const DATA_MODES = {
  ai:     { dot: "●", color: "#00ff9d", label: "AI LIVE",   desc: "Contenuto generato da Claude API in tempo reale" },
  hybrid: { dot: "◑", color: "#ff9d00", label: "MOCK + AI", desc: "Dati simulati · analisi AI disponibile su selezione" },
  mock:   { dot: "○", color: "#4a5568", label: "SIMULATO",  desc: "Scenario dimostrativo con dati sintetici" },
};

// ── Pulse dot ─────────────────────────────────────────────────────────────
export const Pulse = ({ color = "#ff4d4d", size = 10 }) => (
  <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
    <span style={{ position: "absolute", borderRadius: "50%", background: color, width: size, height: size, animation: "sentinelPulse 1.5s infinite" }} />
    <span style={{ position: "absolute", borderRadius: "50%", background: color, width: size, height: size, opacity: 0.4, animation: "sentinelRing 1.5s infinite" }} />
  </span>
);

// ── Sparkline ─────────────────────────────────────────────────────────────
export const Spark = ({ data, color }) => {
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 55},${18 - ((v / max) * 16)}`).join(" ");
  return (
    <svg viewBox="0 0 55 20" style={{ width: 55, height: 20 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

// ── Risk color helpers ────────────────────────────────────────────────────
export const riskColor = r =>
  r === "CRITICAL" ? "#ff0000" : r === "HIGH" ? "#ff4d4d" : r === "MEDIUM" ? "#ffd700" : "#00ff9d";

export const riskBadgeColor = r =>
  r === "CRITICAL" || r === "HIGH" ? "red" : r === "MEDIUM" ? "yellow" : "green";

// ── Page Header ───────────────────────────────────────────────────────────
export const PageHeader = ({ icon, title, sub, badges = [], accent = "#00ff9d", mock, classification, dataMode }) => {
  // resolve mode: explicit dataMode wins, else backward-compat mock flag
  const mode = DATA_MODES[dataMode] || (mock ? DATA_MODES.mock : null);
  return (
    <div style={{
      paddingBottom: 16, borderBottom: "1px solid #1f2d45", marginBottom: 20,
      borderLeft: `3px solid ${accent}33`, paddingLeft: 12,
      position: "relative",
    }}>
      {/* Classification badge */}
      {classification && (
        <div style={{
          position: "absolute", right: 0, top: 2,
          color: classification.startsWith("TOP") ? "#ff4d4d" : classification === "SECRET" ? "#ff9d00" : "#3a4a5c",
          fontSize: 8, fontWeight: 700, letterSpacing: 2, fontFamily: "monospace",
          border: `1px solid ${classification.startsWith("TOP") ? "#ff4d4d22" : "#1f2d45"}`,
          borderRadius: 3, padding: "2px 7px",
          background: classification.startsWith("TOP") ? "#1a050522" : "#0d1626",
        }}>
          {classification}
        </div>
      )}
      <div style={{ color: "#3a4a5c", fontSize: 9, letterSpacing: 4, marginBottom: 8, fontWeight: 600 }}>
        SENTINEL · {title.toUpperCase()}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#e2e8f0", letterSpacing: -0.5 }}>{title}</h2>
      </div>
      {sub && <div style={{ color: "#4a5568", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>{sub}</div>}

      {/* Data mode pill */}
      {mode && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
          <span style={{ color: mode.color, fontSize: 12, lineHeight: 1 }}>{mode.dot}</span>
          <span style={{
            background: `${mode.color}18`, color: mode.color,
            border: `1px solid ${mode.color}44`,
            borderRadius: 3, padding: "1px 6px",
            fontSize: 9, fontWeight: 700, letterSpacing: 1.5, whiteSpace: "nowrap",
          }}>{mode.label}</span>
          <span style={{ color: "#3a4a5c", fontSize: 10 }}>·</span>
          <span style={{ color: "#4a5568", fontSize: 10 }}>{mode.desc}</span>
        </div>
      )}

      {badges.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: mode ? 6 : 8, flexWrap: "wrap" }}>
          {badges.map((b, i) => <BADGE key={i} text={b.text} color={b.color || accent} />)}
        </div>
      )}
    </div>
  );
};

// ── Stat bar ──────────────────────────────────────────────────────────────
export const StatBar = ({ stats }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${Math.max(80, Math.floor(300 / stats.length))}px), 1fr))`, gap: 10, marginBottom: 16 }}>
    {stats.map(({ label, value, color = "#00ff9d", sub, trend }) => (
      <div key={label} style={{
        background: "#0d1626", border: "1px solid #1f2d45",
        borderTop: `2px solid ${color}`,
        borderRadius: 8, padding: "12px 14px", textAlign: "center",
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          <AnimatedValue value={value} />
        </div>
        {trend && (
          <div style={{
            fontSize: 9, fontWeight: 700, marginTop: 2,
            color: trend.startsWith("+") ? "#00ff9d" : "#ff4d4d",
          }}>
            {trend.startsWith("+") ? "▲" : "▼"} {trend.replace(/^[+-]/, "")}
          </div>
        )}
        <div style={{ color: "#4a5568", fontSize: 10, marginTop: 4, letterSpacing: 1 }}>{label}</div>
        {sub && <div style={{ color: "#3a4a5c", fontSize: 9, marginTop: 2 }}>{sub}</div>}
      </div>
    ))}
  </div>
);

// ── Divider ───────────────────────────────────────────────────────────────
export const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 16px" }}>
    <div style={{ flex: 1, height: 1, background: "#1f2d45" }} />
    {label && <span style={{ color: "#3a4a5c", fontSize: 10, letterSpacing: 2, fontWeight: 600 }}>{label}</span>}
    <div style={{ flex: 1, height: 1, background: "#1f2d45" }} />
  </div>
);

// ── Classification label (page footer) ───────────────────────────────────
export const ClassLabel = ({ level = "UNCLASSIFIED" }) => {
  const color =
    level === "TOP SECRET" || level === "TS/SCI" ? "#ff4d4d"
    : level === "SECRET"       ? "#ff9d00"
    : level === "CONFIDENTIAL" ? "#ffd700"
    : "#3a4a5c";
  return (
    <div style={{ textAlign: "center", padding: "10px 0 2px", marginTop: 6 }}>
      <span style={{
        color, fontSize: 8, fontWeight: 700, letterSpacing: 3,
        fontFamily: "monospace", opacity: 0.45,
      }}>
        {level} // SENTINEL-AI // FOR AUTHORIZED USE ONLY
      </span>
    </div>
  );
};

// ── Flickering value (for critical metrics) ───────────────────────────────
export const FlickerVal = ({ children, color = "#ff4d4d" }) => (
  <span style={{ color, fontWeight: 700, animation: "sentinelFlicker 5s infinite" }}>
    {children}
  </span>
);

// ── Copy to clipboard button ───────────────────────────────────────────────
export const CopyBtn = ({ text, label = "Copia", size = "sm" }) => {
  const showToast = useToast();
  const [copied, setCopied] = useState(false);
  function copy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      showToast("📋 Copiato negli appunti");
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} title="Copia" style={{
      background: copied ? "#00ff9d22" : "transparent",
      border: `1px solid ${copied ? "#00ff9d55" : "#1f2d45"}`,
      borderRadius: 4, padding: size === "xs" ? "1px 6px" : "3px 9px",
      color: copied ? "#00ff9d" : "#4a5568",
      fontSize: size === "xs" ? 10 : 11, cursor: "pointer",
      transition: "all 0.2s", whiteSpace: "nowrap", fontWeight: 600,
    }}
    onMouseEnter={e => { if (!copied) { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.borderColor = "#4a5568"; }}}
    onMouseLeave={e => { if (!copied) { e.currentTarget.style.color = "#4a5568"; e.currentTarget.style.borderColor = "#1f2d45"; }}}
    >
      {copied ? "✓" : "📋"}{size !== "xs" && ` ${label}`}
    </button>
  );
};

// ── Export JSON button ─────────────────────────────────────────────────────
export const ExportBtn = ({ data, filename = "sentinel-export", label = "Export JSON" }) => {
  const showToast = useToast();
  function handle() {
    downloadJson(data, filename);
    showToast("⬇ Export avviato");
  }
  return (
    <button onClick={handle} style={{
      background: "transparent", border: "1px solid #1f2d45", borderRadius: 4,
      color: "#4a5568", fontSize: 11, cursor: "pointer", padding: "3px 9px",
      fontWeight: 600, transition: "all 0.15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.borderColor = "#4a5568"; }}
    onMouseLeave={e => { e.currentTarget.style.color = "#4a5568"; e.currentTarget.style.borderColor = "#1f2d45"; }}
    >
      ↓ {label}
    </button>
  );
};

// ── Tooltip ────────────────────────────────────────────────────────────────
export const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: true });
  const ref = useRef();
  function handleEnter() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.top > 60 });
    }
    setShow(true);
  }
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block", cursor: "help" }}
      onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: "absolute",
          [pos.top ? "bottom" : "top"]: "calc(100% + 7px)",
          left: "50%", transform: "translateX(-50%)",
          background: "#0d1626", border: "1px solid #1f2d45",
          borderRadius: 5, padding: "6px 11px",
          color: "#9ca3af", fontSize: 11, lineHeight: 1.4,
          maxWidth: 220, textAlign: "center",
          zIndex: 500, pointerEvents: "none",
          boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          whiteSpace: "normal",
          animation: "sentinelFadeIn 0.12s ease",
        }}>
          {text}
          <div style={{
            position: "absolute",
            [pos.top ? "top" : "bottom"]: "100%",
            left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
            [pos.top ? "borderBottom" : "borderTop"]: "5px solid #1f2d45",
          }} />
        </div>
      )}
    </span>
  );
};
