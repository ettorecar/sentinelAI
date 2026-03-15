import { useState, useEffect } from "react";

const NAV = [
  { id:"home",       label:"Home",              icon:"🏠" },
  { id:"threatmap",  label:"Threat Map",         icon:"🌍" },
  { id:"redteam",    label:"Red Team",           icon:"🤖" },
  { id:"osint",      label:"OSINT",              icon:"🔍" },
  { id:"disinfo",    label:"Disinfo",            icon:"📰" },
  { id:"maritime",   label:"Maritime",           icon:"🌊" },
  { id:"satellite",  label:"Satellite",          icon:"🛰️" },
  { id:"patlife",    label:"Pattern of Life",    icon:"📍" },
  { id:"psyop",      label:"PSYOP",              icon:"🧠" },
  { id:"biothreat",  label:"Bio-Threat",         icon:"🦠" },
  { id:"cti",        label:"Cyber Intel",        icon:"🔐" },
  { id:"oilinfra",   label:"Oil Infrastructure", icon:"🛢️" },
  { id:"chokepoint", label:"Chokepoints",        icon:"🚢" },
  { id:"energyrisk", label:"Energy Risk",        icon:"📊" },
];

const TOOL_DESC = {
  threatmap:  "Global real-time threat activity map with geolocation of active incidents.",
  redteam:    "Generate realistic threat scenarios with AI to stress-test your defences.",
  osint:      "Correlate open-source intelligence entities across multiple data sources.",
  disinfo:    "Detect and classify disinformation campaigns using NLP analysis.",
  maritime:   "Track vessel anomalies and suspicious AIS behaviour in real time.",
  satellite:  "Plan operations around satellite overflight windows using TLE data.",
  patlife:    "Reconstruct spatio-temporal behaviour patterns from open-source data.",
  psyop:      "Identify psychological operation techniques in media and communications.",
  biothreat:  "Aggregate epidemiological signals to detect potential bio-threat events.",
  cti:        "Unified cyber threat intelligence feed with actor profiling and IOC tracking.",
  oilinfra:   "Monitor threats to critical oil & gas infrastructure worldwide.",
  chokepoint: "Track strategic maritime chokepoints and their impact on global energy flows.",
  energyrisk: "Analyze national energy supply chain vulnerabilities and disruption scenarios.",
};

const RC = { CRITICAL:"#ff0000", HIGH:"#ff4d4d", MEDIUM:"#ffd700", LOW:"#00ff9d", INFO:"#4db8ff" };
const BADGE = ({ text, color }) => {
  const c = { green:"#00ff9d", yellow:"#ffd700", red:"#ff4d4d", blue:"#4db8ff", gray:"#555", orange:"#ff9d00" };
  return <span style={{background:c[color]||color||c.gray,color:"#0a0f1e",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{text}</span>;
};
const Card = ({ children, style }) => (
  <div style={{background:"#111827",border:"1px solid #1f2d45",borderRadius:10,padding:20,marginBottom:14,...style}}>{children}</div>
);
const Input = ({ label, value, onChange, placeholder, type="text", rows }) => (
  <div style={{marginBottom:14}}>
    {label && <div style={{color:"#9ca3af",fontSize:13,marginBottom:6}}>{label}</div>}
    {rows
      ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
          style={{width:"100%",background:"#0d1626",border:"1px solid #1f2d45",borderRadius:6,padding:10,color:"#e2e8f0",fontSize:14,resize:"vertical",boxSizing:"border-box"}}/>
      : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{width:"100%",background:"#0d1626",border:"1px solid #1f2d45",borderRadius:6,padding:10,color:"#e2e8f0",fontSize:14,boxSizing:"border-box"}}/>}
  </div>
);
const Btn = ({ onClick, children, disabled, color="#00ff9d" }) => (
  <button onClick={onClick} disabled={disabled}
    style={{background:disabled?"#1f2d45":color,color:disabled?"#555":"#0a0f1e",border:"none",borderRadius:6,
      padding:"10px 22px",fontWeight:700,fontSize:14,cursor:disabled?"not-allowed":"pointer"}}>{children}</button>
);
const ST = ({ icon, label, color="#4db8ff" }) => <div style={{fontWeight:700,color,marginBottom:12}}>{icon} {label}</div>;
const MockBadge = () => <BADGE text="Mock Data" color="yellow"/>;
const Pulse = ({ color="#ff4d4d", size=10 }) => (
  <span style={{position:"relative",display:"inline-block",width:size,height:size}}>
    <span style={{position:"absolute",borderRadius:"50%",background:color,width:size,height:size,animation:"pulse 1.5s infinite"}}/>
    <span style={{position:"absolute",borderRadius:"50%",background:color,width:size,height:size,opacity:0.4,transform:"scale(2)",animation:"pulseRing 1.5s infinite"}}/>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}} @keyframes pulseRing{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.5);opacity:0}}`}</style>
  </span>
);

// ── OIL INFRASTRUCTURE THREAT MONITOR ────────────────────────────────────────
function OilInfra() {
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState("ALL");

  const assets = [
    {id:"OG-001",name:"Abqaiq Processing Facility",country:"Saudi Arabia",type:"Refinery",risk:"CRITICAL",lat:26.0,lon:49.7,mx:430,my:185,incident:"Drone swarm threat detected in perimeter",lastEvt:"14/03",barrel:"7.0Mb/d"},
    {id:"OG-002",name:"Druzhba Pipeline — Western Segment",country:"Russia/EU",type:"Pipeline",risk:"HIGH",lat:51.0,lon:28.0,mx:358,my:108,incident:"Unexplained pressure anomaly, 3rd segment",lastEvt:"13/03",barrel:"1.2Mb/d"},
    {id:"OG-003",name:"Ras Tanura Marine Terminal",country:"Saudi Arabia",type:"Terminal",risk:"HIGH",lat:26.7,lon:50.1,mx:435,my:180,incident:"Suspicious vessel loitering 12nm offshore",lastEvt:"12/03",barrel:"6.5Mb/d"},
    {id:"OG-004",name:"Kharg Island Terminal",country:"Iran",type:"Terminal",risk:"MEDIUM",lat:29.2,lon:50.3,mx:438,my:172,incident:"Elevated military activity nearby",lastEvt:"11/03",barrel:"2.5Mb/d"},
    {id:"OG-005",name:"Nord Stream Monitoring Zone",country:"Baltic Sea",type:"Pipeline",risk:"HIGH",lat:55.0,lon:15.0,mx:335,my:97,incident:"Seismic anomaly detected near route",lastEvt:"10/03",barrel:"0Mb/d"},
    {id:"OG-006",name:"Kirkuk-Ceyhan Pipeline",country:"Iraq/Turkey",type:"Pipeline",risk:"MEDIUM",lat:37.0,lon:40.0,mx:388,my:148,incident:"Armed group activity near pumping station",lastEvt:"09/03",barrel:"0.6Mb/d"},
    {id:"OG-007",name:"Sumed Pipeline",country:"Egypt",type:"Pipeline",risk:"LOW",lat:30.0,lon:32.5,mx:368,my:175,incident:"Routine maintenance in progress",lastEvt:"08/03",barrel:"2.3Mb/d"},
  ];

  const typeIcons = {Refinery:"⚗️",Pipeline:"〰️",Terminal:"⚓"};
  const filtered = filter==="ALL" ? assets : assets.filter(a=>a.risk===filter);
  const rc = r => r==="CRITICAL"?"#ff0000":r==="HIGH"?"#ff4d4d":r==="MEDIUM"?"#ffd700":"#00ff9d";

  const totalBarrels = "18.1Mb/d";

  return (
    <div>
      <h2 style={{color:"#ff9d00",marginTop:0}}>🛢️ Oil & Gas Infrastructure Threat Monitor</h2>
      <p style={{color:"#9ca3af",marginTop:-8,marginBottom:16}}>Real-time threat assessment for critical energy infrastructure worldwide. <MockBadge/></p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[["Monitored Assets","47","#ff9d00"],["Critical Threats","2","#ff4d4d"],["At-Risk Flow",totalBarrels,"#ffd700"],["Incidents (24h)","7","#4db8ff"]].map(([l,v,c])=>(
          <Card key={l} style={{textAlign:"center",padding:12}}><div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div><div style={{color:"#9ca3af",fontSize:11}}>{l}</div></Card>
        ))}
      </div>

      {/* Map */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 16px 0",fontWeight:700,color:"#4db8ff"}}>🗺️ Global Asset Map</div>
        <svg viewBox="0 0 700 320" style={{width:"100%",background:"#050d1a",display:"block"}}>
          {[70,130,200,270].map(y=><line key={y} x1={0} y1={y} x2={700} y2={y} stroke="#0d2040" strokeWidth="1"/>)}
          {[0,140,280,420,560,700].map(x=><line key={x} x1={x} y1={0} x2={x} y2={320} stroke="#0d2040" strokeWidth="1"/>)}
          {/* Continents */}
          <path d="M 60 80 Q 80 60 120 65 Q 150 60 175 80 Q 185 100 180 130 Q 170 160 155 180 Q 140 200 120 210 Q 100 195 85 175 Q 65 150 55 120 Q 48 95 60 80Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 145 220 Q 165 215 180 230 Q 190 250 185 280 Q 178 310 165 318 Q 150 320 138 308 Q 125 290 125 260 Q 125 238 145 220Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 295 70 Q 330 60 365 70 Q 385 80 390 100 Q 385 115 365 118 Q 340 122 315 115 Q 295 105 290 90 Q 288 78 295 70Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 295 130 Q 330 125 360 135 Q 375 155 372 185 Q 368 220 355 248 Q 338 268 318 265 Q 298 260 288 238 Q 278 210 280 180 Q 282 152 295 130Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 400 65 Q 470 55 540 65 Q 600 70 650 85 Q 685 100 695 125 Q 690 150 665 160 Q 630 168 590 162 Q 545 155 500 148 Q 455 140 420 128 Q 395 115 390 95 Q 390 78 400 65Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 600 255 Q 640 250 670 263 Q 685 280 678 300 Q 665 315 640 315 Q 615 312 605 295 Q 596 277 600 255Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          {/* Pipeline routes */}
          <path d="M 358 108 Q 370 130 388 148" fill="none" stroke="#ff9d00" strokeWidth="1.5" strokeDasharray="5" opacity="0.5"/>
          <path d="M 368 175 Q 380 178 388 148" fill="none" stroke="#ff9d00" strokeWidth="1.5" strokeDasharray="5" opacity="0.5"/>
          <path d="M 430 185 Q 432 182 435 180" fill="none" stroke="#ff9d00" strokeWidth="1.5" strokeDasharray="5" opacity="0.5"/>
          {/* Assets */}
          {assets.map((a,i)=>(
            <g key={i} onClick={()=>setSel(sel?.id===a.id?null:a)} style={{cursor:"pointer"}}>
              {a.risk==="CRITICAL"&&<circle cx={a.mx} cy={a.my} r={16} fill="none" stroke="#ff0000" strokeWidth="0.8" opacity="0.4"/>}
              <circle cx={a.mx} cy={a.my} r={sel?.id===a.id?10:7} fill={rc(a.risk)} opacity={0.9}/>
              <circle cx={a.mx} cy={a.my} r={sel?.id===a.id?14:10} fill="none" stroke={rc(a.risk)} strokeWidth="1" opacity="0.3"/>
              <text x={a.mx+12} y={a.my+4} fill="#e2e8f0" fontSize="8">{a.name.split(" ")[0]}</text>
            </g>
          ))}
          {/* Legend */}
          {[["Critical","#ff0000",10],["High","#ff4d4d",70],["Medium","#ffd700",125],["Low","#00ff9d",180]].map(([l,c,x])=>(
            <g key={l}><circle cx={x+8} cy={308} r={5} fill={c}/><text x={x+17} y={312} fill="#9ca3af" fontSize="8">{l}</text></g>
          ))}
          <text x={550} y={312} fill="#9ca3af" fontSize="8">● = asset, --- = pipeline route</text>
        </svg>
        {sel&&(
          <div style={{margin:"0 16px 16px",background:"#0d1626",borderRadius:8,padding:14,borderLeft:`3px solid ${rc(sel.risk)}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:800,color:"#e2e8f0"}}>{typeIcons[sel.type]} {sel.name}</div>
              <BADGE text={sel.risk} color={sel.risk==="CRITICAL"||sel.risk==="HIGH"?"red":sel.risk==="MEDIUM"?"yellow":"green"}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[["Country",sel.country],["Type",sel.type],["Flow",sel.barrel],["Last Event",sel.lastEvt]].map(([l,v])=>(
                <div key={l}><div style={{color:"#9ca3af",fontSize:10}}>{l}</div><div style={{color:"#e2e8f0",fontSize:12}}>{v}</div></div>
              ))}
            </div>
            <div style={{marginTop:8,color:"#ffd700",fontSize:13}}>⚠️ {sel.incident}</div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <ST icon="⚠️" label="Incident Log" color="#ff9d00"/>
          <div style={{display:"flex",gap:6}}>
            {["ALL","CRITICAL","HIGH","MEDIUM","LOW"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{background:filter===f?"#ff9d00":"#1f2d45",color:filter===f?"#0a0f1e":"#9ca3af",border:"none",borderRadius:4,padding:"3px 9px",cursor:"pointer",fontSize:11,fontWeight:filter===f?700:400}}>{f}</button>
            ))}
          </div>
        </div>
        {filtered.map(a=>(
          <div key={a.id} style={{background:"#0d1626",borderRadius:7,padding:"10px 14px",marginBottom:7,borderLeft:`3px solid ${rc(a.risk)}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <span style={{color:"#9ca3af",fontSize:10,fontFamily:"monospace"}}>{a.id} · {a.lastEvt}</span>
                <div style={{fontWeight:700,color:"#e2e8f0"}}>{typeIcons[a.type]} {a.name}</div>
                <div style={{color:"#9ca3af",fontSize:12}}>{a.country} · Flow: <span style={{color:"#ff9d00"}}>{a.barrel}</span></div>
                <div style={{color:"#ffd700",fontSize:12,marginTop:3}}>⚠️ {a.incident}</div>
              </div>
              <BADGE text={a.risk} color={a.risk==="CRITICAL"||a.risk==="HIGH"?"red":a.risk==="MEDIUM"?"yellow":"green"}/>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── STRATEGIC CHOKEPOINT MONITOR ─────────────────────────────────────────────
function Chokepoint() {
  const [sel, setSel] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),1800);return()=>clearInterval(t);},[]);

  const chokepoints = [
    {id:"CP-01",name:"Strait of Hormuz",location:"Persian Gulf",mx:455,my:188,risk:"CRITICAL",
     flow:"21Mb/d",pct:"21%",tension:"Extreme",threats:["Iranian naval exercises","Mine laying reports","Drone harassment of tankers"],
     altRoute:"None — no viable alternative",history:[18,19,20,21,20,19,21]},
    {id:"CP-02",name:"Strait of Malacca",location:"SE Asia",mx:590,my:215,risk:"HIGH",
     flow:"16Mb/d",pct:"16%",tension:"Elevated",threats:["Piracy incidents up 40%","Territorial disputes","Cyber attacks on port systems"],
     altRoute:"Lombok Strait (+4 days transit)",history:[14,15,15,16,16,15,16]},
    {id:"CP-03",name:"Bab-el-Mandeb",location:"Red Sea / Yemen",mx:405,my:218,risk:"CRITICAL",
     flow:"8.8Mb/d",pct:"9%",tension:"Extreme",threats:["Houthi missile attacks","Drone boats","Coalition naval response"],
     altRoute:"Cape of Good Hope (+15 days, +$1.2M/voyage)",history:[9,8,7,6,5,4,4]},
    {id:"CP-04",name:"Suez Canal",location:"Egypt",mx:375,my:178,risk:"MEDIUM",
     flow:"5.5Mb/d",pct:"5%",tension:"Moderate",threats:["Diversion due to Houthi threat","Congestion incidents"],
     altRoute:"Cape of Good Hope or SUMED pipeline",history:[7,7,6,6,5,5,6]},
    {id:"CP-05",name:"Turkish Straits",location:"Bosphorus / Dardanelles",mx:365,my:138,risk:"MEDIUM",
     flow:"2.4Mb/d",pct:"2%",tension:"Moderate",threats:["Russian Black Sea fleet movements","Sanctions complications"],
     altRoute:"Trans-Anatolian Pipeline (TANAP)",history:[3,3,2,2,2,2,2]},
    {id:"CP-06",name:"Danish Straits",location:"North Sea",mx:322,my:88,risk:"LOW",
     flow:"1.5Mb/d",pct:"1%",tension:"Low",threats:["Occasional Russian submarine activity"],
     altRoute:"Pipeline alternatives available",history:[1,1,2,1,1,2,1]},
  ];

  const rc = r => r==="CRITICAL"?"#ff0000":r==="HIGH"?"#ff4d4d":r==="MEDIUM"?"#ffd700":"#00ff9d";
  const Spark = ({data,color}) => {
    const max=Math.max(...data);
    const pts=data.map((v,i)=>`${(i/(data.length-1))*55},${18-((v/max)*16)}`).join(" ");
    return <svg viewBox="0 0 55 20" style={{width:55,height:20}}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"/></svg>;
  };

  return (
    <div>
      <h2 style={{color:"#ff9d00",marginTop:0}}>🚢 Strategic Chokepoint Monitor</h2>
      <p style={{color:"#9ca3af",marginTop:-8,marginBottom:16}}>Global maritime energy chokepoints — flow, tension and disruption risk. <MockBadge/></p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[["Total Monitored Flow","55Mb/d","#ff9d00"],["Critical Chokepoints","2","#ff4d4d"],["At Extreme Tension","2","#ff4d4d"],["Rerouting Events","3","#ffd700"]].map(([l,v,c])=>(
          <Card key={l} style={{textAlign:"center",padding:12}}><div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div><div style={{color:"#9ca3af",fontSize:11}}>{l}</div></Card>
        ))}
      </div>

      {/* World map with chokepoints */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 16px 0",fontWeight:700,color:"#4db8ff"}}>🗺️ Global Chokepoint Map — Click for detail</div>
        <svg viewBox="0 0 700 310" style={{width:"100%",background:"#050d1a",display:"block"}}>
          {[65,125,195,265].map(y=><line key={y} x1={0} y1={y} x2={700} y2={y} stroke="#0d2040" strokeWidth="1"/>)}
          {[0,140,280,420,560,700].map(x=><line key={x} x1={x} y1={0} x2={x} y2={310} stroke="#0d2040" strokeWidth="1"/>)}
          <path d="M 60 78 Q 80 60 120 64 Q 150 59 175 79 Q 185 99 180 129 Q 170 158 155 178 Q 140 198 120 208 Q 100 193 85 173 Q 65 148 55 119 Q 48 93 60 78Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 145 218 Q 165 213 180 228 Q 190 248 185 278 Q 178 308 165 316 Q 150 318 138 306 Q 125 288 125 258 Q 125 236 145 218Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 293 68 Q 330 58 365 68 Q 385 78 390 98 Q 385 113 365 116 Q 340 120 315 113 Q 293 103 288 88 Q 286 76 293 68Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 293 128 Q 330 123 360 133 Q 375 153 372 183 Q 368 218 355 246 Q 338 266 318 263 Q 298 258 288 236 Q 278 208 280 178 Q 282 150 293 128Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 398 63 Q 468 53 538 63 Q 598 68 648 83 Q 683 98 693 123 Q 688 148 663 158 Q 628 166 588 160 Q 543 153 498 146 Q 453 138 418 126 Q 393 113 388 93 Q 388 76 398 63Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 598 253 Q 638 248 668 261 Q 683 278 676 298 Q 663 313 638 313 Q 613 310 603 293 Q 594 275 598 253Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>

          {/* Flow lines between chokepoints */}
          <path d="M 455 188 Q 430 200 405 218" fill="none" stroke="#ff9d00" strokeWidth="1" strokeDasharray="4" opacity="0.4"/>
          <path d="M 405 218 Q 390 200 375 178" fill="none" stroke="#ff9d00" strokeWidth="1" strokeDasharray="4" opacity="0.4"/>
          <path d="M 455 188 Q 520 200 590 215" fill="none" stroke="#ff9d00" strokeWidth="1" strokeDasharray="4" opacity="0.4"/>

          {/* Chokepoints */}
          {chokepoints.map((cp,i)=>{
            const c=rc(cp.risk);
            const pulse=(tick+i*3)%10;
            const crit=cp.risk==="CRITICAL";
            return(
              <g key={cp.id} onClick={()=>setSel(sel?.id===cp.id?null:cp)} style={{cursor:"pointer"}}>
                {crit&&<circle cx={cp.mx} cy={cp.my} r={14+pulse*1.2} fill="none" stroke={c} strokeWidth="0.8" opacity={Math.max(0,0.5-pulse*0.05)}/>}
                <circle cx={cp.mx} cy={cp.my} r={crit?10:7} fill={c} opacity={0.85}/>
                <circle cx={cp.mx} cy={cp.my} r={crit?15:11} fill="none" stroke={c} strokeWidth="1.5" opacity="0.3"/>
                <text x={cp.mx} y={cp.my-16} textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="bold">{cp.name.split(" ").slice(-1)[0]}</text>
                <text x={cp.mx} y={cp.my+4} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold">{cp.flow}</text>
              </g>
            );
          })}
          {[["CRITICAL","#ff0000",10],["HIGH","#ff4d4d",72],["MEDIUM","#ffd700",128],["LOW","#00ff9d",186]].map(([l,c,x])=>(
            <g key={l}><circle cx={x+7} cy={298} r={5} fill={c}/><text x={x+15} y={302} fill="#9ca3af" fontSize="8">{l}</text></g>
          ))}
        </svg>
      </Card>

      {/* Selected detail */}
      {sel&&(
        <Card style={{borderColor:rc(sel.risk),borderWidth:2}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div style={{fontWeight:800,fontSize:17,color:"#e2e8f0"}}>{sel.name}</div>
              <div style={{color:"#9ca3af",fontSize:13}}>{sel.location}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <BADGE text={sel.risk} color={sel.risk==="CRITICAL"||sel.risk==="HIGH"?"red":sel.risk==="MEDIUM"?"yellow":"green"}/>
              <div style={{color:"#ff9d00",fontWeight:800,fontSize:20,marginTop:4}}>{sel.flow}</div>
              <div style={{color:"#9ca3af",fontSize:11}}>{sel.pct} of global oil trade</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={{background:"#0d1626",borderRadius:6,padding:10}}>
              <div style={{color:"#9ca3af",fontSize:11,marginBottom:4}}>ACTIVE THREATS</div>
              {sel.threats.map((t,i)=><div key={i} style={{color:"#ffd700",fontSize:12,marginBottom:3}}>• {t}</div>)}
            </div>
            <div style={{background:"#0d1626",borderRadius:6,padding:10}}>
              <div style={{color:"#9ca3af",fontSize:11,marginBottom:4}}>ALTERNATIVE ROUTE</div>
              <div style={{color:"#e2e8f0",fontSize:12}}>{sel.altRoute}</div>
              <div style={{color:"#9ca3af",fontSize:11,marginTop:8,marginBottom:2}}>7-DAY FLOW TREND (Mb/d)</div>
              <Spark data={sel.history} color={rc(sel.risk)}/>
            </div>
          </div>
          <div style={{background:"#0d1626",borderRadius:6,padding:10}}>
            <div style={{color:"#9ca3af",fontSize:11,marginBottom:4}}>TENSION LEVEL</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,background:"#1f2d45",borderRadius:4,height:10}}>
                <div style={{background:rc(sel.risk),height:10,borderRadius:4,width:sel.risk==="CRITICAL"?"95%":sel.risk==="HIGH"?"75%":sel.risk==="MEDIUM"?"50%":"25%",transition:"width 1s"}}/>
              </div>
              <span style={{color:rc(sel.risk),fontWeight:700,fontSize:14}}>{sel.tension}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Cards grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {chokepoints.map(cp=>(
          <Card key={cp.id} style={{cursor:"pointer",borderColor:sel?.id===cp.id?rc(cp.risk):"#1f2d45",padding:14}}
            onClick={()=>setSel(sel?.id===cp.id?null:cp)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontWeight:700,color:"#e2e8f0",fontSize:14}}>{cp.name}</div>
                <div style={{color:"#9ca3af",fontSize:12}}>{cp.location}</div>
              </div>
              <BADGE text={cp.risk} color={cp.risk==="CRITICAL"||cp.risk==="HIGH"?"red":cp.risk==="MEDIUM"?"yellow":"green"}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
              <div>
                <div style={{color:"#ff9d00",fontWeight:800,fontSize:18}}>{cp.flow}</div>
                <div style={{color:"#9ca3af",fontSize:11}}>{cp.pct} of global trade</div>
              </div>
              <Spark data={cp.history} color={rc(cp.risk)}/>
            </div>
            <div style={{background:"#1f2d45",borderRadius:3,height:5,marginTop:8}}>
              <div style={{background:rc(cp.risk),height:5,borderRadius:3,width:cp.risk==="CRITICAL"?"95%":cp.risk==="HIGH"?"75%":cp.risk==="MEDIUM"?"50%":"25%"}}/>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── ENERGY SUPPLY CHAIN RISK ANALYZER ────────────────────────────────────────
function EnergyRisk() {
  const [country, setCountry] = useState("Germany");
  const [ran, setRan] = useState(false);

  const countries = ["Germany","Italy","France","Poland","Japan","South Korea","India","Turkey"];

  const profiles = {
    Germany: {
      import_dep: 95, top_suppliers:[{name:"Norway",pct:32,risk:"LOW"},{name:"USA",pct:18,risk:"LOW"},{name:"Russia",pct:12,risk:"CRITICAL"},{name:"Algeria",pct:11,risk:"MEDIUM"},{name:"Others",pct:27,risk:"LOW"}],
      vulnerability: "HIGH", storage_days:65, alt_score:62,
      scenarios:[{name:"Russian gas cutoff",impact:"HIGH",gdp_loss:"1.8%",duration:"12–18 mo"},{name:"Norwegian field disruption",impact:"MEDIUM",gdp_loss:"0.9%",duration:"3–6 mo"},{name:"LNG terminal cyberattack",impact:"HIGH",gdp_loss:"1.2%",duration:"2–4 mo"}],
      chokepoint_exposure:["Bab-el-Mandeb (LNG)","Danish Straits (pipeline)"],
      resilience_score: 58
    },
    Italy: {
      import_dep: 90, top_suppliers:[{name:"Algeria",pct:31,risk:"MEDIUM"},{name:"Russia",pct:12,risk:"CRITICAL"},{name:"Azerbaijan",pct:15,risk:"MEDIUM"},{name:"Libya",pct:10,risk:"HIGH"},{name:"Others",pct:32,risk:"LOW"}],
      vulnerability: "HIGH", storage_days:55, alt_score:55,
      scenarios:[{name:"Libyan pipeline disruption",impact:"HIGH",gdp_loss:"1.4%",duration:"6–12 mo"},{name:"Algerian political instability",impact:"HIGH",gdp_loss:"1.6%",duration:"12–24 mo"},{name:"Strait of Hormuz closure",impact:"MEDIUM",gdp_loss:"0.7%",duration:"1–3 mo"}],
      chokepoint_exposure:["Strait of Hormuz (LNG)","Bab-el-Mandeb (LNG)","Suez Canal"],
      resilience_score: 51
    },
    Japan: {
      import_dep: 99, top_suppliers:[{name:"Australia",pct:39,risk:"LOW"},{name:"Malaysia",pct:13,risk:"LOW"},{name:"Qatar",pct:11,risk:"MEDIUM"},{name:"Russia",pct:9,risk:"HIGH"},{name:"Others",pct:28,risk:"LOW"}],
      vulnerability: "CRITICAL", storage_days:45, alt_score:40,
      scenarios:[{name:"Strait of Malacca closure",impact:"CRITICAL",gdp_loss:"3.2%",duration:"indefinite"},{name:"Hormuz disruption",impact:"HIGH",gdp_loss:"2.1%",duration:"6–12 mo"},{name:"Conflict in Taiwan Strait",impact:"CRITICAL",gdp_loss:"4.0%",duration:"indefinite"}],
      chokepoint_exposure:["Strait of Malacca","Strait of Hormuz","Taiwan Strait"],
      resilience_score: 38
    },
    France: {
      import_dep: 98, top_suppliers:[{name:"Norway",pct:36,risk:"LOW"},{name:"USA",pct:22,risk:"LOW"},{name:"Algeria",pct:14,risk:"MEDIUM"},{name:"Russia",pct:7,risk:"CRITICAL"},{name:"Others",pct:21,risk:"LOW"}],
      vulnerability:"MEDIUM", storage_days:90, alt_score:72,
      scenarios:[{name:"Norwegian field disruption",impact:"MEDIUM",gdp_loss:"0.8%",duration:"3–6 mo"},{name:"Algerian instability",impact:"MEDIUM",gdp_loss:"0.6%",duration:"6–12 mo"}],
      chokepoint_exposure:["Bab-el-Mandeb (LNG)"],
      resilience_score:70
    },
    Poland: {
      import_dep: 96, top_suppliers:[{name:"Norway",pct:28,risk:"LOW"},{name:"USA LNG",pct:25,risk:"LOW"},{name:"Qatar",pct:18,risk:"MEDIUM"},{name:"Russia",pct:5,risk:"CRITICAL"},{name:"Others",pct:24,risk:"LOW"}],
      vulnerability:"MEDIUM", storage_days:75, alt_score:68,
      scenarios:[{name:"Baltic pipeline sabotage",impact:"HIGH",gdp_loss:"1.1%",duration:"3–9 mo"}],
      chokepoint_exposure:["Danish Straits","Bab-el-Mandeb (LNG)"],
      resilience_score:65
    },
    "South Korea": {
      import_dep:100, top_suppliers:[{name:"Qatar",pct:24,risk:"MEDIUM"},{name:"Australia",pct:21,risk:"LOW"},{name:"USA",pct:16,risk:"LOW"},{name:"Malaysia",pct:11,risk:"LOW"},{name:"Others",pct:28,risk:"LOW"}],
      vulnerability:"CRITICAL", storage_days:40, alt_score:42,
      scenarios:[{name:"Malacca closure",impact:"CRITICAL",gdp_loss:"2.8%",duration:"indefinite"},{name:"Hormuz disruption",impact:"HIGH",gdp_loss:"1.9%",duration:"6–12 mo"}],
      chokepoint_exposure:["Strait of Malacca","Strait of Hormuz","Taiwan Strait"],
      resilience_score:41
    },
    India: {
      import_dep:87, top_suppliers:[{name:"Iraq",pct:22,risk:"MEDIUM"},{name:"Saudi Arabia",pct:18,risk:"HIGH"},{name:"Russia",pct:17,risk:"HIGH"},{name:"UAE",pct:10,risk:"MEDIUM"},{name:"Others",pct:33,risk:"LOW"}],
      vulnerability:"HIGH", storage_days:30, alt_score:50,
      scenarios:[{name:"Hormuz closure",impact:"CRITICAL",gdp_loss:"2.5%",duration:"6–18 mo"},{name:"Bab-el-Mandeb disruption",impact:"HIGH",gdp_loss:"1.3%",duration:"3–9 mo"}],
      chokepoint_exposure:["Strait of Hormuz","Bab-el-Mandeb"],
      resilience_score:44
    },
    Turkey: {
      import_dep:99, top_suppliers:[{name:"Russia",pct:33,risk:"CRITICAL"},{name:"Azerbaijan",pct:20,risk:"MEDIUM"},{name:"Iran",pct:10,risk:"HIGH"},{name:"Algeria",pct:8,risk:"MEDIUM"},{name:"Others",pct:29,risk:"LOW"}],
      vulnerability:"CRITICAL", storage_days:28, alt_score:38,
      scenarios:[{name:"Russian gas cutoff",impact:"CRITICAL",gdp_loss:"3.5%",duration:"indefinite"},{name:"Bosphorus closure",impact:"CRITICAL",gdp_loss:"2.8%",duration:"indefinite"}],
      chokepoint_exposure:["Turkish Straits","Strait of Hormuz (LNG)"],
      resilience_score:35
    },
  };

  const p = profiles[country];
  const rc = r => r==="CRITICAL"?"#ff0000":r==="HIGH"?"#ff4d4d":r==="MEDIUM"?"#ffd700":"#00ff9d";
  const vuln_color = v => v==="CRITICAL"?"#ff0000":v==="HIGH"?"#ff4d4d":v==="MEDIUM"?"#ffd700":"#00ff9d";

  // Donut chart SVG
  const DonutChart = ({suppliers}) => {
    let angle = -90;
    const r = 42; const cx = 60; const cy = 60;
    const slices = suppliers.map(s => {
      const a = (s.pct/100)*360;
      const start = angle; angle += a;
      return {...s, startAngle:start, endAngle:start+a};
    });
    const toXY = (cx,cy,r,deg) => {
      const rad = deg*Math.PI/180;
      return [cx+r*Math.cos(rad), cy+r*Math.sin(rad)];
    };
    const colors = ["#4db8ff","#00ff9d","#ffd700","#ff9d00","#b47fff"];
    return (
      <svg viewBox="0 0 120 120" style={{width:120,height:120}}>
        {slices.map((s,i)=>{
          const [x1,y1]=toXY(cx,cy,r,s.startAngle);
          const [x2,y2]=toXY(cx,cy,r,s.endAngle);
          const large=s.pct>50?1:0;
          const color = s.risk==="CRITICAL"?"#ff0000":s.risk==="HIGH"?"#ff4d4d":s.risk==="MEDIUM"?"#ffd700":colors[i%colors.length];
          return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={color} opacity="0.85" stroke="#111827" strokeWidth="1.5"/>;
        })}
        <circle cx={cx} cy={cy} r={25} fill="#111827"/>
        <text x={cx} y={cy-4} textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="bold">{p.import_dep}%</text>
        <text x={cx} y={cx+8} textAnchor="middle" fill="#9ca3af" fontSize="7">import</text>
      </svg>
    );
  };

  return (
    <div>
      <h2 style={{color:"#ff9d00",marginTop:0}}>📊 Energy Supply Chain Risk Analyzer</h2>
      <p style={{color:"#9ca3af",marginTop:-8,marginBottom:16}}>National energy dependency analysis and disruption scenario modeling. <MockBadge/></p>

      {/* Country selector */}
      <Card>
        <ST icon="🌍" label="Select Country" color="#4db8ff"/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {countries.map(c=>(
            <button key={c} onClick={()=>{setCountry(c);setRan(false);}}
              style={{background:country===c?"#ff9d00":"#1f2d45",color:country===c?"#0a0f1e":"#9ca3af",
                border:"none",borderRadius:6,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:country===c?700:400}}>{c}</button>
          ))}
        </div>
        <div style={{marginTop:14}}>
          <Btn onClick={()=>setRan(true)} color="#ff9d00">⚡ Analyze Risk Profile</Btn>
        </div>
      </Card>

      {ran && p && (
        <>
          {/* Overview */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
            {[["Import Dependency",p.import_dep+"%","#ff9d00"],["Vulnerability",p.vulnerability,vuln_color(p.vulnerability)],["Storage Days",p.storage_days+"d","#4db8ff"],["Resilience Score",p.resilience_score+"/100",p.resilience_score>65?"#00ff9d":p.resilience_score>45?"#ffd700":"#ff4d4d"]].map(([l,v,c])=>(
              <Card key={l} style={{textAlign:"center",padding:12}}><div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div><div style={{color:"#9ca3af",fontSize:11}}>{l}</div></Card>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {/* Supplier donut */}
            <Card>
              <ST icon="🥧" label="Supplier Mix" color="#ff9d00"/>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <DonutChart suppliers={p.top_suppliers}/>
                <div style={{flex:1}}>
                  {p.top_suppliers.map((s,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:10,height:10,borderRadius:"50%",background:rc(s.risk),flexShrink:0}}/>
                        <span style={{color:"#e2e8f0",fontSize:12}}>{s.name}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{color:"#ff9d00",fontWeight:700,fontSize:12}}>{s.pct}%</span>
                        <BADGE text={s.risk} color={s.risk==="CRITICAL"||s.risk==="HIGH"?"red":s.risk==="MEDIUM"?"yellow":"green"}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Resilience gauge */}
            <Card>
              <ST icon="🛡️" label="Resilience Assessment" color="#00ff9d"/>
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#9ca3af",fontSize:12}}>Overall Resilience Score</span>
                  <span style={{color:p.resilience_score>65?"#00ff9d":p.resilience_score>45?"#ffd700":"#ff4d4d",fontWeight:800}}>{p.resilience_score}/100</span>
                </div>
                <div style={{background:"#1f2d45",borderRadius:6,height:14}}>
                  <div style={{background:p.resilience_score>65?"#00ff9d":p.resilience_score>45?"#ffd700":"#ff4d4d",height:14,borderRadius:6,width:`${p.resilience_score}%`,transition:"width 1s"}}/>
                </div>
              </div>
              {[["Alternative Supply Score",p.alt_score],["Storage Coverage",Math.min(100,p.storage_days)],["Diversification",100-p.top_suppliers[0].pct]].map(([l,v])=>(
                <div key={l} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{color:"#9ca3af",fontSize:11}}>{l}</span>
                    <span style={{color:"#e2e8f0",fontSize:11}}>{v}/100</span>
                  </div>
                  <div style={{background:"#1f2d45",borderRadius:3,height:6}}>
                    <div style={{background:"#4db8ff",height:6,borderRadius:3,width:`${v}%`}}/>
                  </div>
                </div>
              ))}
              <div style={{marginTop:10}}>
                <div style={{color:"#9ca3af",fontSize:11,marginBottom:5}}>CHOKEPOINT EXPOSURE</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {p.chokepoint_exposure.map((c,i)=><BADGE key={i} text={c} color="orange"/>)}
                </div>
              </div>
            </Card>
          </div>

          {/* Scenarios */}
          <Card>
            <ST icon="💥" label="Disruption Scenarios" color="#ff4d4d"/>
            {p.scenarios.map((s,i)=>(
              <div key={i} style={{background:"#0d1626",borderRadius:7,padding:"11px 14px",marginBottom:8,borderLeft:`3px solid ${rc(s.impact)}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontWeight:700,color:"#e2e8f0"}}>{s.name}</div>
                  <BADGE text={s.impact} color={s.impact==="CRITICAL"||s.impact==="HIGH"?"red":"yellow"}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><span style={{color:"#9ca3af",fontSize:11}}>EST. GDP IMPACT </span><span style={{color:"#ff4d4d",fontWeight:700}}>{s.gdp_loss}</span></div>
                  <div><span style={{color:"#9ca3af",fontSize:11}}>DURATION </span><span style={{color:"#ffd700"}}>{s.duration}</span></div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

// ── THREAT MAP ────────────────────────────────────────────────────────────────
function ThreatMap() {
  const [tick,setTick]=useState(0); const [sel,setSel]=useState(null);
  useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),1500);return()=>clearInterval(t);},[]);
  const hotspots=[{id:1,label:"Eastern Ukraine",type:"Kinetic",level:"CRITICAL",x:390,y:118,actors:"APT-1887 + ground forces"},{id:2,label:"South China Sea",type:"Maritime",level:"HIGH",x:620,y:195,actors:"PLAN vessels, AIS spoofing"},{id:3,label:"Sahel Region",type:"Terrorism",level:"HIGH",x:270,y:230,actors:"Multiple non-state actors"},{id:4,label:"Baltic Sea",type:"Hybrid",level:"HIGH",x:345,y:90,actors:"Undersea cable interference"},{id:5,label:"Horn of Africa",type:"Bio+Piracy",level:"MEDIUM",x:380,y:245,actors:"BT-2026-003 + maritime"},{id:6,label:"Taiwan Strait",type:"Cyber+Naval",level:"CRITICAL",x:635,y:168,actors:"IRON CARDINAL + PLAN"},{id:7,label:"Persian Gulf",type:"Maritime",level:"MEDIUM",x:460,y:185,actors:"Tanker harassment ops"},{id:8,label:"Eastern Balkans",type:"Bio+Disinfo",level:"HIGH",x:360,y:125,actors:"BT-2026-031 + EMBER WOLF"},{id:9,label:"Venezuela",type:"Cyber",level:"MEDIUM",x:185,y:230,actors:"Criminal syndicate APT"},{id:10,label:"North Korea",type:"Cyber+ICBM",level:"CRITICAL",x:650,y:140,actors:"State APT cluster"}];
  const tc=t=>t==="Kinetic"?"#ff0000":t==="Cyber"||t==="Cyber+Naval"||t==="Cyber+ICBM"?"#4db8ff":t==="Maritime"?"#00cfff":t==="Terrorism"?"#ff9d00":t==="Bio+Piracy"||t==="Bio+Disinfo"?"#00ff9d":"#b47fff";
  return(
    <div>
      <h2 style={{color:"#00ff9d",marginTop:0}}>🌍 Global Threat Map</h2>
      <p style={{color:"#9ca3af",marginTop:-8,marginBottom:16}}>Real-time geolocation of active threat incidents worldwide. <MockBadge/></p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[["Active Conflicts","7","#ff4d4d"],["Cyber Incidents","143","#4db8ff"],["Maritime Alerts","12","#00cfff"],["Bio Signals","14","#00ff9d"]].map(([l,v,c])=>(
          <Card key={l} style={{textAlign:"center",padding:12}}><div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div><div style={{color:"#9ca3af",fontSize:11}}>{l}</div></Card>
        ))}
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>
        <svg viewBox="0 0 780 380" style={{width:"100%",background:"#050d1a",display:"block"}}>
          {[60,130,200,270,340].map(y=><line key={y} x1={0} y1={y} x2={780} y2={y} stroke="#0d2040" strokeWidth="1"/>)}
          {[0,130,260,390,520,650,780].map(x=><line key={x} x1={x} y1={0} x2={x} y2={380} stroke="#0d2040" strokeWidth="1"/>)}
          <path d="M 60 80 Q 80 60 120 65 Q 150 60 175 80 Q 185 100 180 130 Q 170 160 155 180 Q 140 200 120 210 Q 100 195 85 175 Q 65 150 55 120 Q 48 95 60 80Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 145 220 Q 165 215 180 230 Q 190 250 185 280 Q 178 310 165 325 Q 150 330 138 315 Q 125 295 125 265 Q 125 240 145 220Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 295 70 Q 330 60 365 70 Q 385 80 390 100 Q 385 115 365 118 Q 340 122 315 115 Q 295 105 290 90 Q 288 78 295 70Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 295 130 Q 330 125 360 135 Q 375 155 372 185 Q 368 220 355 248 Q 338 268 318 265 Q 298 260 288 238 Q 278 210 280 180 Q 282 152 295 130Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 400 65 Q 470 55 540 65 Q 600 70 650 85 Q 685 100 695 125 Q 690 150 665 160 Q 630 168 590 162 Q 545 155 500 148 Q 455 140 420 128 Q 395 115 390 95 Q 390 78 400 65Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <path d="M 600 260 Q 640 255 670 268 Q 685 285 678 305 Q 665 318 640 318 Q 615 315 605 298 Q 596 280 600 260Z" fill="#0d2040" stroke="#1a3a6a" strokeWidth="1"/>
          <line x1={390} y1={118} x2={360} y2={125} stroke="#ff4d4d" strokeWidth="0.5" strokeDasharray="3" opacity="0.4"/>
          <line x1={620} y1={195} x2={635} y2={168} stroke="#ff4d4d" strokeWidth="0.5" strokeDasharray="3" opacity="0.4"/>
          {hotspots.map((h,i)=>{const c=tc(h.type);const crit=h.level==="CRITICAL";const phase=(tick+i*2)%8;return(<g key={h.id} onClick={()=>setSel(sel?.id===h.id?null:h)} style={{cursor:"pointer"}}>{crit&&<circle cx={h.x} cy={h.y} r={18+phase*1.5} fill="none" stroke={c} strokeWidth="0.5" opacity={Math.max(0,0.5-phase*0.06)}/>}<circle cx={h.x} cy={h.y} r={crit?9:6} fill={c} opacity={0.9}/><circle cx={h.x} cy={h.y} r={crit?14:10} fill="none" stroke={c} strokeWidth="1" opacity="0.4"/>{sel?.id===h.id&&<circle cx={h.x} cy={h.y} r={18} fill="none" stroke={c} strokeWidth="2"/>}</g>);})}
          {sel&&<text x={sel.x+16} y={sel.y+4} fill="#e2e8f0" fontSize="9" fontWeight="bold">{sel.label}</text>}
          {[["Kinetic","#ff0000",20],["Cyber","#4db8ff",90],["Maritime","#00cfff",155],["Bio","#00ff9d",215],["Hybrid","#b47fff",270]].map(([l,c,x])=>(<g key={l}><circle cx={x} cy={368} r={5} fill={c}/><text x={x+9} y={372} fill="#9ca3af" fontSize="8">{l}</text></g>))}
        </svg>
      </Card>
      {sel&&<Card style={{borderLeft:`4px solid ${tc(sel.type)}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontWeight:800,fontSize:16,color:"#e2e8f0"}}>{sel.label}</div><div style={{color:"#9ca3af",fontSize:13,marginTop:4}}>Type: <span style={{color:tc(sel.type)}}>{sel.type}</span></div><div style={{color:"#9ca3af",fontSize:13,marginTop:2}}>Actors: <span style={{color:"#ffd700"}}>{sel.actors}</span></div></div><BADGE text={sel.level} color={sel.level==="CRITICAL"||sel.level==="HIGH"?"red":"yellow"}/></div></Card>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {hotspots.map(h=>(<div key={h.id} onClick={()=>setSel(sel?.id===h.id?null:h)} style={{background:"#0d1626",borderRadius:6,padding:"8px 12px",cursor:"pointer",borderLeft:`3px solid ${tc(h.type)}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:600,color:"#e2e8f0",fontSize:13}}>{h.label}</div><div style={{color:"#9ca3af",fontSize:11}}>{h.type}</div></div><BADGE text={h.level} color={h.level==="CRITICAL"||h.level==="HIGH"?"red":"yellow"}/></div>))}
      </div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function Home({ setPage }) {
  const [tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),2000);return()=>clearInterval(t);},[]);
  const feed=[{time:"14:32",type:"CTI",msg:"New IOC cluster linked to EMBER WOLF",level:"HIGH"},{time:"14:18",type:"Oil Infra",msg:"Drone threat detected — Abqaiq perimeter",level:"CRITICAL"},{time:"13:55",type:"Chokepoint",msg:"Hormuz: new mine-laying report, strait traffic -18%",level:"CRITICAL"},{time:"13:41",type:"PSYOP",msg:"Coordinated narrative surge — Telegram",level:"MEDIUM"},{time:"12:59",type:"Maritime",msg:"ADRIATICA SUN AIS blackout extended >8h",level:"HIGH"},{time:"12:30",type:"Disinfo",msg:"Campaign #UA-2023-11 reactivated",level:"MEDIUM"},{time:"11:44",type:"Energy",msg:"Germany resilience score drops to 58/100",level:"MEDIUM"}];
  const tools=NAV.slice(1);
  const isNew=id=>["oilinfra","chokepoint","energyrisk"].includes(id);
  const isEnergy=id=>["oilinfra","chokepoint","energyrisk"].includes(id);
  return(
    <div>
      <div style={{textAlign:"center",padding:"20px 0 14px"}}>
        <div style={{fontSize:36}}>🛡️</div>
        <h1 style={{fontSize:24,fontWeight:800,color:"#00ff9d",margin:"4px 0 0"}}>SENTINEL</h1>
        <p style={{color:"#9ca3af",margin:"5px 0 8px",fontSize:13}}>AI-Powered Defence Intelligence Platform</p>
        <div style={{display:"flex",gap:7,justifyContent:"center",flexWrap:"wrap"}}>
          <BADGE text="AI Powered" color="green"/><BADGE text="OSINT" color="blue"/>
          <BADGE text="Dual-Use" color="yellow"/><BADGE text="13 Tools" color="orange"/>
          <BADGE text="Energy Module" color="#ff9d00"/><BADGE text="MVP v0.5" color="gray"/>
        </div>
      </div>
      <div style={{background:"#0d1626",border:"1px solid #1f2d45",borderRadius:8,padding:"9px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}><Pulse color="#ff4d4d" size={8}/><span style={{color:"#ff4d4d",fontSize:12,fontWeight:700}}>THREAT LEVEL: ELEVATED</span></div>
        <div style={{color:"#9ca3af",fontSize:12}}>3 CRITICAL · 12 HIGH · Last update: 14:32 UTC</div>
        <div style={{marginLeft:"auto",display:"flex",gap:10,flexWrap:"wrap"}}>
          {[["CTI","HIGH","red"],["Energy","CRITICAL","red"],["Maritime","HIGH","red"],["Bio","MEDIUM","yellow"]].map(([d,l,c])=>(
            <div key={d} style={{display:"flex",alignItems:"center",gap:4}}><span style={{color:"#9ca3af",fontSize:11}}>{d}</span><BADGE text={l} color={c}/></div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <Card style={{marginBottom:0}}>
          <ST icon="📡" label="Live Intelligence Feed" color="#00ff9d"/>
          {feed.map((f,i)=>(
            <div key={i} style={{display:"flex",gap:7,alignItems:"flex-start",marginBottom:6,opacity:tick%2===0&&i===0?0.5:1,transition:"opacity 1s"}}>
              {i===0&&<Pulse color="#ff4d4d" size={7}/>}
              <span style={{color:"#9ca3af",fontSize:11,minWidth:34}}>{f.time}</span>
              <span style={{background:"#1f2d45",color:f.type==="Oil Infra"||f.type==="Chokepoint"||f.type==="Energy"?"#ff9d00":"#4db8ff",fontSize:9,fontWeight:700,borderRadius:3,padding:"1px 4px",minWidth:48,textAlign:"center"}}>{f.type}</span>
              <span style={{color:"#e2e8f0",fontSize:12,flex:1}}>{f.msg}</span>
              <BADGE text={f.level} color={f.level==="CRITICAL"?"red":f.level==="HIGH"?"red":f.level==="MEDIUM"?"yellow":"green"}/>
            </div>
          ))}
        </Card>
        <Card style={{marginBottom:0}}>
          <ST icon="🌡️" label="Global Threat Assessment" color="#ff4d4d"/>
          <div style={{textAlign:"center"}}>
            <svg viewBox="0 0 200 115" style={{width:"100%",maxWidth:210,margin:"0 auto",display:"block"}}>
              <defs><linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00ff9d"/><stop offset="50%" stopColor="#ffd700"/><stop offset="100%" stopColor="#ff0000"/></linearGradient></defs>
              <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="#1f2d45" strokeWidth="16" strokeLinecap="round"/>
              <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="url(#arcGrad)" strokeWidth="16" strokeLinecap="round" strokeDasharray="251" strokeDashoffset="63"/>
              <line x1="100" y1="105" x2="58" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="100" cy="105" r="7" fill="#111827" stroke="#fff" strokeWidth="2"/>
              <text x="100" y="82" textAnchor="middle" fill="#ff4d4d" fontSize="12" fontWeight="bold">ELEVATED</text>
              <text x="14" y="120" fill="#00ff9d" fontSize="8">LOW</text>
              <text x="88" y="18" fill="#ffd700" fontSize="8">MED</text>
              <text x="162" y="120" fill="#ff0000" fontSize="8">CRIT</text>
            </svg>
          </div>
          <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginTop:4}}>
            {[["3 Critical","red"],["12 High","red"],["8 Medium","yellow"],["5 Low","green"]].map(([l,c])=><BADGE key={l} text={l} color={c}/>)}
          </div>
          <div style={{marginTop:10,textAlign:"center"}}><Btn onClick={()=>setPage("threatmap")} color="#1f2d45">🌍 Open Threat Map →</Btn></div>
        </Card>
      </div>
      {/* Energy module highlight */}
      <div style={{background:"linear-gradient(135deg,#1a1200,#111827)",border:"1px solid #ff9d0044",borderRadius:10,padding:16,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:20}}>🛢️</span>
          <span style={{fontWeight:800,color:"#ff9d00",fontSize:15}}>NEW — Energy Intelligence Module</span>
          <BADGE text="v0.5" color="orange"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[["oilinfra","🛢️ Oil Infrastructure","Monitor threats to critical O&G assets"],["chokepoint","🚢 Chokepoints","Global maritime energy choke analysis"],["energyrisk","📊 Energy Risk","National supply chain vulnerability"]].map(([id,label,desc])=>(
            <div key={id} style={{background:"#0d1626",borderRadius:7,padding:12,cursor:"pointer",border:"1px solid #ff9d0033"}} onClick={()=>setPage(id)}>
              <div style={{fontWeight:700,color:"#ff9d00",marginBottom:4,fontSize:13}}>{label}</div>
              <div style={{color:"#9ca3af",fontSize:11,marginBottom:8}}>{desc}</div>
              <Btn onClick={()=>setPage(id)} color="#ff9d00">Open →</Btn>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:9}}>
        {tools.filter(t=>!isEnergy(t.id)).map(t=>(
          <Card key={t.id} style={{cursor:"pointer",position:"relative",padding:13}}>
            <div style={{fontSize:22,marginBottom:5}}>{t.icon}</div>
            <div style={{fontWeight:700,color:"#e2e8f0",marginBottom:3,fontSize:13}}>{t.label}</div>
            <div style={{color:"#9ca3af",fontSize:11,marginBottom:9,minHeight:30}}>{TOOL_DESC[t.id]}</div>
            <Btn onClick={()=>setPage(t.id)} color="#1f2d45">Open →</Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── REMAINING TOOLS (unchanged, condensed) ────────────────────────────────────
function RedTeam(){const [apiKey,setApiKey]=useState("");const [target,setTarget]=useState("");const [context,setContext]=useState("");const [actor,setActor]=useState("APT nation-state");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);const [error,setError]=useState("");const actors=["APT nation-state","Hacktivist group","Insider threat","Criminal syndicate","Terrorist cell"];async function generate(){if(!apiKey){setError("Insert your Anthropic API key.");return;}if(!target){setError("Specify a target.");return;}setError("");setLoading(true);setResult(null);try{const prompt=`You are a senior red team analyst. Generate a detailed threat scenario in JSON only (no markdown, no backticks).\nTarget: ${target}\nContext: ${context||"unspecified"}\nThreat actor type: ${actor}\nReturn ONLY a JSON object: {"scenario_title":"string","threat_actor":"string","objective":"string","attack_phases":[{"phase":"string","description":"string","techniques":["string"]}],"likely_entry_points":["string"],"key_vulnerabilities":["string"],"indicators_of_compromise":["string"],"recommended_mitigations":["string"],"risk_level":"LOW|MEDIUM|HIGH|CRITICAL"}`;const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:prompt}]})});const data=await res.json();if(data.error)throw new Error(data.error.message);setResult(JSON.parse(data.content.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim()));}catch(e){setError("Error: "+e.message);}setLoading(false);}
return(<div><h2 style={{color:"#00ff9d",marginTop:0}}>🤖 Red Team Scenario Generator</h2><p style={{color:"#9ca3af",marginTop:-8,marginBottom:20}}>AI generates realistic threat scenarios. <BADGE text="AI Live" color="green"/></p><Card><Input label="🔑 Anthropic API Key" value={apiKey} onChange={setApiKey} placeholder="sk-ant-..." type="password"/><Input label="🎯 Target" value={target} onChange={setTarget} placeholder="e.g. Nuclear power plant, pipeline infrastructure"/><Input label="📋 Context (optional)" value={context} onChange={setContext} placeholder="e.g. Legacy SCADA, recent layoffs" rows={2}/><div style={{marginBottom:14}}><div style={{color:"#9ca3af",fontSize:13,marginBottom:6}}>👤 Threat Actor</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{actors.map(a=><button key={a} onClick={()=>setActor(a)} style={{background:actor===a?"#00ff9d":"#1f2d45",color:actor===a?"#0a0f1e":"#9ca3af",border:"none",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:actor===a?700:400}}>{a}</button>)}</div></div>{error&&<div style={{color:"#ff4d4d",marginBottom:10,fontSize:13}}>{error}</div>}<Btn onClick={generate} disabled={loading}>{loading?"⏳ Generating...":"⚡ Generate Scenario"}</Btn></Card>{result&&(<div><Card style={{borderColor:RC[result.risk_level]}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontWeight:800,fontSize:16,color:"#e2e8f0"}}>{result.scenario_title}</div><BADGE text={result.risk_level} color={result.risk_level==="CRITICAL"||result.risk_level==="HIGH"?"red":"yellow"}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><span style={{color:"#9ca3af",fontSize:11}}>THREAT ACTOR</span><br/><span style={{color:"#ffd700"}}>{result.threat_actor}</span></div><div><span style={{color:"#9ca3af",fontSize:11}}>OBJECTIVE</span><br/><span style={{color:"#e2e8f0",fontSize:13}}>{result.objective}</span></div></div></Card><Card><ST icon="⚔️" label="Attack Timeline" color="#4db8ff"/><div style={{display:"flex",alignItems:"flex-start",overflowX:"auto",paddingBottom:8,gap:0}}>{result.attack_phases?.map((p,i)=>(<div key={i} style={{display:"flex",alignItems:"flex-start",flex:1,minWidth:140}}><div style={{flex:1}}><div style={{background:i===0?"#ff4d4d":i===result.attack_phases.length-1?"#b47fff":"#1f2d45",borderRadius:8,padding:"10px 12px",marginRight:4}}><div style={{color:"#9ca3af",fontSize:10}}>PHASE {i+1}</div><div style={{fontWeight:700,color:"#e2e8f0",fontSize:12,marginTop:2}}>{p.phase}</div><div style={{color:"#9ca3af",fontSize:11,marginTop:4}}>{p.description?.substring(0,70)}...</div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>{p.techniques?.slice(0,2).map((t,j)=><BADGE key={j} text={t} color="blue"/>)}</div></div>{i<result.attack_phases.length-1&&<div style={{textAlign:"center",color:"#ff4d4d",fontSize:16,marginTop:4}}>→</div>}</div></div>))}</div></Card><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><Card><ST icon="🚪" label="Entry Points" color="#ff4d4d"/>{result.likely_entry_points?.map((e,i)=><div key={i} style={{color:"#e2e8f0",fontSize:13,marginBottom:4}}>• {e}</div>)}</Card><Card><ST icon="⚠️" label="Vulnerabilities" color="#ffd700"/>{result.key_vulnerabilities?.map((v,i)=><div key={i} style={{color:"#e2e8f0",fontSize:13,marginBottom:4}}>• {v}</div>)}</Card><Card><ST icon="🔎" label="IOCs" color="#ff9d00"/>{result.indicators_of_compromise?.map((c,i)=><div key={i} style={{color:"#e2e8f0",fontSize:12,marginBottom:4,fontFamily:"monospace"}}>• {c}</div>)}</Card><Card><ST icon="🛡️" label="Mitigations" color="#00ff9d"/>{result.recommended_mitigations?.map((m,i)=><div key={i} style={{color:"#e2e8f0",fontSize:13,marginBottom:4}}>• {m}</div>)}</Card></div></div>)}</div>);}

function Osint(){const [query,setQuery]=useState("");const [ran,setRan]=useState(false);const nodes=[{id:"T-001",label:"Actor #1",type:"Person",risk:"HIGH",x:200,y:80},{id:"T-002",label:"Shell Corp XY",type:"Org",risk:"MEDIUM",x:360,y:160},{id:"T-003",label:"Port of Trieste",type:"Location",risk:"LOW",x:160,y:220},{id:"T-004",label:"Cargo 14/03",type:"Event",risk:"HIGH",x:300,y:280},{id:"T-005",label:"Actor #2",type:"Person",risk:"MEDIUM",x:440,y:280},{id:"T-006",label:"Offshore Bank",type:"Org",risk:"HIGH",x:80,y:140}];const edges=[[0,1],[0,5],[1,2],[1,3],[1,4],[3,4]];const cn=r=>r==="HIGH"?"#ff4d4d":r==="MEDIUM"?"#ffd700":"#00ff9d";return(<div><h2 style={{color:"#00ff9d",marginTop:0}}>🔍 OSINT Correlation Engine</h2><p style={{color:"#9ca3af",marginTop:-8,marginBottom:20}}>Entity correlation graphs from open-source intelligence. <MockBadge/></p><Card><Input label="🔎 Entity" value={query} onChange={setQuery} placeholder="Person name, company, vessel..."/><Btn onClick={()=>setRan(true)}>Run Correlation</Btn></Card>{ran&&<><Card><ST icon="📊" label="Entity Graph" color="#4db8ff"/><svg viewBox="0 0 520 320" style={{width:"100%",background:"#0d1626",borderRadius:8}}>{edges.map(([a,b],i)=><line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke="#1f2d45" strokeWidth="2" strokeDasharray="4"/>)}{nodes.map((n,i)=><g key={i}><circle cx={n.x} cy={n.y} r={22} fill="#111827" stroke={cn(n.risk)} strokeWidth="2"/><text x={n.x} y={n.y-28} textAnchor="middle" fill={cn(n.risk)} fontSize="10" fontWeight="bold">{n.label}</text><text x={n.x} y={n.y+4} textAnchor="middle" fill="#9ca3af" fontSize="8">{n.type}</text><circle cx={n.x} cy={n.y} r={4} fill={cn(n.risk)}/></g>)}</svg></Card><Card><ST icon="🔗" label="Key Connections" color="#ffd700"/>{["Actor #1 → Shell Corp XY (financial, 3 tx)","Shell Corp XY → Port of Trieste (logistics)","Actor #1 → Offshore Bank (wire transfers)","Cargo 14/03 → Actor #2 (timing correlation)"].map((l,i)=><div key={i} style={{color:"#e2e8f0",fontSize:13,marginBottom:6,borderLeft:"2px solid #ffd700",paddingLeft:12}}>• {l}</div>)}</Card></>}</div>);}

function Disinfo(){const [text,setText]=useState("");const [ran,setRan]=useState(false);const bars=[["Emotional Appeal",87],["False Attribution",72],["Coord. Behaviour",91],["Urgency Injection",55],["Authority Spoofing",63]];return(<div><h2 style={{color:"#00ff9d",marginTop:0}}>📰 Disinformation Detector</h2><p style={{color:"#9ca3af",marginTop:-8,marginBottom:20}}>Classify disinformation techniques, origin and narrative. <MockBadge/></p><Card><Input label="📄 Content" value={text} onChange={setText} placeholder="Paste article or social post..." rows={4}/><Btn onClick={()=>setRan(true)} disabled={!text}>Analyze</Btn></Card>{ran&&<><Card style={{borderColor:"#ff4d4d"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontWeight:800,fontSize:16,color:"#ff4d4d"}}>LIKELY DISINFORMATION</div><div style={{textAlign:"right"}}><div style={{color:"#9ca3af",fontSize:11}}>CONFIDENCE</div><div style={{color:"#ffd700",fontWeight:800,fontSize:22}}>87%</div></div></div><div style={{background:"#0d1626",borderRadius:6,padding:10}}><div style={{color:"#9ca3af",fontSize:11,marginBottom:2}}>NARRATIVE</div><div style={{color:"#e2e8f0"}}>NATO expansion as existential threat</div></div></Card><Card><ST icon="📊" label="Technique Intensity" color="#ff4d4d"/>{bars.map(([l,v])=>(<div key={l} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{color:"#e2e8f0",fontSize:12}}>{l}</span><span style={{color:"#ffd700",fontSize:12,fontWeight:700}}>{v}%</span></div><div style={{background:"#1f2d45",borderRadius:4,height:7}}><div style={{background:v>80?"#ff4d4d":v>60?"#ffd700":"#4db8ff",height:7,borderRadius:4,width:`${v}%`}}/></div></div>))}</Card></>}</div>);}

function Maritime(){const [sel,setSel]=useState(null);const vessels=[{mmsi:"247123456",name:"ADRIATICA SUN",flag:"🇮🇹",lat:44.12,lon:13.45,anomaly:"AIS blackout 6h",risk:"HIGH",type:"Cargo",mx:298,my:112},{mmsi:"212987654",name:"AEGEAN STAR",flag:"🇬🇷",lat:37.88,lon:23.71,anomaly:"Unusual anchorage",risk:"MEDIUM",type:"Tanker",mx:390,my:178},{mmsi:"538001234",name:"PACIFIC WOLF",flag:"🇲🇭",lat:43.50,lon:16.44,anomaly:"Speed anomaly",risk:"MEDIUM",type:"Bulk",mx:320,my:118},{mmsi:"636091234",name:"LIBERIA MOON",flag:"🇱🇷",lat:35.90,lon:14.51,anomaly:"None",risk:"LOW",type:"Container",mx:295,my:200},{mmsi:"311000450",name:"ATLAS PRIME",flag:"🇧🇸",lat:36.80,lon:3.10,anomaly:"Dark ship rendezvous",risk:"HIGH",type:"Tanker",mx:168,my:185}];const rc=r=>r==="HIGH"?"#ff4d4d":r==="MEDIUM"?"#ffd700":"#00ff9d";return(<div><h2 style={{color:"#00ff9d",marginTop:0}}>🌊 Maritime Anomaly Tracker</h2><p style={{color:"#9ca3af",marginTop:-8,marginBottom:20}}>AIS anomaly detection — Mediterranean theatre. <MockBadge/></p><Card style={{padding:0,overflow:"hidden"}}><div style={{padding:"12px 16px 0",fontWeight:700,color:"#4db8ff"}}>🗺️ Mediterranean Map</div><svg viewBox="0 0 520 280" style={{width:"100%",background:"#0a1628",borderRadius:8,border:"1px solid #1f2d45"}}><path d="M 60 80 Q 100 60 160 70 Q 200 65 250 75 Q 310 70 370 80 Q 420 85 460 100 Q 480 120 470 150 Q 450 170 420 175 Q 390 180 360 170 Q 330 178 300 195 Q 270 210 250 220 Q 220 228 200 220 Q 170 215 150 200 Q 120 185 100 170 Q 70 155 55 130 Q 45 105 60 80Z" fill="#0d2040" stroke="#1f4080" strokeWidth="1.5"/><path d="M 260 75 Q 270 100 275 130 Q 280 160 295 185 Q 300 195 295 200 Q 285 205 280 195 Q 268 178 260 160 Q 252 138 250 110 Q 248 88 255 75Z" fill="#0a1628" stroke="#1f4080" strokeWidth="1"/>{vessels.map((v,i)=>(<g key={i} onClick={()=>setSel(sel?.mmsi===v.mmsi?null:v)} style={{cursor:"pointer"}}><circle cx={v.mx} cy={v.my} r={sel?.mmsi===v.mmsi?10:7} fill={rc(v.risk)} opacity={0.85}/><circle cx={v.mx} cy={v.my} r={sel?.mmsi===v.mmsi?14:11} fill="none" stroke={rc(v.risk)} strokeWidth="1" opacity="0.4"/><text x={v.mx} y={v.my-14} textAnchor="middle" fill="#e2e8f0" fontSize="8">{v.name}</text></g>))}</svg>{sel&&<div style={{margin:"0 14px 14px",background:"#0d1626",borderRadius:7,padding:12,borderLeft:`3px solid ${rc(sel.risk)}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div style={{fontWeight:800,color:"#e2e8f0"}}>{sel.flag} {sel.name}</div><BADGE text={sel.risk} color={sel.risk==="HIGH"?"red":sel.risk==="MEDIUM"?"yellow":"green"}/></div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>{[["MMSI",sel.mmsi],["Type",sel.type],["Position",`${sel.lat}N`],["Anomaly",sel.anomaly]].map(([l,v])=><div key={l}><div style={{color:"#9ca3af",fontSize:10}}>{l}</div><div style={{color:"#e2e8f0",fontSize:11}}>{v}</div></div>)}</div></div>}</Card></div>);}

function Satellite(){const [zone,setZone]=useState("");const [ran,setRan]=useState(false);const [tick,setTick]=useState(0);useEffect(()=>{if(!ran)return;const t=setInterval(()=>setTick(x=>x+1),50);return()=>clearInterval(t);},[ran]);const passes=[{sat:"SENTINEL-2A",time:"08:14",dur:"6m",el:"72°",res:"10m",risk:"HIGH"},{sat:"LANDSAT-9",time:"10:47",dur:"4m",el:"51°",res:"30m",risk:"MEDIUM"},{sat:"PLEIADES-1A",time:"13:22",dur:"3m",el:"38°",res:"0.5m",risk:"CRITICAL"},{sat:"SPOT-7",time:"15:05",dur:"5m",el:"63°",res:"1.5m",risk:"HIGH"}];const hours=Array.from({length:24},(_,i)=>i);const covH=new Set([8,10,13,15,18]);const angle1=(tick*0.8)%360;const angle2=(tick*0.5+120)%360;const toR=a=>a*Math.PI/180;const ox1=100+55*Math.cos(toR(angle1));const oy1=70+22*Math.sin(toR(angle1));const ox2=100+45*Math.cos(toR(angle2+90));const oy2=70+35*Math.sin(toR(angle2+90));return(<div><h2 style={{color:"#00ff9d",marginTop:0}}>🛰️ Satellite Pass Planner</h2><p style={{color:"#9ca3af",marginTop:-8,marginBottom:20}}>Overflight windows for reconnaissance satellites. <MockBadge/></p><Card><Input label="📍 Area of Interest" value={zone} onChange={setZone} placeholder="e.g. 44.4°N 8.9°E"/><Btn onClick={()=>setRan(true)}>Calculate</Btn></Card>{ran&&<><Card><ST icon="🌐" label="Orbit Visualization" color="#4db8ff"/><svg viewBox="0 0 200 140" style={{width:"100%",maxWidth:260,margin:"0 auto",display:"block",background:"#050d1a",borderRadius:8}}>{[[20,20],[180,15],[50,80],[170,90],[90,10],[140,50]].map(([sx,sy],i)=><circle key={i} cx={sx} cy={sy} r={1} fill="#fff" opacity={0.4}/>)}<circle cx={100} cy={70} r={28} fill="#0d2040" stroke="#1a3a6a" strokeWidth="1.5"/><ellipse cx={92} cy={62} rx={10} ry={7} fill="#1a3a6a" opacity="0.8"/><ellipse cx={112} cy={68} rx={8} ry={10} fill="#1a3a6a" opacity="0.8"/><ellipse cx={100} cy={70} rx={55} ry={22} fill="none" stroke="#4db8ff" strokeWidth="0.5" strokeDasharray="3" opacity="0.4"/><ellipse cx={100} cy={70} rx={45} ry={35} fill="none" stroke="#ffd700" strokeWidth="0.5" strokeDasharray="3" opacity="0.4" transform="rotate(90,100,70)"/><circle cx={ox1} cy={oy1} r={3} fill="#4db8ff"/><circle cx={ox2} cy={oy2} r={3} fill="#ffd700"/><text x={100} y={74} textAnchor="middle" fill="#00ff9d" fontSize="7" fontWeight="bold">TARGET</text></svg></Card><Card><ST icon="⏱️" label="24h Coverage" color="#4db8ff"/><div style={{display:"flex",gap:1,marginBottom:4}}>{hours.map(h=><div key={h} style={{flex:1,height:24,background:covH.has(h)?"#ff4d4d":"#0d1626",borderRadius:2,border:"1px solid #1f2d45"}}/>)}</div><div style={{display:"flex",justifyContent:"space-between",color:"#9ca3af",fontSize:9}}><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></Card><Card><ST icon="🗓️" label="Schedule" color="#4db8ff"/>{passes.map((p,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0d1626",borderRadius:6,padding:"8px 12px",marginBottom:5,borderLeft:`3px solid ${RC[p.risk]}`}}><div><div style={{fontWeight:700,color:"#e2e8f0"}}>{p.sat}</div><div style={{color:"#9ca3af",fontSize:11}}>{p.time} · {p.dur} · {p.el}</div></div><div style={{textAlign:"right"}}><BADGE text={p.risk} color={p.risk==="CRITICAL"||p.risk==="HIGH"?"red":"yellow"}/><div style={{color:"#9ca3af",fontSize:10,marginTop:2}}>{p.res}</div></div></div>)}</Card></>}</div>);}

function PatLife(){const [subject,setSubject]=useState("");const [ran,setRan]=useState(false);const timeline=[{day:"Mon–Fri",time:"06:45",location:"Residential, Zone B",exposure:"LOW"},{day:"Mon–Fri",time:"07:30",location:"Central Station",exposure:"MEDIUM"},{day:"Mon–Fri",time:"08:00",location:"Office District",exposure:"LOW"},{day:"Tue/Thu",time:"18:15",location:"Sports Centre",exposure:"MEDIUM"},{day:"Saturday",time:"10:00",location:"Open Market",exposure:"HIGH"},{day:"Variable",time:"21:00",location:"Restaurant district",exposure:"HIGH"}];const heatmap=[[1,1,1,1,1,0,0],[0,1,1,1,1,0,0],[0,0,1,1,0,0,0],[0,0,0,0,0,1,0],[0,0,0,1,0,1,0],[0,0,0,0,0,0,1]];const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];const slots=["06–09","09–12","12–15","15–18","18–21","21–24"];return(<div><h2 style={{color:"#00ff9d",marginTop:0}}>📍 Pattern-of-Life Analyzer</h2><p style={{color:"#9ca3af",marginTop:-8,marginBottom:20}}>Spatio-temporal behaviour reconstruction. <MockBadge/></p><Card><Input label="🎯 Subject" value={subject} onChange={setSubject} placeholder="Subject Alpha, plate, username..."/><Btn onClick={()=>setRan(true)}>Analyze</Btn></Card>{ran&&<><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>{[["Predictability","78%","#ff4d4d"],["Sources","6","#4db8ff"],["Exposures","3","#ffd700"]].map(([l,v,c])=><Card key={l} style={{textAlign:"center",padding:12}}><div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div><div style={{color:"#9ca3af",fontSize:11}}>{l}</div></Card>)}</div><Card><ST icon="🗓️" label="Activity Heatmap" color="#4db8ff"/><table style={{borderCollapse:"collapse",fontSize:12}}><thead><tr><th style={{color:"#9ca3af",padding:"2px 5px",fontWeight:400}}></th>{days.map(d=><th key={d} style={{color:"#9ca3af",padding:"2px 5px",fontWeight:400,minWidth:34}}>{d}</th>)}</tr></thead><tbody>{slots.map((s,si)=><tr key={s}><td style={{color:"#9ca3af",padding:"2px 5px",fontSize:10}}>{s}</td>{days.map((_,di)=><td key={di} style={{padding:2}}><div style={{width:30,height:18,background:heatmap[si][di]?"#ff4d4d22":"#0d1626",border:`1px solid ${heatmap[si][di]?"#ff4d4d":"#1f2d45"}`,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center"}}>{heatmap[si][di]&&<div style={{width:6,height:6,borderRadius:"50%",background:"#ff4d4d"}}/>}</div></td>)}</tr>)}</tbody></table></Card><Card><ST icon="🕐" label="Timeline" color="#4db8ff"/>{timeline.map((r,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:6,paddingBottom:6,borderBottom:"1px solid #0d1626"}}><div style={{minWidth:60,color:"#9ca3af",fontSize:11}}>{r.day}</div><div style={{minWidth:45,color:"#e2e8f0",fontFamily:"monospace",fontSize:11}}>{r.time}</div><div style={{flex:1,color:"#9ca3af",fontSize:12}}>{r.location}</div><BADGE text={r.exposure} color={r.exposure==="HIGH"?"red":r.exposure==="MEDIUM"?"yellow":"green"}/></div>)}</Card></>}</div>);}

function Psyop(){const [content,setContent]=useState("");const [ran,setRan]=useState(false);const techniques=[{name:"Fear Appeal",desc:"Exaggerates threats to bypass rational analysis",severity:"HIGH",val:91},{name:"In-group/Out-group",desc:"Us-vs-them narrative to polarise",severity:"HIGH",val:85},{name:"False Urgency",desc:"Artificial pressure prevents evaluation",severity:"MEDIUM",val:67},{name:"Authority Spoofing",desc:"Mimics institutional language",severity:"MEDIUM",val:72}];return(<div><h2 style={{color:"#00ff9d",marginTop:0}}>🧠 PSYOP Content Analyzer</h2><p style={{color:"#9ca3af",marginTop:-8,marginBottom:20}}>Identify psychological operation techniques in media. <MockBadge/></p><Card><Input label="📄 Content" value={content} onChange={setContent} placeholder="Paste text or transcript..." rows={5}/><Btn onClick={()=>setRan(true)} disabled={!content}>Analyze</Btn></Card>{ran&&<><Card style={{borderColor:"#ff4d4d"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontWeight:800,fontSize:16,color:"#ff4d4d"}}>PSYOP DETECTED</div><div style={{textAlign:"right"}}><div style={{color:"#9ca3af",fontSize:11}}>CONFIDENCE</div><div style={{color:"#ffd700",fontWeight:800,fontSize:22}}>91%</div></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div style={{background:"#0d1626",borderRadius:6,padding:10}}><div style={{color:"#9ca3af",fontSize:11}}>TARGET EFFECT</div><div style={{color:"#e2e8f0",fontSize:13,marginTop:2}}>Demoralisation and distrust of institutions</div></div><div style={{background:"#0d1626",borderRadius:6,padding:10}}><div style={{color:"#9ca3af",fontSize:11}}>ORIGIN</div><div style={{color:"#ffd700",fontSize:13,marginTop:2}}>State-sponsored influence op</div></div></div></Card><Card><ST icon="🎭" label="Techniques" color="#ff4d4d"/>{techniques.map((t,i)=><div key={i} style={{background:"#0d1626",borderRadius:6,padding:"9px 12px",marginBottom:7,borderLeft:`3px solid ${RC[t.severity]}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}><div style={{fontWeight:700,color:"#e2e8f0"}}>{t.name}</div><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{color:"#ffd700",fontSize:12,fontWeight:700}}>{t.val}%</span><BADGE text={t.severity} color={t.severity==="HIGH"?"red":"yellow"}/></div></div><div style={{background:"#111827",borderRadius:3,height:5,marginBottom:3}}><div style={{background:RC[t.severity],height:5,borderRadius:3,width:`${t.val}%`}}/></div><div style={{color:"#9ca3af",fontSize:12}}>{t.desc}</div></div>)}</Card></>}</div>);}

function BioThreat(){const [sel,setSel]=useState(null);const alerts=[{id:"BT-2026-031",region:"Eastern Balkans",signal:"Unusual pneumonia cluster",sources:4,confidence:72,level:"HIGH",date:"13/03",type:"Respiratory",trend:[12,15,14,18,22,28,35]},{id:"BT-2026-028",region:"Central Asia",signal:"Livestock mass mortality",sources:6,confidence:65,level:"MEDIUM",date:"11/03",type:"Zoonotic",trend:[8,8,10,9,12,11,14]},{id:"BT-2026-019",region:"West Africa",signal:"Haemorrhagic fever signals",sources:8,confidence:81,level:"HIGH",date:"07/03",type:"Haemorrhagic",trend:[30,35,40,38,45,50,48]},{id:"BT-2026-003",region:"Horn of Africa",signal:"Cholera, elevated fatality rate",sources:11,confidence:93,level:"CRITICAL",date:"21/02",type:"Enteric",trend:[60,70,80,75,90,95,100]}];const Spark=({data,color})=>{const max=Math.max(...data);const pts=data.map((v,i)=>`${(i/(data.length-1))*55},${18-((v/max)*16)}`).join(" ");return <svg viewBox="0 0 55 20" style={{width:55,height:20}}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"/></svg>;};return(<div><h2 style={{color:"#00ff9d",marginTop:0}}>🦠 Bio-Threat Early Warning</h2><p style={{color:"#9ca3af",marginTop:-8,marginBottom:20}}>Epidemiological signal aggregation. <MockBadge/></p><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>{[["Alerts","14"],["Critical","1"],["Regions","47"],["Sources","230+"]].map(([l,v])=><Card key={l} style={{textAlign:"center",padding:12}}><div style={{fontSize:18,fontWeight:800,color:"#00ff9d"}}>{v}</div><div style={{color:"#9ca3af",fontSize:11}}>{l}</div></Card>)}</div><Card><ST icon="🚨" label="Active Signals" color="#ff4d4d"/>{alerts.map(a=>{const c=a.level==="CRITICAL"?"#ff0000":a.level==="HIGH"?"#ff4d4d":"#ffd700";return(<div key={a.id} onClick={()=>setSel(sel?.id===a.id?null:a)} style={{background:sel?.id===a.id?"#1a2535":"#0d1626",border:`1px solid ${sel?.id===a.id?c:"#1f2d45"}`,borderRadius:7,padding:"10px 12px",marginBottom:6,cursor:"pointer",borderLeft:`4px solid ${c}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{flex:1}}><span style={{color:"#9ca3af",fontSize:10}}>{a.id} · {a.date}</span><div style={{fontWeight:700,color:"#e2e8f0"}}>{a.region}</div><div style={{color:"#9ca3af",fontSize:12}}>{a.signal}</div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,marginLeft:10}}><BADGE text={a.level} color={a.level==="CRITICAL"||a.level==="HIGH"?"red":"yellow"}/><Spark data={a.trend} color={c}/><span style={{color:"#9ca3af",fontSize:10}}>{a.confidence}%</span></div></div>{sel?.id===a.id&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #1f2d45",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}><div><div style={{color:"#9ca3af",fontSize:10}}>TYPE</div><div style={{color:"#4db8ff"}}>{a.type}</div></div><div><div style={{color:"#9ca3af",fontSize:10}}>SOURCES</div><div style={{color:"#e2e8f0"}}>{a.sources}</div></div><div><div style={{color:"#9ca3af",fontSize:10}}>STATUS</div><div style={{color:"#ffd700"}}>Monitoring</div></div></div>}</div>);})}</Card></div>);}

function Cti(){const [filter,setFilter]=useState("ALL");const actors=[{id:"APT-2241",name:"IRON CARDINAL",origin:"East Asia",target:"Defence, Aerospace",ttps:["Spearphishing","LOLBins","Custom RAT"],active:true,threat:"CRITICAL",activity:[4,7,3,8,12,9,15]},{id:"APT-1887",name:"EMBER WOLF",origin:"Eastern Europe",target:"Energy, Government",ttps:["Supply chain","ICS exploit","Wiper"],active:true,threat:"HIGH",activity:[8,6,10,7,9,11,8]},{id:"APT-0934",name:"SILENT MANTIS",origin:"Middle East",target:"Financial, Telco",ttps:["Zero-days","DNS hijack","Cred theft"],active:false,threat:"MEDIUM",activity:[2,3,2,1,3,2,2]},{id:"APT-3312",name:"PALE THUNDER",origin:"Unknown",target:"Maritime, Ports",ttps:["AIS spoofing","GNSS jam","Port intrusion"],active:true,threat:"HIGH",activity:[5,3,6,8,5,9,11]}];const iocs=[{type:"IP",value:"185.220.xxx.xxx",actor:"EMBER WOLF",date:"14/03"},{type:"Domain",value:"update-cdn-secure[.]net",actor:"IRON CARDINAL",date:"13/03"},{type:"Hash",value:"a1b2c3d4...",actor:"PALE THUNDER",date:"12/03"},{type:"IP",value:"91.108.xxx.xxx",actor:"EMBER WOLF",date:"12/03"}];const filtered=filter==="ALL"?actors:actors.filter(a=>a.threat===filter);const MiniBar=({data,color})=>{const max=Math.max(...data);return <div style={{display:"flex",gap:2,alignItems:"flex-end",height:26}}>{data.map((v,i)=><div key={i} style={{width:7,background:color,borderRadius:2,height:`${(v/max)*100}%`,opacity:i===data.length-1?1:0.4}}/>)}</div>;};return(<div><h2 style={{color:"#00ff9d",marginTop:0}}>🔐 Cyber Threat Intelligence</h2><p style={{color:"#9ca3af",marginTop:-8,marginBottom:20}}>Threat actor profiling and IOC feed. <MockBadge/></p><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>{[["Actors","38"],["Campaigns","12"],["IOCs 24h","47"],["Critical","3"]].map(([l,v])=><Card key={l} style={{textAlign:"center",padding:12}}><div style={{fontSize:18,fontWeight:800,color:"#00ff9d"}}>{v}</div><div style={{color:"#9ca3af",fontSize:11}}>{l}</div></Card>)}</div><Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><ST icon="👤" label="Threat Actors" color="#4db8ff"/><div style={{display:"flex",gap:5}}>{["ALL","CRITICAL","HIGH","MEDIUM"].map(c=><button key={c} onClick={()=>setFilter(c)} style={{background:filter===c?"#00ff9d":"#1f2d45",color:filter===c?"#0a0f1e":"#9ca3af",border:"none",borderRadius:4,padding:"3px 9px",cursor:"pointer",fontSize:11,fontWeight:filter===c?700:400}}>{c}</button>)}</div></div>{filtered.map(a=>{const c=a.threat==="CRITICAL"?"#ff0000":a.threat==="HIGH"?"#ff4d4d":"#ffd700";return(<div key={a.id} style={{background:"#0d1626",borderRadius:7,padding:"10px 12px",marginBottom:7,borderLeft:`3px solid ${c}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><span style={{color:"#9ca3af",fontSize:10,fontFamily:"monospace"}}>{a.id}</span>{a.active&&<span style={{marginLeft:6,background:"#ff4d4d",color:"#fff",fontSize:9,fontWeight:700,borderRadius:3,padding:"1px 4px"}}>ACTIVE</span>}<div style={{fontWeight:800,color:"#e2e8f0",fontSize:13}}>{a.name}</div><div style={{color:"#9ca3af",fontSize:11}}>Origin: <span style={{color:"#ffd700"}}>{a.origin}</span> · {a.target}</div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>{a.ttps.map((t,i)=><BADGE key={i} text={t} color="blue"/>)}</div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,marginLeft:8}}><BADGE text={a.threat} color={a.threat==="CRITICAL"||a.threat==="HIGH"?"red":"yellow"}/><div><div style={{color:"#9ca3af",fontSize:9,textAlign:"right",marginBottom:1}}>7d</div><MiniBar data={a.activity} color={c}/></div></div></div></div>);})}</Card><Card><ST icon="🔎" label="IOCs" color="#ff9d00"/><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Type","Indicator","Actor","Date"].map(h=><th key={h} style={{textAlign:"left",color:"#9ca3af",padding:"5px 8px",borderBottom:"1px solid #1f2d45"}}>{h}</th>)}</tr></thead><tbody>{iocs.map((r,i)=><tr key={i} style={{borderBottom:"1px solid #0d1626"}}><td style={{padding:"6px 8px"}}><BADGE text={r.type} color="blue"/></td><td style={{padding:"6px 8px",fontFamily:"monospace",color:"#ff4d4d",fontSize:11}}>{r.value}</td><td style={{padding:"6px 8px",color:"#ffd700"}}>{r.actor}</td><td style={{padding:"6px 8px",color:"#9ca3af"}}>{r.date}</td></tr>)}</tbody></table></Card></div>);}

// ── APP ───────────────────────────────────────────────────────────────────────
const PAGES={home:Home,threatmap:ThreatMap,redteam:RedTeam,osint:Osint,disinfo:Disinfo,maritime:Maritime,satellite:Satellite,patlife:PatLife,psyop:Psyop,biothreat:BioThreat,cti:Cti,oilinfra:OilInfra,chokepoint:Chokepoint,energyrisk:EnergyRisk};
export default function App(){
  const [page,setPage]=useState("home");
  const [blink,setBlink]=useState(true);
  useEffect(()=>{const t=setInterval(()=>setBlink(x=>!x),800);return()=>clearInterval(t);},[]);
  const Page=PAGES[page]||Home;
  return(
    <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#e2e8f0",fontFamily:"'Segoe UI',sans-serif"}}>
      <nav style={{background:"#0d1626",borderBottom:"1px solid #1f2d45",padding:"0 10px",display:"flex",alignItems:"center",overflowX:"auto"}}>
        {NAV.map(n=>{const isEnergy=["oilinfra","chokepoint","energyrisk"].includes(n.id);return(<button key={n.id} onClick={()=>setPage(n.id)}
          style={{background:"none",border:"none",borderBottom:page===n.id?`2px solid ${isEnergy?"#ff9d00":"#00ff9d"}`:"2px solid transparent",
            color:page===n.id?(isEnergy?"#ff9d00":"#00ff9d"):"#9ca3af",padding:"11px 9px",cursor:"pointer",fontSize:11,
            fontWeight:page===n.id?700:400,whiteSpace:"nowrap"}}>{n.icon} {n.label}</button>);})}
        <div style={{marginLeft:"auto",paddingLeft:10,display:"flex",alignItems:"center",gap:7,minWidth:170}}>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"#1a0a0a",borderRadius:5,padding:"3px 8px",border:"1px solid #ff4d4d"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:blink?"#ff4d4d":"#330000",transition:"background 0.3s"}}/>
            <span style={{color:"#ff4d4d",fontSize:10,fontWeight:700}}>3 CRITICAL</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"#1a0e00",borderRadius:5,padding:"3px 8px",border:"1px solid #ff9d00"}}>
            <span style={{fontSize:9}}>🛢️</span>
            <span style={{color:"#ff9d00",fontSize:10,fontWeight:700}}>ENERGY</span>
          </div>
          <BADGE text="v0.5" color="gray"/>
        </div>
      </nav>
      <div style={{maxWidth:1100,margin:"0 auto",padding:16}}>
        <Page setPage={setPage}/>
      </div>
    </div>
  );
}
