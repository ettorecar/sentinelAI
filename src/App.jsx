import { useState, useEffect } from "react";
import { NAV, ENERGY_IDS } from "./constants";
import { BADGE, GlobalStyles } from "./components/shared";
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
import ScenarioBuilder from "./tools/ScenarioBuilder";

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
  intelreport:    IntelReport,
  scenariobuilder: ScenarioBuilder,
};

function navAccent(id) {
  if (ENERGY_IDS.includes(id)) return "#ff9d00";
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
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(false);

  function apply() { setApiKey(draft.trim()); setShow(false); }
  function clear()  { setApiKey(""); setDraft(""); setShow(false); }

  return (
    <div style={{
      background: apiKey ? "#030e07" : "#0e0800",
      borderBottom: `1px solid ${apiKey ? "#00ff9d22" : "#ff9d0022"}`,
      padding: "5px 16px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      minHeight: 34,
    }}>
      {/* Status indicator dot */}
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
          <span style={{ color: "#4a5568", fontSize: 11 }}>All 18 modules operating with live inference</span>
          <button
            onClick={clear}
            style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 10, padding: "2px 8px", cursor: "pointer", marginLeft: "auto" }}>
            Disconnect
          </button>
        </>
      ) : (
        <>
          <span style={{ color: "#ff9d00", fontSize: 11, fontWeight: 600 }}>NO API KEY</span>
          <span style={{ color: "#3a2800", fontSize: 11 }}>·</span>
          <span style={{ color: "#4a5568", fontSize: 11 }}>Connect Anthropic key to enable AI across all tools</span>
          {show ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
              <input
                type="password"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && apply()}
                placeholder="sk-ant-..."
                autoFocus
                style={{
                  background: "#0d1626",
                  border: "1px solid #ff9d0044",
                  borderRadius: 4,
                  padding: "4px 10px",
                  color: "#e2e8f0",
                  fontSize: 11,
                  width: 220,
                  outline: "none",
                }}
              />
              <button onClick={apply} style={{ background: "#ff9d00", color: "#0a0f1e", border: "none", borderRadius: 4, padding: "4px 12px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                Connect
              </button>
              <button onClick={() => setShow(false)} style={{ background: "none", border: "1px solid #1f2d45", borderRadius: 4, color: "#6b7a8d", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
                Cancel
              </button>
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

function StatusWidgets({ blink }) {
  const [utc, setUtc] = useState(() => new Date().toISOString().slice(11, 19));
  useEffect(() => {
    const t = setInterval(() => setUtc(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", paddingLeft: 12, flexShrink: 0 }}>
      {/* CRITICAL alert widget */}
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
      {/* Energy sector widget */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        background: "#0e0800", borderRadius: 5, padding: "4px 9px",
        border: "1px solid #ff9d0033",
      }}>
        <span style={{ fontSize: 9 }}>🛢️</span>
        <span style={{ color: "#ff9d00", fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>ENERGY</span>
      </div>
      {/* Live UTC Clock */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        background: "#060d1a", borderRadius: 5, padding: "4px 9px",
        border: "1px solid #0d1f3a",
      }}>
        <span style={{ color: "#2d4a6a", fontSize: 8, letterSpacing: 1 }}>UTC</span>
        <span style={{
          color: "#4a6080", fontSize: 10, fontFamily: "monospace",
          letterSpacing: 1, fontVariantNumeric: "tabular-nums",
        }}>{utc}</span>
      </div>
      {/* Version */}
      <div style={{ color: "#2d3f55", fontSize: 9, fontFamily: "monospace", letterSpacing: 1, paddingLeft: 2 }}>
        v0.8
      </div>
    </div>
  );
}

function AppInner() {
  const [page, setPage] = useState("home");
  const [blink, setBlink] = useState(true);
  useEffect(() => { const t = setInterval(() => setBlink(x => !x), 800); return () => clearInterval(t); }, []);

  const Page = PAGES[page] || Home;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <GlobalStyles />
      <nav style={{
        background: "#0b111e",
        borderBottom: "1px solid #131f33",
        padding: "0 4px",
        display: "flex",
        alignItems: "stretch",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {NAV.map(n => (
          <NavBtn key={n.id} n={n} active={page === n.id} onClick={() => setPage(n.id)} />
        ))}
        <StatusWidgets blink={blink} />
      </nav>

      <ApiKeyBanner />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
        <Page setPage={setPage} />
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
      <AppWithSplash />
    </ApiKeyProvider>
  );
}
