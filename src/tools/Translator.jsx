import { useState } from "react";
import { BADGE, Card, Input, Btn, ST, PageHeader, MockBadge, LiveBadge, LastAnalysisTag, useLastAnalysis, ExportBtn } from "../components/shared";
import { useApiKey } from "../context/ApiKeyContext";

const LANGUAGES = [
  { code: "ar", label: "Arabic",    flag: "🇸🇦", region: "MENA"           },
  { code: "ru", label: "Russian",   flag: "🇷🇺", region: "Eastern Europe" },
  { code: "zh", label: "Mandarin",  flag: "🇨🇳", region: "Asia"           },
  { code: "fa", label: "Farsi",     flag: "🇮🇷", region: "MENA"           },
  { code: "uk", label: "Ukrainian", flag: "🇺🇦", region: "Eastern Europe" },
  { code: "ko", label: "Korean",    flag: "🇰🇷", region: "Asia"           },
  { code: "tr", label: "Turkish",   flag: "🇹🇷", region: "MENA/Europe"   },
  { code: "fr", label: "French",    flag: "🇫🇷", region: "Europe/Africa" },
];

const CONTEXTS = ["Military / Battlefield", "Intelligence / Intercept", "Diplomatic", "Propaganda / PSYOP", "General"];

const MOCK_TRANSLATIONS = {
  ar: { translation: "وحدات العدو تتقدم من الجهة الشمالية. نطلب دعماً جوياً فورياً في الإحداثيات 44.2 شمالاً، 28.7 شرقاً.", analysis: "Military tactical communication. Contains: unit movement direction (north), support request (air), coordinates. Urgency: HIGH.", intent: "Coordination", confidence: 94 },
  ru: { translation: "Противник использует шифрование на частоте 158.4. Группа Альфа — отступить на позицию Б.", analysis: "Tactical intercept. Contains: enemy radio frequency, unit designation (Alpha), movement order (fall back). Urgency: HIGH.", intent: "Tactical Order", confidence: 91 },
  zh: { translation: "第三舰队已进入南海指定区域。开始侦察行动，保持无线电静默。", analysis: "Naval operational order. Contains: fleet designation (3rd), area (South China Sea), mission type (reconnaissance), comms protocol (radio silence). Urgency: MEDIUM.", intent: "Operational Order", confidence: 88 },
  fa: { translation: "عملیات در مرحله دوم است. یگان‌های ویژه در موضع انتظار هستند. منتظر تأیید باشید.", analysis: "Special operations communication. Contains: operation phase (2nd), unit type (special), current status (standby), awaiting confirmation. Urgency: MEDIUM.", intent: "Status Report", confidence: 86 },
  uk: { translation: "Позиція під вогнем. Потрібна евакуація пораненого особового складу. Сектор Дельта-7.", analysis: "Combat medical emergency. Contains: position status (under fire), request type (casualty evacuation), sector designation (Delta-7). Urgency: CRITICAL.", intent: "MEDEVAC Request", confidence: 97 },
  ko: { translation: "북방 경계 구역에서 미상 항공기 탐지됨. 방공망 경보 발령. 전투기 즉시 출격 준비.", analysis: "Air defence alert. Contains: detection area (northern boundary), target type (unknown aircraft), action (air defence alert activated), response (scramble fighters). Urgency: CRITICAL.", intent: "Air Defence Alert", confidence: 93 },
  tr: { translation: "Konvoy Güneydoğu güzergahına yönlendiriliyor. Yakıt ikmali noktası değiştirildi. Koordinatlar şifreli kanaldan gönderildi.", analysis: "Logistics communication. Contains: unit type (convoy), new route (southeast), logistic change (fuel point), security protocol (encrypted channel). Urgency: LOW.", intent: "Logistics Order", confidence: 82 },
  fr: { translation: "Opération Mirage phase trois initiée. Équipes Alpha et Bravo en position. Neutralisation de la cible à 03h00.", analysis: "Special forces operation communication. Contains: operation name (Mirage), phase (3), unit designations (Alpha/Bravo), target action (neutralise), time (03:00). Urgency: HIGH.", intent: "SOCOM Directive", confidence: 90 },
};

function LangBtn({ lang, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? "#4db8ff" : hovered ? "#4db8ff22" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? "#4db8ff" : "#9ca3af",
        border: `1px solid ${active ? "#4db8ff" : hovered ? "#4db8ff44" : "transparent"}`,
        borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontSize: 12,
        fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {lang.flag} {lang.label}
    </button>
  );
}

function ContextBtn({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? "#00ff9d" : hovered ? "#00ff9d22" : "#1f2d45",
        color: active ? "#0a0f1e" : hovered ? "#00ff9d" : "#9ca3af",
        border: `1px solid ${active ? "#00ff9d" : hovered ? "#00ff9d44" : "transparent"}`,
        borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12,
        fontWeight: active ? 700 : 400,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export default function Translator() {
  const [apiKey] = useApiKey();
  const [text, setText] = useState("");
  const [sourceLang, setSourceLang] = useState("ru");
  const [context, setContext] = useState("Military / Battlefield");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { stamp } = useLastAnalysis("translator");
  function handleKey(e) { if (e.ctrlKey && e.key === "Enter") translate(); }

  async function translate() {
    if (!text) { setError("Enter text to translate."); return; }
    setError(""); setLoading(true); setResult(null);

    if (apiKey) {
      try {
        const lang = LANGUAGES.find(l => l.code === sourceLang);
        const prompt = `You are a military intelligence translator. Translate the following ${lang.label} text to English, then provide a brief intelligence analysis.
Context: ${context}
Source text: ${text}

Return ONLY JSON (no markdown): {
  "translation": "English translation here",
  "analysis": "Brief intelligence analysis: what this communication reveals, key entities, urgency level",
  "intent": "Communication intent in 2-3 words",
  "confidence": 85
}`;
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const parsed = JSON.parse(data.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
        setResult({ ...parsed, lang, context, sourceText: text, live: true }); stamp();
      } catch (e) { setError("Error: " + e.message); }
    } else {
      await new Promise(r => setTimeout(r, 900));
      const mock = MOCK_TRANSLATIONS[sourceLang];
      const lang = LANGUAGES.find(l => l.code === sourceLang);
      setResult({ ...mock, lang, context, sourceText: text, live: false }); stamp();
    }
    setLoading(false);
  }

  return (
    <div>
      <PageHeader icon="🌐" title="Battlefield Comms Translator" sub="Real-time translation and analysis of intercepted military communications." accent="#4db8ff" dataMode={apiKey ? "ai" : "mock"} />

      <Card>
        <ST icon="🗣️" label="Source Language" color="#4db8ff" />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
          {LANGUAGES.map(l => (
            <LangBtn key={l.code} lang={l} active={sourceLang === l.code} onClick={() => setSourceLang(l.code)} />
          ))}
        </div>

        <ST icon="🎯" label="Intelligence Context" color="#4db8ff" />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
          {CONTEXTS.map(c => (
            <ContextBtn key={c} label={c} active={context === c} onClick={() => setContext(c)} />
          ))}
        </div>

        <Input label="📡 Intercepted Text / Audio Transcript" value={text} onChange={setText}
          placeholder="Paste intercepted communication, radio transcript, or document..." rows={4}
          maxLength={3000} onClear={() => setText("")} onKeyDown={handleKey} hint="Ctrl+Enter to translate" />

        {!apiKey && (
          <div style={{ color: "#ff9d00", fontSize: 13, marginBottom: 12, padding: "8px 12px", background: "#1a0e0022", border: "1px solid #ff9d0033", borderRadius: 6 }}>
            ⚠ Set API key in the banner above to enable AI translation. Currently using mock data.
          </div>
        )}
        {error && <div style={{ color: "#ff4d4d", marginBottom: 10, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn onClick={translate} disabled={loading || !text}>
            {loading ? "⏳ Translating..." : "🌐 Translate & Analyze"}
          </Btn>
          <LastAnalysisTag toolId="translator" />
        </div>
      </Card>

      {result && (
        <>
          <Card style={{ borderColor: "#00ff9d33" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{result.lang.flag}</span>
                <div>
                  <div style={{ fontWeight: 800, color: "#e2e8f0" }}>{result.lang.label} → English</div>
                  <div style={{ color: "#4a5568", fontSize: 12 }}>{result.context} · {result.lang.region}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {result.live ? <LiveBadge /> : <><MockBadge /><span style={{ color: "#9ca3af", fontSize: 11 }}>Set API key for AI</span></>}
                <BADGE text={`${result.confidence}% conf.`} color="blue" />
                <ExportBtn data={result} filename={`sentinel-translation-${result.lang?.code || "xx"}`} />
              </div>
            </div>

            <div style={{ background: "#0d1626", borderRadius: 8, padding: 14, marginBottom: 10 }}>
              <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>SOURCE TEXT</div>
              <div style={{ color: "#9ca3af", fontSize: 13, fontStyle: "italic", lineHeight: 1.6 }}>{result.sourceText}</div>
            </div>

            <div style={{ background: "#051a0d", border: "1px solid #00ff9d33", borderLeft: "3px solid #00ff9d", borderRadius: 8, padding: 14 }}>
              <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>ENGLISH TRANSLATION</div>
              <div style={{ color: "#00ff9d", fontSize: 14, lineHeight: 1.7, fontWeight: 500 }}>{result.translation}</div>
            </div>
          </Card>

          <Card>
            <ST icon="🔍" label="Intelligence Analysis" color="#ffd700" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12, marginBottom: 12 }}>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>COMMUNICATION INTENT</div>
                <div style={{ color: "#ffd700", fontWeight: 700, fontSize: 14 }}>{result.intent}</div>
              </div>
              <div style={{ background: "#0d1626", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>CONFIDENCE SCORE</div>
                <div style={{ color: "#4db8ff", fontWeight: 800, fontSize: 22 }}>{result.confidence}%</div>
              </div>
            </div>
            <div style={{ background: "#0d1626", borderRadius: 8, padding: 14 }}>
              <div style={{ color: "#4a5568", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>ANALYSIS</div>
              <div style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.6 }}>{result.analysis}</div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
