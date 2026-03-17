import { useState, useEffect } from "react";

const SKIP_KEY = "sentinel_splash_seen";

export function useSplash() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(SKIP_KEY));

  function dismiss() {
    localStorage.setItem(SKIP_KEY, "1");
    setVisible(false);
  }

  return [visible, dismiss];
}

export default function SplashScreen({ onEnter, onSkip }) {
  const [draft, setDraft] = useState("");
  const [tick, setTick] = useState(0);
  const [fade, setFade] = useState(false);

  // blinking cursor effect
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 600);
    return () => clearInterval(t);
  }, []);

  function handleEnter() {
    setFade(true);
    setTimeout(() => onEnter(draft.trim()), 350);
  }

  function handleSkip() {
    setFade(true);
    setTimeout(() => onSkip(), 350);
  }

  const scanlines = {
    position: "absolute", inset: 0, pointerEvents: "none",
    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)",
    zIndex: 1,
  };

  const container = {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "#050a14",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    fontFamily: "'Segoe UI', monospace",
    opacity: fade ? 0 : 1,
    transition: "opacity 0.35s ease",
    overflow: "hidden",
  };

  const glowLine = {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 2,
    background: "linear-gradient(90deg, transparent, #00ff9d, transparent)",
    boxShadow: "0 0 12px #00ff9d",
    animation: "none",
  };

  return (
    <div style={container}>
      <div style={glowLine} />
      <div style={scanlines} />

      {/* Grid background */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,255,157,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,157,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        zIndex: 0,
      }} />

      {/* Corner decorators */}
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 520, padding: "0 24px" }}>

        {/* Eyebrow */}
        <div style={{ color: "#00ff9d", fontSize: 10, fontWeight: 700, letterSpacing: 6, marginBottom: 20, opacity: 0.7 }}>
          CLASSIFIED · LEVEL 5 · AUTHORIZED PERSONNEL ONLY
        </div>

        {/* Logo */}
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontSize: 64, fontWeight: 900, letterSpacing: -2,
            color: "#e2e8f0",
            textShadow: "0 0 40px rgba(0,255,157,0.3), 0 0 80px rgba(0,255,157,0.1)",
          }}>
            SENTINEL
          </span>
          <span style={{
            display: "block", fontSize: 11, letterSpacing: 8, color: "#00ff9d",
            fontWeight: 700, marginTop: -4, opacity: 0.9,
          }}>
            AI · DEFENCE · INTELLIGENCE
          </span>
        </div>

        {/* Version + status */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 36, marginTop: 12 }}>
          <Tag text="v0.8" color="#9ca3af" />
          <Tag text="18 TOOLS" color="#00ff9d" />
          <Tag text="AI READY" color="#ff9d00" />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #1f2d45, transparent)", marginBottom: 32 }} />

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
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            onClick={handleEnter}
            style={{
              flex: 1, padding: "12px 0",
              background: "#00ff9d", color: "#050a14",
              border: "none", borderRadius: 6,
              fontWeight: 900, fontSize: 13, letterSpacing: 2,
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(0,255,157,0.3)",
              transition: "opacity 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => { e.target.style.boxShadow = "0 0 30px rgba(0,255,157,0.6)"; }}
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

        {/* Footer note */}
        <div style={{ marginTop: 24, color: "#1f2d45", fontSize: 10, letterSpacing: 1 }}>
          UNAUTHORIZED ACCESS IS PROHIBITED · 18 U.S.C. § 1030
        </div>
      </div>
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
  const s = {
    position: "absolute", width: size, height: size,
    zIndex: 2,
  };
  const top = pos.includes("t") ? 20 : undefined;
  const bottom = pos.includes("b") ? 20 : undefined;
  const left = pos.includes("l") ? 20 : undefined;
  const right = pos.includes("r") ? 20 : undefined;

  const borderTop = pos.includes("t") ? `2px solid #00ff9d55` : "none";
  const borderBottom = pos.includes("b") ? `2px solid #00ff9d55` : "none";
  const borderLeft = pos.includes("l") ? `2px solid #00ff9d55` : "none";
  const borderRight = pos.includes("r") ? `2px solid #00ff9d55` : "none";

  return <div style={{ ...s, top, bottom, left, right, borderTop, borderBottom, borderLeft, borderRight }} />;
}
