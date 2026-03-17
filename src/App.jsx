import { useState, useEffect } from "react";
import { NAV, ENERGY_IDS } from "./constants";
import { BADGE } from "./components/shared";

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
};

export default function App() {
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
              borderBottom: page === n.id ? `2px solid ${isEnergy(n.id) ? "#ff9d00" : "#00ff9d"}` : "2px solid transparent",
              color: page === n.id ? (isEnergy(n.id) ? "#ff9d00" : "#00ff9d") : "#9ca3af",
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
          <BADGE text="v0.6" color="gray" />
        </div>
      </nav>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <Page setPage={setPage} />
      </div>
    </div>
  );
}
