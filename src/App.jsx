import { useState, useEffect } from "react";
import { NAV, ENERGY_IDS } from "./constants";
import { BADGE } from "./components/shared";
import { ApiKeyProvider, useApiKey } from "./context/ApiKeyContext";
import SplashScreen, { useSplash } from "./components/SplashScreen";

import Home        from "./tools/Home";
import ThreatMap   from "./tools/ThreatMap";
import RedTeam     from "./tools/RedTeam";
import Osint       from "./tools/Osint";
import Disinfo     from "./tools/Disinfo";
import Maritime    from "./tools/Maritime";
import Satellite   from "./tools/Satellite";
import PatLife     from "./tools/PatLife";
import Psyop       from "./tools/Psyop";
import BioThreat   from "./tools/BioThreat";
import Cti         from "./tools/Cti";
import Translator  from "./tools/Translator";
import OilInfra    from "./tools/OilInfra";
import Chokepoint  from "./tools/Chokepoint";
import EnergyRisk  from "./tools/EnergyRisk";
import EnergyGrid  from "./tools/EnergyGrid";
import IntelReport      from "./tools/IntelReport";
import ScenarioBuilder from "./tools/ScenarioBuilder";

const PAGES = {
  home:        Home,
  threatmap:   ThreatMap,
  redteam:     RedTeam,
  osint:       Osint,
  disinfo:     Disinfo,
  maritime:    Maritime,
  satellite:   Satellite,
  patlife:     PatLife,
  psyop:       Psyop,
  biothreat:   BioThreat,
  cti:         Cti,
  translator:  Translator,
  oilinfra:    OilInfra,
  chokepoint:  Chokepoint,
  energyrisk:  EnergyRisk,
  energygrid:  EnergyGrid,
  intelreport:    IntelReport,
  scenariobuilder: ScenarioBuilder,
};

function ApiKeyBanner() {
  const [apiKey, setApiKey] = useApiKey();
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(false);

  function apply() {
    setApiKey(draft.trim());
    setShow(false);
  }
  function clear() {
    setApiKey("");
    setDraft("");
    setShow(false);
  }

  return (
    <div style={{ background: apiKey ? "#051a0d" : "#1a0d00", borderBottom: `1px solid ${apiKey ? "#00ff9d44" : "#ff9d0055"}`, padding: "6px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12 }}>🔑</span>
      {apiKey ? (
        <>
          <span style={{ color: "#00ff9d", fontSize: 12, fontWeight: 700 }}>AI Key active — all tools enabled</span>
          <BADGE text="AI Live" color="green" />
          <button onClick={clear} style={{ background: "none", border: "1px solid #333", borderRadius: 4, color: "#9ca3af", fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>Clear</button>
        </>
      ) : (
        <>
          <span style={{ color: "#ff9d00", fontSize: 12 }}>Enter Anthropic API key to enable AI across all tools</span>
          {show ? (
            <>
              <input
                type="password"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && apply()}
                placeholder="sk-ant-..."
                autoFocus
                style={{ background: "#0d1626", border: "1px solid #1f2d45", borderRadius: 4, padding: "4px 10px", color: "#e2e8f0", fontSize: 12, width: 240 }}
              />
              <button onClick={apply} style={{ background: "#00ff9d", color: "#0a0f1e", border: "none", borderRadius: 4, padding: "4px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Set</button>
              <button onClick={() => setShow(false)} style={{ background: "none", border: "1px solid #333", borderRadius: 4, color: "#9ca3af", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setShow(true)} style={{ background: "#ff9d00", color: "#0a0f1e", border: "none", borderRadius: 4, padding: "4px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Set Key</button>
          )}
        </>
      )}
    </div>
  );
}

function AppInner() {
  const [page, setPage] = useState("home");
  const [blink, setBlink] = useState(true);
  useEffect(() => { const t = setInterval(() => setBlink(x => !x), 800); return () => clearInterval(t); }, []);

  const Page = PAGES[page] || Home;
  const isEnergy = id => ENERGY_IDS.includes(id);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'Segoe UI',sans-serif" }}>
      <nav style={{ background: "#0d1626", borderBottom: "1px solid #1f2d45", padding: "0 10px", display: "flex", alignItems: "center", overflowX: "auto" }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            style={{
              background: "none", border: "none",
              borderBottom: page === n.id ? `2px solid ${isEnergy(n.id) ? "#ff9d00" : n.id === "intelreport" ? "#b47fff" : n.id === "scenariobuilder" ? "#22d3ee" : "#00ff9d"}` : "2px solid transparent",
              color: page === n.id ? (isEnergy(n.id) ? "#ff9d00" : n.id === "intelreport" ? "#b47fff" : n.id === "scenariobuilder" ? "#22d3ee" : "#00ff9d") : "#9ca3af",
              padding: "11px 9px", cursor: "pointer", fontSize: 11,
              fontWeight: page === n.id ? 700 : 400, whiteSpace: "nowrap",
            }}>
            {n.icon} {n.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", paddingLeft: 10, display: "flex", alignItems: "center", gap: 7, minWidth: 190 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#1a0a0a", borderRadius: 5, padding: "3px 8px", border: "1px solid #ff4d4d" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: blink ? "#ff4d4d" : "#330000", transition: "background 0.3s" }} />
            <span style={{ color: "#ff4d4d", fontSize: 10, fontWeight: 700 }}>3 CRITICAL</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#1a0e00", borderRadius: 5, padding: "3px 8px", border: "1px solid #ff9d00" }}>
            <span style={{ fontSize: 9 }}>🛢️</span>
            <span style={{ color: "#ff9d00", fontSize: 10, fontWeight: 700 }}>ENERGY</span>
          </div>
          <BADGE text="v0.8" color="gray" />
        </div>
      </nav>
      <ApiKeyBanner />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
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
