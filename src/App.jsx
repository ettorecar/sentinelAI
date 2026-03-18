import { useState, useEffect, useRef } from "react";
import { NAV, ENERGY_IDS, TOOL_DESC } from "./constants";
import { BADGE, GlobalStyles, ToastProvider, validateApiKey } from "./components/shared";
import { ApiKeyProvider, useApiKey } from "./context/ApiKeyContext";
import SplashScreen, { useSplash } from "./components/SplashScreen";

import Home            from "./tools/Home";
import ThreatMap       from "./tools/ThreatMap";
import RedTeam         from "./tools/RedTeam";
import Osint           from "./tools/Osint";
import Disinfo         from "./tools/Disinfo";
import Maritime        from "./tools/Maritime";
import Satellite       from "./tools/Satellite";
import PatLife         from "./tools/PatLife";
import Psyop           from "./tools/Psyop";
import BioThreat       from "./tools/BioThreat";
import Cti             from "./tools/Cti";
import Translator      from "./tools/Translator";
import OilInfra        from "./tools/OilInfra";
import Chokepoint      from "./tools/Chokepoint";
import EnergyRisk      from "./tools/EnergyRisk";
import EnergyGrid      from "./tools/EnergyGrid";
import IntelReport     from "./tools/IntelReport";
import AirRoutes       from "./tools/AirRoutes";
import ScenarioBuilder from "./tools/ScenarioBuilder";
import Workspace       from "./tools/Workspace";

const PAGES = {
  home:           Home,
  threatmap:      ThreatMap,
  redteam:        RedTeam,
  osint:          Osint,
  disinfo:        Disinfo,
  maritime:       Maritime,
  satellite:      Satellite,
  patlife:        PatLife,
  psyop:          Psyop,
  biothreat:      BioThreat,
  cti:            Cti,
  translator:     Translator,
  oilinfra:       OilInfra,
  chokepoint:     Chokepoint,
  energyrisk:     EnergyRisk,
  energygrid:     EnergyGrid,
  airroutes:      AirRoutes,
  intelreport:    IntelReport,
  scenariobuilder: ScenarioBuilder,
  workspace:      Workspace,
};

function navAccent(id) {
  if (ENERGY_IDS.includes(id)) return "#ff9d00";
  if (id === "airroutes")      return "#38bdf8";
  if (id === "intelreport")    return "#b47fff";
  if (id === "scenariobuilder") return "#22d3ee";
  return "#00ff9d";
}

function NavBtn({ n, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  const accent = navAccent(n.id);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active
          ? `${accent}14`
          : hovered
          ? `${accent}08`
          : "transparent",
        border: "none",
        borderBottom: active
          ? `2px solid ${accent}`
          : hovered
          ? `2px solid ${accent}44`
          : "2px solid transparent",
        borderTop: active ? `1px solid ${accent}33` : "1px solid transparent",
        color: active ? accent : hovered ? `${accent}bb` : "#6b7a8d",
        padding: "10px 10px",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: active ? 700 : 400,
        whiteSpace: "nowrap",
        letterSpacing: active ? 0.3 : 0,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
        outline: "none",
      }}
    >
      {n.icon} {n.label}
    </button>
  );
}

function ApiKeyBanner() {
  const [apiKey, setApiKey] = useApiKey();
  const [draft, setDraft]   = useState("");
  const [show, setShow]     = useState(false);
  const [err, setErr]       = useState("");

  function apply() {
    const e = validateApiKey(draft.trim());
    if (e) { setErr(e); return; }
    setApiKey(draft.trim()); setShow(false); setErr("");
  }
  function clear() { setApiKey(""); setDraft(""); setShow(false); setErr(""); }

  return (
    <div style={{
      background: apiKey ? "#030e07" : "#0e0800",
      borderBottom: `1px solid ${apiKey ? "#00ff9d22" : "#ff9d0022"}`,
      padding: "5px 16px",
      display: "flex", alignItems: "center", gap: 10,
      flexWrap: "wrap", minHeight: 34,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: apiKey ? "#00ff9d" : "#ff9d00",
        boxShadow: `0 0 6px ${apiKey ? "#00ff9d" : "#ff9d00"}`,
        flexShrink: 0,
      }} />

      {apiKey ? (
        <>
          <span style={{ color: "#00ff9d", fontSize: 11, fontWeight: 600 }}>AI ACTIVE</span>
          <span style={{ color: "#2d4a3e", fontSize: 11 }}>·</span>
          <span style={{ color: "#4a5568", fontSize: 11 }}>
            {`sk-ant-...${apiKey.slice(-6)}`} · 19 moduli operativi
          </span>
          <button onClick={clear} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 10, padding: "2px 8px", cursor: "pointer", marginLeft: "auto" }}>
            Disconnect
          </button>
        </>
      ) : (
        <>
          <span style={{ color: "#ff9d00", fontSize: 11, fontWeight: 600 }}>NO API KEY</span>
          <span style={{ color: "#3a2800", fontSize: 11 }}>·</span>
          <span style={{ color: "#4a5568", fontSize: 11 }}>Connetti la chiave Anthropic per abilitare l'AI</span>
          {show ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: "auto" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="password"
                  value={draft}
                  onChange={e => { setDraft(e.target.value); setErr(""); }}
                  onKeyDown={e => e.key === "Enter" && apply()}
                  placeholder="sk-ant-api03-..."
                  autoFocus
                  style={{
                    background: "#0d1626",
                    border: `1px solid ${err ? "#ff4d4d66" : "#ff9d0044"}`,
                    borderRadius: 4, padding: "4px 10px",
                    color: "#e2e8f0", fontSize: 11, width: 200, maxWidth: "calc(100vw - 120px)", outline: "none",
                  }}
                />
                <button onClick={apply} style={{ background: "#ff9d00", color: "#0a0f1e", border: "none", borderRadius: 4, padding: "4px 12px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                  Connect
                </button>
                <button onClick={() => { setShow(false); setErr(""); }} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
                  ✕
                </button>
              </div>
              {err && <div style={{ color: "#ff4d4d", fontSize: 10, paddingLeft: 2 }}>⚠ {err}</div>}
            </div>
          ) : (
            <button onClick={() => setShow(true)} style={{ background: "none", border: "1px solid #ff9d0055", borderRadius: 4, color: "#ff9d00", fontSize: 11, padding: "3px 12px", cursor: "pointer", marginLeft: "auto", fontWeight: 600 }}>
              + Set Key
            </button>
          )}
        </>
      )}
    </div>
  );
}

// H1 — baseline notifications
const NOTIFS_BASE = [
  { msg: "New IOC cluster linked to EMBER WOLF",               level: "CRITICAL", page: "cti"        },
  { msg: "Drone threat detected — Abqaiq perimeter",           level: "CRITICAL", page: "oilinfra"   },
  { msg: "Hormuz: new mine-laying report, strait traffic -18%", level: "CRITICAL", page: "chokepoint" },
  { msg: "Coordinated narrative surge — Telegram",             level: "HIGH",     page: "psyop"      },
  { msg: "ADRIATICA SUN AIS blackout extended >8h",            level: "HIGH",     page: "maritime"   },
];

// H1 — live feed pool (15+ entries rotated every ~90s)
const FEED_POOL = [
  { msg: "APT-8834 PHANTOM CRANE: new C2 infrastructure detected", level: "CRITICAL", page: "cti"      },
  { msg: "GNSS jamming event — Baltic Sea corridor, 3h duration",   level: "HIGH",     page: "satellite" },
  { msg: "R₀ spike detected: West Africa cluster now at 2.8",       level: "CRITICAL", page: "biothreat" },
  { msg: "AIS manipulation: 4 vessels spoofed near Bab-el-Mandeb",  level: "HIGH",     page: "maritime"  },
  { msg: "Energy grid anomaly: Poland-Germany interconnector -40%",  level: "HIGH",     page: "energygrid"},
  { msg: "Narrative injection: coordinated hashtag campaign detected",level: "MEDIUM",   page: "disinfo"   },
  { msg: "New zero-day: VPN appliance RCE, 3 CRITICAL actors active",level: "CRITICAL", page: "cti"      },
  { msg: "Suez Canal: vessel convoy gap detected — 2h window",       level: "MEDIUM",   page: "chokepoint"},
  { msg: "Oil pipeline pressure drop: Libya export terminal",         level: "HIGH",     page: "oilinfra"  },
  { msg: "PSYOP signal: fear narrative surge — 3 platforms +180%",   level: "HIGH",     page: "psyop"     },
  { msg: "SIGINT: encrypted burst traffic spike — Eastern Med",       level: "MEDIUM",   page: "redteam"   },
  { msg: "Satellite recon window: PLEIADES-1A priority tasking",      level: "MEDIUM",   page: "satellite" },
  { msg: "JADE SERPENT new TTP: supply chain injection confirmed",    level: "CRITICAL", page: "cti"      },
  { msg: "Energy storage anomaly: 3 EU grid nodes below threshold",   level: "HIGH",     page: "energyrisk"},
  { msg: "Bio-signal: unexplained pneumonia cluster — Central Asia",  level: "HIGH",     page: "biothreat" },
  { msg: "Maritime: submarine cable repair vessel off Morocco coast", level: "MEDIUM",   page: "maritime"  },
  { msg: "Pattern of life break: HVT subject absent 72h",            level: "HIGH",     page: "patlife"   },
  { msg: "NOTAM: Yemen FIR closure extended — drone threat escalation", level: "CRITICAL", page: "airroutes" },
  { msg: "Airspace reroute: 12 flights diverted from Eastern Iran corridor", level: "HIGH",  page: "airroutes" },
  { msg: "Sudan FIR: Khartoum airport closure confirmed — all ops suspended", level: "CRITICAL", page: "airroutes" },
];

const NOTIF_LC = { CRITICAL: "#ff4d4d", HIGH: "#ff9d00", MEDIUM: "#ffd700" };

function fmtTime(d) {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function NotificationBell({ setPage, notifs, narrow }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(() => {
    try { return parseInt(localStorage.getItem("sentinel-notif-read") || "0", 10); } catch { return 0; }
  });
  const unread = Math.max(0, notifs.length - read);

  function toggle() {
    if (!open) {
      setRead(notifs.length);
      try { localStorage.setItem("sentinel-notif-read", String(notifs.length)); } catch {}
    }
    setOpen(x => !x);
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={toggle} style={{
        background: open ? "#0f1a2e" : "transparent",
        border: `1px solid ${open ? "#1f2d45" : "transparent"}`,
        borderRadius: 5, padding: "4px 8px", cursor: "pointer",
        display: "flex", alignItems: "center", color: "#6b7a8d",
        fontSize: 14, position: "relative",
      }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3,
            background: "#ff4d4d", color: "#fff", fontSize: 8, fontWeight: 700,
            borderRadius: "50%", width: 14, height: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{Math.min(unread, 99)}</span>
        )}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed", top: 46, right: 4,
            background: "#0b111e", border: "1px solid #1f2d45",
            borderRadius: 10,
            width: narrow ? "calc(100vw - 8px)" : 310,
            maxWidth: 310,
            zIndex: 200,
            boxShadow: "0 12px 40px #000a",
          }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #1f2d45", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#6b7a8d", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>LIVE ALERTS</span>
              <span style={{ color: "#2d3f55", fontSize: 10 }}>{notifs.length} total</span>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {notifs.map((n, i) => (
                <div key={i}
                  onClick={() => { setOpen(false); setPage(n.page); }}
                  style={{
                    padding: "9px 14px", borderBottom: "1px solid #0d1626",
                    cursor: "pointer", borderLeft: `2px solid ${NOTIF_LC[n.level] || "#4a5568"}`,
                    background: i === 0 && notifs.length > NOTIFS_BASE.length ? "#0a1220" : "transparent",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#0f1a2e"}
                  onMouseLeave={e => e.currentTarget.style.background = i === 0 && notifs.length > NOTIFS_BASE.length ? "#0a1220" : "transparent"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: NOTIF_LC[n.level], fontSize: 9, fontWeight: 700 }}>{n.level}</span>
                    <span style={{ color: "#2d3f55", fontSize: 9, fontFamily: "monospace" }}>{n.time}</span>
                  </div>
                  <div style={{ color: "#c9d1da", fontSize: 11, lineHeight: 1.4 }}>{n.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SearchModal({ onNavigate, onClose }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const tools = NAV.filter(n => n.id !== "home");
  const results = q.trim()
    ? tools.filter(n =>
        n.label.toLowerCase().includes(q.toLowerCase()) ||
        (TOOL_DESC[n.id] || "").toLowerCase().includes(q.toLowerCase())
      )
    : tools;

  useEffect(() => { setSel(0); }, [q]);

  function handleKey(e) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[sel]) onNavigate(results[sel].id);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#0a0f1ecc", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 16px 0" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#0b111e", border: "1px solid #1f2d45", borderRadius: 12, width: "100%", maxWidth: 560, boxShadow: "0 20px 60px #000a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #1f2d45" }}>
          <span style={{ color: "#4a5568", fontSize: 15 }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search tools..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e2e8f0", fontSize: 14 }}
          />
          <kbd style={{ color: "#2d3f55", fontSize: 10, border: "1px solid #1f2d45", borderRadius: 3, padding: "2px 5px", fontFamily: "monospace" }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: "auto", padding: "6px 0" }}>
          {results.map((n, i) => {
            const accent = navAccent(n.id);
            return (
              <div
                key={n.id}
                onClick={() => onNavigate(n.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "9px 16px",
                  background: i === sel ? "#0f1a2e" : "transparent",
                  cursor: "pointer", borderLeft: i === sel ? `2px solid ${accent}` : "2px solid transparent",
                }}
                onMouseEnter={() => setSel(i)}
              >
                <span style={{ fontSize: 18, width: 26, textAlign: "center", flexShrink: 0 }}>{n.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: i === sel ? accent : "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{n.label}</div>
                  <div style={{ color: "#4a5568", fontSize: 11, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{TOOL_DESC[n.id] || ""}</div>
                </div>
              </div>
            );
          })}
          {results.length === 0 && (
            <div style={{ color: "#4a5568", fontSize: 13, textAlign: "center", padding: "24px 0" }}>No tools found for "{q}"</div>
          )}
        </div>
        <div style={{ borderTop: "1px solid #1f2d45", padding: "7px 16px", display: "flex", gap: 12, color: "#2d3f55", fontSize: 10 }}>
          <span>↑↓ navigate</span><span>↵ open</span><span>ESC close</span>
        </div>
      </div>
    </div>
  );
}

const SHORTCUTS = [
  { key: "Ctrl+K",     desc: "Open global search" },
  { key: "?",          desc: "Show keyboard shortcuts" },
  { key: "Esc",        desc: "Close any modal / overlay" },
  { key: "↑ / ↓",      desc: "Navigate search results" },
  { key: "↵",          desc: "Open selected search result" },
  { key: "Ctrl+Enter", desc: "Run analysis — Translator, ScenarioBuilder" },
  { key: "Scroll",     desc: "Zoom in/out — Threat Map" },
  { key: "Drag",       desc: "Pan — Threat Map" },
  { key: "+ / −",      desc: "Zoom buttons — Threat Map" },
  { key: "RST",        desc: "Reset zoom & pan — Threat Map" },
];

function ShortcutHelp({ onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#0a0f1ecc", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#0b111e", border: "1px solid #1f2d45", borderRadius: 12, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px #000a" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #1f2d45", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14, letterSpacing: 0.3 }}>⌨️ Keyboard Shortcuts</span>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 10, padding: "2px 8px", cursor: "pointer" }}>ESC</button>
        </div>
        <div style={{ padding: "8px 0" }}>
          {SHORTCUTS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 18px" }}>
              <div style={{ minWidth: 120, display: "flex", gap: 3, flexWrap: "wrap" }}>
                {s.key.split("+").map((k, j) => (
                  <span key={j} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {j > 0 && <span style={{ color: "#2d3f55", fontSize: 9 }}>+</span>}
                    <kbd style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontFamily: "monospace", color: "#9ca3af" }}>{k.trim()}</kbd>
                  </span>
                ))}
              </div>
              <span style={{ color: "#6b7a8d", fontSize: 12 }}>{s.desc}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "9px 18px", borderTop: "1px solid #1f2d45", color: "#2d3f55", fontSize: 10, textAlign: "center" }}>
          Press <kbd style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: 3, padding: "1px 5px", fontSize: 9, fontFamily: "monospace" }}>?</kbd> anywhere to toggle
        </div>
      </div>
    </div>
  );
}

function QuickStatusPanel({ onClose, currentNav, accent, notifs }) {
  const top3 = notifs.slice(0, 3);
  const [utc, setUtc] = useState(() => new Date().toISOString().slice(11, 19));
  useEffect(() => {
    const t = setInterval(() => setUtc(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#0a0f1ecc", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "50px 8px 0" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#0b111e", border: "1px solid #1f2d45", borderRadius: 12, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px #000a" }}>
        {/* Header */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1f2d45", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>
            {currentNav?.icon} {currentNav?.label || "SENTINEL AI"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 10, padding: "2px 8px", cursor: "pointer" }}>✕</button>
        </div>
        {/* Tool description */}
        {currentNav && TOOL_DESC[currentNav.id] && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #0d1626" }}>
            <div style={{ color: "#2d3f55", fontSize: 9, letterSpacing: 1, marginBottom: 5, textTransform: "uppercase" }}>Tool Overview</div>
            <div style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5 }}>{TOOL_DESC[currentNav.id]}</div>
          </div>
        )}
        {/* Recent alerts */}
        <div style={{ borderBottom: "1px solid #0d1626" }}>
          <div style={{ padding: "8px 16px 4px", color: "#2d3f55", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>Recent Alerts</div>
          {top3.map((n, i) => (
            <div key={i} style={{ padding: "8px 16px", borderLeft: `2px solid ${NOTIF_LC[n.level] || "#4a5568"}` }}>
              <div style={{ color: NOTIF_LC[n.level], fontSize: 9, fontWeight: 700, marginBottom: 2 }}>{n.level}</div>
              <div style={{ color: "#c9d1da", fontSize: 11, lineHeight: 1.4 }}>{n.msg}</div>
            </div>
          ))}
        </div>
        {/* System status footer */}
        <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff4d4d", boxShadow: "0 0 4px #ff4d4d" }} />
            <span style={{ color: "#ff4d4d", fontSize: 10, fontWeight: 700 }}>3 CRITICAL</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 9 }}>🛢️</span>
            <span style={{ color: "#ff9d00", fontSize: 10, fontWeight: 700 }}>ENERGY ALERT</span>
          </div>
          <div style={{ color: "#4a6080", fontSize: 10, fontFamily: "monospace", marginLeft: "auto" }}>
            {utc} <span style={{ color: "#2d3f55" }}>UTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function useNarrow(bp = 860) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const fn = () => setNarrow(window.innerWidth < bp);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [bp]);
  return narrow;
}

function HamburgerMenu({ page, navigate }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen(x => !x)} style={{
        background: open ? "#0f1a2e" : "transparent",
        border: `1px solid ${open ? "#1f2d45" : "transparent"}`,
        borderRadius: 5, padding: "7px 12px", cursor: "pointer",
        color: "#9ca3af", fontSize: 16, lineHeight: 1,
      }}>☰</button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            background: "#0b111e", border: "1px solid #1f2d45", borderRadius: 10,
            zIndex: 99, minWidth: 210, maxHeight: "80vh", overflowY: "auto",
            boxShadow: "0 8px 32px #000c",
          }}>
            {NAV.map(n => {
              const accent = navAccent(n.id);
              const active = page === n.id;
              return (
                <button key={n.id}
                  onClick={() => { navigate(n.id); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    width: "100%", textAlign: "left",
                    background: active ? `${accent}12` : "transparent",
                    border: "none", borderLeft: `2px solid ${active ? accent : "transparent"}`,
                    color: active ? accent : "#9ca3af",
                    padding: "10px 14px", cursor: "pointer", fontSize: 12,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#0d1626"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? `${accent}12` : "transparent"; }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{n.icon}</span>
                  <span>{n.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StatusWidgets({ blink, setPage, onSearchOpen, onHelpOpen, onInfoOpen, notifs, narrow }) {
  const [utc, setUtc] = useState(() => new Date().toISOString().slice(11, 19));
  useEffect(() => {
    const t = setInterval(() => setUtc(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", paddingLeft: 8, flexShrink: 0 }}>
      {/* Search button — icon-only on mobile */}
      <button onClick={onSearchOpen} style={{
        background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 5,
        padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
        color: "#4a5568", fontSize: narrow ? 14 : 10,
      }}>
        🔍
        {!narrow && (
          <>
            <span>Search</span>
            <kbd style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: 3, padding: "1px 4px", fontSize: 9, fontFamily: "monospace", color: "#2d3f55" }}>Ctrl+K</kbd>
          </>
        )}
      </button>
      {/* Desktop: keyboard shortcuts (?) | Mobile: quick status (ℹ) */}
      {narrow ? (
        <button onClick={onInfoOpen} title="Quick Status" style={{
          background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 5,
          padding: "4px 8px", cursor: "pointer", color: "#4a5568",
          fontSize: 13, lineHeight: 1,
        }}>ℹ</button>
      ) : (
        <button onClick={onHelpOpen} title="Keyboard shortcuts" style={{
          background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 5,
          padding: "4px 8px", cursor: "pointer", color: "#4a5568",
          fontSize: 12, fontWeight: 700, fontFamily: "monospace", lineHeight: 1,
        }}>?</button>
      )}
      {/* Live notification bell */}
      <NotificationBell setPage={setPage} notifs={notifs} narrow={narrow} />
      {/* Desktop-only widgets */}
      {!narrow && (
        <>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "#0f0505", borderRadius: 5, padding: "4px 9px",
            border: "1px solid #ff4d4d33",
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: blink ? "#ff4d4d" : "#1a0000",
              transition: "background 0.3s",
              boxShadow: blink ? "0 0 4px #ff4d4d" : "none",
            }} />
            <span style={{ color: "#ff4d4d", fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>3 CRITICAL</span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "#0e0800", borderRadius: 5, padding: "4px 9px",
            border: "1px solid #ff9d0033",
          }}>
            <span style={{ fontSize: 9 }}>🛢️</span>
            <span style={{ color: "#ff9d00", fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>ENERGY</span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "#060d1a", borderRadius: 5, padding: "4px 9px",
            border: "1px solid #0d1f3a",
          }}>
            <span style={{ color: "#2d4a6a", fontSize: 8, letterSpacing: 1 }}>UTC</span>
            <span style={{ color: "#4a6080", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, fontVariantNumeric: "tabular-nums" }}>{utc}</span>
          </div>
          <div style={{ color: "#2d3f55", fontSize: 9, fontFamily: "monospace", letterSpacing: 1, paddingLeft: 2 }}>v0.8</div>
        </>
      )}
    </div>
  );
}

function AppInner() {
  // G1 — initialise from URL hash
  const [page, setPage] = useState(() => {
    const h = window.location.hash.slice(1);
    return PAGES[h] ? h : "home";
  });
  const [blink, setBlink] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const narrow = useNarrow();

  // H1 — live feed: start from baseline, inject random alert every ~90s
  const [liveNotifs, setLiveNotifs] = useState(() =>
    NOTIFS_BASE.map(n => ({ ...n, time: fmtTime(new Date()) }))
  );
  useEffect(() => {
    const t = setInterval(() => {
      const pick = FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)];
      setLiveNotifs(prev => [{ ...pick, time: fmtTime(new Date()) }, ...prev].slice(0, 30));
    }, 90000);
    return () => clearInterval(t);
  }, []);

  // G1 — sync hash → page on browser back/forward
  useEffect(() => {
    function onHash() {
      const h = window.location.hash.slice(1);
      setPage(PAGES[h] ? h : "home");
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => { const t = setInterval(() => setBlink(x => !x), 800); return () => clearInterval(t); }, []);

  // G1+G2 — keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(x => !x); setHelpOpen(false); return; }
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) { setHelpOpen(x => !x); setSearchOpen(false); return; }
      if (e.key === "Escape") { setSearchOpen(false); setHelpOpen(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const Page = PAGES[page] || Home;
  const currentNav = NAV.find(n => n.id === page);
  const accent = navAccent(page);

  // G1 — navigate updates hash + page
  function navigate(id) {
    window.location.hash = id === "home" ? "" : id;
    setPage(id);
    setSearchOpen(false);
    setHelpOpen(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <GlobalStyles />
      {searchOpen && <SearchModal onNavigate={navigate} onClose={() => setSearchOpen(false)} />}
      {helpOpen   && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
      {infoOpen   && <QuickStatusPanel onClose={() => setInfoOpen(false)} currentNav={currentNav} accent={accent} notifs={liveNotifs} />}

      {/* G3 — responsive nav */}
      <nav style={{
        background: "#0b111e", borderBottom: "1px solid #131f33",
        padding: "0 4px", display: "flex", alignItems: "stretch",
        flexWrap: narrow ? "nowrap" : "wrap",
      }}>
        {narrow ? (
          <>
            <HamburgerMenu page={page} navigate={navigate} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: accent, fontWeight: 700 }}>
              {currentNav?.icon} {currentNav?.label || "SENTINEL"}
            </div>
          </>
        ) : (
          NAV.map(n => (
            <NavBtn key={n.id} n={n} active={page === n.id} onClick={() => navigate(n.id)} />
          ))
        )}
        <StatusWidgets
          blink={blink}
          setPage={navigate}
          notifs={liveNotifs}
          narrow={narrow}
          onSearchOpen={() => { setSearchOpen(true); setHelpOpen(false); setInfoOpen(false); }}
          onHelpOpen={() => { setHelpOpen(x => !x); setSearchOpen(false); setInfoOpen(false); }}
          onInfoOpen={() => { setInfoOpen(x => !x); setSearchOpen(false); setHelpOpen(false); }}
        />
      </nav>

      <ApiKeyBanner />

      {/* G4 — breadcrumb */}
      {page !== "home" && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 16px 0", display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => navigate("home")}
            style={{ background: "none", border: "none", color: "#3a4a5c", cursor: "pointer", fontSize: 11, padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = "#9ca3af"}
            onMouseLeave={e => e.currentTarget.style.color = "#3a4a5c"}
          >← Home</button>
          <span style={{ color: "#1f2d45", fontSize: 11 }}>/</span>
          <span style={{ color: accent, fontSize: 11, fontWeight: 600 }}>
            {currentNav?.icon} {currentNav?.label}
          </span>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 20px" }}>
        <Page setPage={navigate} />
      </div>
    </div>
  );
}

function AppWithSplash() {
  const [, setApiKey] = useApiKey();
  const [splashVisible, dismissSplash] = useSplash();

  function handleEnter(key) {
    if (key) setApiKey(key);
    dismissSplash();
  }

  return (
    <>
      {splashVisible && (
        <SplashScreen onEnter={handleEnter} onSkip={dismissSplash} />
      )}
      <AppInner />
    </>
  );
}

export default function App() {
  return (
    <ApiKeyProvider>
      <ToastProvider>
        <AppWithSplash />
      </ToastProvider>
    </ApiKeyProvider>
  );
}
