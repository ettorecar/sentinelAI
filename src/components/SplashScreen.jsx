import { useState, useEffect } from "react";

const SKIP_KEY = "sentinel_splash_seen";

export function useSplash() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(SKIP_KEY));
  function dismiss() { localStorage.setItem(SKIP_KEY, "1"); setVisible(false); }
  return [visible, dismiss];
}

const BOOT_LINES = [
  { text: "[ INIT ] SENTINEL-AI v0.8.0 ................... OK", color: "#00ff9d" },
  { text: "[ BOOT ] Loading 18 intelligence modules ....... OK", color: "#00ff9d" },
  { text: "[ NET  ] Establishing encrypted channel ........ OK", color: "#4db8ff" },
  { text: "[ FEED ] Threat intelligence feed .............. LIVE", color: "#ff9d00" },
  { text: "[ AI   ] Claude inference engine ............... READY", color: "#b47fff" },
  { text: "[ AUTH ] Awaiting operator credentials ......... —", color: "#3a4a5c" },
];

export default function SplashScreen({ onEnter, onSkip }) {
  const [draft, setDraft] = useState("");
  const [tick, setTick] = useState(0);
  const [fade, setFade] = useState(false);
  const [bootLines, setBootLines] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [scanY, setScanY] = useState(0);

  // Blinking cursor
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 600);
    return () => clearInterval(t);
  }, []);

  // Boot sequence: lines appear one by one, then form fades in
  useEffect(() => {
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => {
        setBootLines(prev => [...prev, line]);
        if (i === BOOT_LINES.length - 1) {
          setTimeout(() => setFormVisible(true), 350);
        }
      }, 180 + i * 260);
    });
  }, []);

  // Slow scan line moving down the screen
  useEffect(() => {
    const t = setInterval(() => setScanY(y => (y + 1) % 102), 18);
    return () => clearInterval(t);
  }, []);

  function handleEnter() { setFade(true); setTimeout(() => onEnter(draft.trim()), 350); }
  function handleSkip()  { setFade(true); setTimeout(() => onSkip(), 350); }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#050a14",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', monospace",
      opacity: fade ? 0 : 1,
      transition: "opacity 0.35s ease",
      overflow: "hidden",
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
        zIndex: 1,
      }} />

      {/* Moving scan bar */}
      <div style={{
        position: "absolute", left: 0, right: 0,
        top: `${scanY}%`, height: 2,
        background: "linear-gradient(90deg, transparent 0%, rgba(0,255,157,0.12) 20%, rgba(0,255,157,0.22) 50%, rgba(0,255,157,0.12) 80%, transparent 100%)",
        pointerEvents: "none", zIndex: 2,
      }} />

      {/* Grid background */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,255,157,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,157,0.025) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        zIndex: 0,
      }} />

      {/* Top glow line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 2,
        background: "linear-gradient(90deg, transparent, #00ff9d66, transparent)",
        boxShadow: "0 0 14px #00ff9d55",
        zIndex: 3,
      }} />

      {/* Corner decorators */}
      <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 4, width: "100%", maxWidth: 560, padding: "0 24px", boxSizing: "border-box" }}>

        {/* Boot console */}
        <div style={{
          background: "rgba(5,10,20,0.95)",
          border: "1px solid #0d1f3a",
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 28,
          minHeight: 132,
          fontFamily: "monospace",
        }}>
          <div style={{ color: "#2a4060", fontSize: 9, letterSpacing: 3, marginBottom: 10, borderBottom: "1px solid #0d1f3a", paddingBottom: 6 }}>
            SENTINEL BOOT SEQUENCE v0.8.0
          </div>
          {bootLines.map((line, i) => (
            <div key={i} style={{
              color: line.color, fontSize: 11, lineHeight: 1.7,
              animation: "sentinelSlideIn 0.2s ease",
            }}>
              {line.text}
            </div>
          ))}
          {bootLines.length < BOOT_LINES.length && (
            <span style={{ color: "#00ff9d", fontSize: 11, opacity: tick % 2 === 0 ? 1 : 0.3 }}>▋</span>
          )}
        </div>

        {/* Logo + form — fades in after boot */}
        <div style={{
          opacity: formVisible ? 1 : 0,
          transform: formVisible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
          textAlign: "center",
        }}>
          {/* Eyebrow */}
          <div style={{ color: "#00ff9d", fontSize: 10, fontWeight: 700, letterSpacing: 6, marginBottom: 16, opacity: 0.6 }}>
            CLASSIFIED · LEVEL 5 · AUTHORIZED PERSONNEL ONLY
          </div>

          {/* Logo */}
          <div style={{ marginBottom: 6 }}>
            <span style={{
              fontSize: 56, fontWeight: 900, letterSpacing: -2,
              color: "#e2e8f0",
              textShadow: "0 0 40px rgba(0,255,157,0.28), 0 0 80px rgba(0,255,157,0.1)",
            }}>
              SENTINEL
            </span>
            <span style={{
              display: "block", fontSize: 11, letterSpacing: 8, color: "#00ff9d",
              fontWeight: 700, marginTop: -4, opacity: 0.85,
            }}>
              AI · DEFENCE · INTELLIGENCE
            </span>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 28, marginTop: 10, flexWrap: "wrap" }}>
            <Tag text="v0.8" color="#9ca3af" />
            <Tag text="18 TOOLS" color="#00ff9d" />
            <Tag text="AI READY" color="#ff9d00" />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #1f2d45, transparent)", marginBottom: 24 }} />

          {/* API Key input */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", color: "#9ca3af", fontSize: 11, letterSpacing: 2, marginBottom: 8, textAlign: "left" }}>
              ANTHROPIC API KEY <span style={{ color: "#4a5568", fontWeight: 400 }}>(opzionale)</span>
            </label>
            <input
              type="password"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEnter()}
              placeholder={`sk-ant-api...${tick % 2 === 0 ? "▋" : " "}`}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#0d1626", border: "1px solid #1f2d45",
                borderRadius: 6, padding: "10px 14px",
                color: "#e2e8f0", fontSize: 13,
                fontFamily: "monospace",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "#00ff9d55"}
              onBlur={e => e.target.style.borderColor = "#1f2d45"}
            />
            <div style={{ color: "#4a5568", fontSize: 10, marginTop: 5, textAlign: "left" }}>
              La key non viene salvata su server · rimane solo in memoria locale
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button
              onClick={handleEnter}
              style={{
                flex: 1, padding: "12px 0",
                background: "#00ff9d", color: "#050a14",
                border: "none", borderRadius: 6,
                fontWeight: 900, fontSize: 13, letterSpacing: 2,
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(0,255,157,0.3)",
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={e => { e.target.style.boxShadow = "0 0 32px rgba(0,255,157,0.6)"; }}
              onMouseLeave={e => { e.target.style.boxShadow = "0 0 20px rgba(0,255,157,0.3)"; }}
            >
              ENTER SYSTEM →
            </button>
            <button
              onClick={handleSkip}
              style={{
                padding: "12px 20px",
                background: "none", color: "#4a5568",
                border: "1px solid #1f2d45", borderRadius: 6,
                fontWeight: 600, fontSize: 12, letterSpacing: 1,
                cursor: "pointer",
                transition: "color 0.2s, border-color 0.2s",
              }}
              onMouseEnter={e => { e.target.style.color = "#9ca3af"; e.target.style.borderColor = "#4a5568"; }}
              onMouseLeave={e => { e.target.style.color = "#4a5568"; e.target.style.borderColor = "#1f2d45"; }}
            >
              SKIP
            </button>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 22, color: "#1f2d45", fontSize: 10, letterSpacing: 1 }}>
            UNAUTHORIZED ACCESS IS PROHIBITED · 18 U.S.C. § 1030
          </div>
        </div>
      </div>

      {/* Global keyframes (needed here since App hasn't mounted yet) */}
      <style>{`
        @keyframes sentinelSlideIn {
          from { opacity:0; transform:translateY(-4px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Tag({ text, color }) {
  return (
    <span style={{
      background: `${color}18`, border: `1px solid ${color}44`,
      color, fontSize: 9, fontWeight: 700, letterSpacing: 2,
      padding: "3px 8px", borderRadius: 3,
    }}>
      {text}
    </span>
  );
}

function Corner({ pos }) {
  const size = 20;
  return <div style={{
    position: "absolute", width: size, height: size, zIndex: 2,
    top: pos.includes("t") ? 20 : undefined,
    bottom: pos.includes("b") ? 20 : undefined,
    left: pos.includes("l") ? 20 : undefined,
    right: pos.includes("r") ? 20 : undefined,
    borderTop:    pos.includes("t") ? "2px solid #00ff9d44" : "none",
    borderBottom: pos.includes("b") ? "2px solid #00ff9d44" : "none",
    borderLeft:   pos.includes("l") ? "2px solid #00ff9d44" : "none",
    borderRight:  pos.includes("r") ? "2px solid #00ff9d44" : "none",
  }} />;
}
