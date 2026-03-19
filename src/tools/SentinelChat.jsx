import { useState, useRef, useEffect } from "react";
import { Card, PageHeader, Btn, BADGE, LiveBadge, MockBadge } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

const ACCENT = "#4db8ff";

// ── Mock response engine ──────────────────────────────────────────────────────
const MOCK_RESPONSES = [
  {
    keywords: ["threat", "hotspot", "critical", "escalat"],
    response: "Current CRITICAL-level hotspots include Eastern Ukraine (kinetic attrition), Taiwan Strait (cyber+naval), North Korea (ICBM/Lazarus), and Yemen/Aden (Houthi maritime). The most urgent escalation vector is the Taiwan Strait — PRC blockade exercise cadence has accelerated, with an estimated 18-month operational window. Recommend priority collection posture on PLAN 3rd Fleet movements.",
  },
  {
    keywords: ["cyber", "apt", "malware", "intrusion", "cti"],
    response: "Current high-priority APT actors include IRON CARDINAL (PRC, critical infrastructure targeting), EMBER WOLF (RU, disinfo+cyber hybrid), and Lazarus Group (DPRK, financial sector). Most dangerous active campaign: IRON CARDINAL's supply chain pre-positioning in NATO energy sector OT networks. Recommended TTPs to monitor: T1195 (supply chain compromise), T1486 (data encryption for impact), T1071.004 (DNS C2).",
  },
  {
    keywords: ["maritime", "vessel", "ship", "ais", "sea"],
    response: "Maritime threat picture: Houthi ASMA units continue anti-ship missile operations in the Red Sea corridor (Bab el-Mandeb), affecting ~40% of normal container shipping volumes. IRGC fast boat activity in the Hormuz Strait elevated. Dark fleet vessel tracking shows 23 active anomalies — 6 assessed as sanctions evasion (RU crude), 4 as state intelligence platforms. Recommend SIGINT collection on MMSI spoofing clusters in the Arabian Sea.",
  },
  {
    keywords: ["bio", "pathogen", "outbreak", "epidemic", "biothreat"],
    response: "Active biosurveillance signals: BT-2026-003 (unclassified pathogen, Horn of Africa) at MEDIUM confidence — R₀ estimate 2.1, containment probability 67%. BT-2026-031 (Eastern Balkans, dual bio-disinfo vector) rated HIGH, with suspected state-actor amplification of outbreak narrative. Key intelligence gap: absence of WHO field access in affected zones. Recommend priority collection on Pathogen Early Warning Network (PEWN) feeds.",
  },
  {
    keywords: ["energy", "oil", "gas", "grid", "pipeline", "chokepoint"],
    response: "Energy sector threat summary: Hormuz Strait closure probability assessed at 18% over 6-month window (CRITICAL). Nord Stream precedent has elevated pipeline sabotage threat in Baltic — NATO undersea infrastructure protection posture upgraded. Germany and Italy face highest energy import dependency risk (import_dep >60%). Cascading grid failure scenarios for the Germany-Poland-Czech triangle show 4-6 hour restoration timelines under base-case disruption.",
  },
  {
    keywords: ["satellite", "orbit", "sar", "imagery", "elint", "sigint"],
    response: "For satellite collection planning: PLEIADES-1A offers highest intelligence value (VHR, 0.5m resolution) with 13:22 UTC pass window at 38° elevation. SENTINEL-2A provides multi-spectral (MSI) coverage at 08:14 UTC — optimal for change detection. Recommend tasking PLEIADES-1A for VHR optical, with SENTINEL-2A for contextual MSI comparison. Key denial/deception consideration: target may employ thermal masking or vehicle dispersal during pass windows.",
  },
  {
    keywords: ["disinfo", "disinformation", "propaganda", "narrative", "psyop"],
    response: "Active disinformation clusters: EMBER WOLF campaign targeting NATO cohesion narratives — platform intensity HIGH on Telegram/X, MEDIUM on Facebook. Counter-narrative recommendation: prebunking approach (inoculation messaging) 48h before anticipated narrative peak. Key amplifier nodes: 12 identified coordinated inauthentic behavior accounts in Eastern European media ecosystem. Priority counter-narrative: transparent attribution of infrastructure incidents to state actors.",
  },
  {
    keywords: ["redteam", "attack", "scenario", "threat scenario", "adversary"],
    response: "Red team scenario for critical infrastructure: most credible attack path combines IRON CARDINAL supply chain pre-positioning (T1195) with EMBER WOLF disinfo to delay response (T1498 network DoS + false flag). Attack timeline: 72h from initial access to operational impact. Key control failure points: OT/IT network segmentation at energy substations, authentication on SCADA HMIs. Recommended defensive priorities: (1) supply chain software attestation, (2) OT anomaly detection baseline, (3) CSIRT playbook for simultaneous cyber+disinfo incidents.",
  },
  {
    keywords: ["report", "brief", "summary", "intelligence report", "assessment"],
    response: "Generating a structured intelligence report requires specifying: (1) domain focus (cyber/maritime/kinetic/hybrid), (2) classification level (RESTRICTED/SECRET/TS), (3) time horizon (tactical 24-72h vs strategic 30-90d), and (4) primary audience (tactical commander vs NSC). Use the Intel Report tool for full structured multi-domain brief generation with AI-assisted executive summary and recommendations.",
  },
  {
    keywords: ["hello", "hi", "ciao", "help", "start", "how"],
    response: "Hello. I'm Sentinel AI, your intelligence analyst assistant. I can help you with:\n\n• **Threat landscape** — current hotspots, escalation vectors, actor assessments\n• **Cyber intelligence** — APT profiles, active campaigns, IOC analysis\n• **Maritime & energy** — vessel anomalies, chokepoint risk, grid vulnerabilities\n• **Collection planning** — satellite windows, SIGINT priorities, intelligence gaps\n• **Red team scenarios** — adversary TTPs, attack path analysis\n\nWhat's your intelligence requirement?",
  },
];

const SUGGESTED = [
  "What are the current CRITICAL threat hotspots?",
  "Assess the cyber threat landscape — top APT actors",
  "Maritime situation: Red Sea and Hormuz",
  "Energy infrastructure threats in Europe",
  "Generate a satellite collection plan",
];

const SYSTEM_PROMPT = `You are Sentinel AI, an advanced intelligence analyst assistant integrated into the Sentinel Intelligence Platform. You have expertise across: geopolitical threat analysis, cyber threat intelligence, maritime security, energy infrastructure, biosurveillance, satellite imagery analysis, PSYOP/disinformation detection, and red team scenario planning. Respond concisely, authoritatively, and in intelligence briefing style. Use bullet points for lists. Reference specific threat actors, TTPs, and geographic locations where relevant. Format key findings clearly. Keep responses focused and actionable.`;

function getMockResponse(text) {
  const lower = text.toLowerCase();
  for (const item of MOCK_RESPONSES) {
    if (item.keywords.some(k => lower.includes(k))) return item.response;
  }
  return "Intelligence requirement noted. To provide a precise assessment, please specify: (1) target domain (cyber/kinetic/maritime/bio/energy), (2) geographic area of interest, and (3) operational time horizon. Alternatively, select a suggested prompt below to begin.";
}

// ── Components ────────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 12,
      gap: 8,
      alignItems: "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, #0d2040, #1a3a6a)",
          border: "1px solid #4db8ff44",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, flexShrink: 0, marginTop: 2,
        }}>🤖</div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser ? "#1a3a6a" : "#0a1830",
        border: `1px solid ${isUser ? "#4db8ff44" : "#1f2d45"}`,
        borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
        padding: "10px 14px",
      }}>
        {!isUser && (
          <div style={{ color: "#4a5568", fontSize: 9, letterSpacing: 1, marginBottom: 5 }}>
            SENTINEL AI
          </div>
        )}
        <div style={{
          color: isUser ? "#c9d1da" : "#e2e8f0",
          fontSize: 13,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}>
          {msg.content}
        </div>
        <div style={{ color: "#2d3f55", fontSize: 9, marginTop: 5, textAlign: "right" }}>
          {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      {isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "#1a3a6a",
          border: "1px solid #4db8ff44",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, flexShrink: 0, marginTop: 2,
        }}>👤</div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "linear-gradient(135deg, #0d2040, #1a3a6a)",
        border: "1px solid #4db8ff44",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, flexShrink: 0,
      }}>🤖</div>
      <div style={{
        background: "#0a1830", border: "1px solid #1f2d45",
        borderRadius: "12px 12px 12px 2px",
        padding: "12px 16px",
        display: "flex", gap: 4, alignItems: "center",
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#4db8ff",
            opacity: 0.6,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
        <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "sentinel_chat_history";

export default function SentinelChat() {
  const [apiKey] = useApiKey();
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function saveHistory(msgs) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)); } catch {}
  }

  async function send(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg = { role: "user", content: userText, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    let assistantContent;

    if (apiKey) {
      // Live Claude call
      try {
        const history = newMessages.map(m => ({ role: m.role, content: m.content }));
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 800,
            system: SYSTEM_PROMPT,
            messages: history,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        assistantContent = data.content.map(b => b.text || "").join("");
      } catch (e) {
        assistantContent = `Error: ${e.message}`;
      }
    } else {
      // Mock mode — simulate 600ms latency
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      assistantContent = getMockResponse(userText);
    }

    const assistantMsg = { role: "assistant", content: assistantContent, ts: Date.now() };
    const finalMessages = [...newMessages, assistantMsg];
    setMessages(finalMessages);
    saveHistory(finalMessages);
    setLoading(false);
    inputRef.current?.focus();
  }

  function clearChat() {
    setMessages([]);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div>
      <PageHeader
        icon="💬"
        title="Sentinel AI Assistant"
        sub="Conversational intelligence analyst — ask about threats, actors, scenarios, and collection priorities."
        accent={ACCENT}
        dataMode={apiKey ? "ai" : "mock"}
        badges={[
          { text: apiKey ? "AI LIVE" : "MOCK MODE", color: apiKey ? "#00ff9d" : "#ff9d00" },
          { text: `${messages.length} messages`, color: ACCENT },
        ]}
      />

      {/* Status banner */}
      {!apiKey && (
        <div style={{
          background: "#1a1000", border: "1px solid #ff9d0033", borderLeft: "3px solid #ff9d00",
          borderRadius: 6, padding: "8px 14px", marginBottom: 12,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <MockBadge />
          <span style={{ color: "#ff9d00", fontSize: 12 }}>
            Mock mode — responses are pre-canned. Set API key in the banner above to enable real Claude AI.
          </span>
        </div>
      )}

      {/* Suggested prompts */}
      {messages.length === 0 && !loading && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>SUGGESTED INTELLIGENCE REQUIREMENTS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {SUGGESTED.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                style={{
                  background: "#0a1830", border: "1px solid #1f2d45", borderRadius: 6,
                  padding: "6px 12px", cursor: "pointer", color: "#9ca3af", fontSize: 11,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT + "66"; e.currentTarget.style.color = ACCENT; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#1f2d45"; e.currentTarget.style.color = "#9ca3af"; }}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Chat window */}
      <Card style={{ padding: 0 }}>
        {/* Header */}
        <div style={{
          background: "#0d1626", borderBottom: "1px solid #1f2d45",
          padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {apiKey ? <LiveBadge /> : <MockBadge />}
            <span style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2 }}>
              SENTINEL AI · {apiKey ? "CLAUDE LIVE" : "MOCK ENGINE"} · {messages.length} MESSAGES
            </span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              style={{
                background: "none", border: "1px solid #1f2d45", borderRadius: 4,
                color: "#4a5568", fontSize: 10, padding: "3px 8px", cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{
          minHeight: 340, maxHeight: 520, overflowY: "auto",
          padding: "16px 14px",
          background: "#060e1a",
        }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🤖</div>
              <div style={{ color: "#4a5568", fontSize: 14, marginBottom: 6 }}>Sentinel AI ready</div>
              <div style={{ color: "#2d3f55", fontSize: 12 }}>
                {apiKey
                  ? "Connected to Claude. Ask any intelligence question."
                  : "Running in mock mode. Set API key for live AI responses."}
              </div>
            </div>
          )}
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{
          borderTop: "1px solid #1f2d45", padding: "12px 14px",
          background: "#0d1626",
          display: "flex", gap: 8, alignItems: "flex-end",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Enter your intelligence requirement... (Enter to send, Shift+Enter for new line)"
            rows={2}
            style={{
              flex: 1, background: "#060e1a", border: "1px solid #1f2d45",
              borderRadius: 8, padding: "10px 12px",
              color: "#e2e8f0", fontSize: 13, resize: "none",
              outline: "none", lineHeight: 1.5,
              fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = ACCENT + "66"}
            onBlur={e => e.target.style.borderColor = "#1f2d45"}
          />
          <Btn onClick={() => send()} disabled={loading || !input.trim()} color={ACCENT}>
            {loading ? "⏳" : "Send →"}
          </Btn>
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "5px 14px 8px",
          background: "#0d1626",
          display: "flex", justifyContent: "space-between",
        }}>
          <span style={{ color: "#2d3f55", fontSize: 10 }}>Enter to send · Shift+Enter for new line</span>
          <span style={{ color: "#2d3f55", fontSize: 10 }}>
            {apiKey ? "Live Claude AI" : "Mock mode — set API key for live AI"}
          </span>
        </div>
      </Card>

      {/* Suggested prompts (shown in chat if messages exist) */}
      {messages.length > 0 && !loading && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: "#2d3f55", fontSize: 10, marginBottom: 6 }}>Quick prompts:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {SUGGESTED.slice(0, 3).map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                style={{
                  background: "transparent", border: "1px solid #1f2d45",
                  borderRadius: 4, padding: "4px 9px", cursor: "pointer",
                  color: "#4a5568", fontSize: 10, transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT + "55"; e.currentTarget.style.color = ACCENT; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#1f2d45"; e.currentTarget.style.color = "#4a5568"; }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
