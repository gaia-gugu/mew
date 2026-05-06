import { useState, useEffect, useCallback, useRef } from "react";

const SAMPLE_LISTS = {
  "P1 Sample": ["apple", "bread", "chair", "dance", "elephant", "friend", "green", "house"],
  "P2 Sample": ["beautiful", "country", "different", "everyone", "favourite", "garden", "hundred", "important"],
  "P3 Sample": ["adventure", "breakfast", "celebrate", "disappear", "encourage", "furniture", "government", "happiness"],
};

// ─── Voice system ───
const VOICE_OPTIONS = [
  { label: "🐻 Friendly Bear", filter: (v) => /female/i.test(v.name) || /samantha|karen|victoria|zira|hazel/i.test(v.name), pitch: 1.0, rate: 0.85 },
  { label: "🐰 Cheerful Bunny", filter: (v) => /female/i.test(v.name) || /samantha|karen|fiona|susan/i.test(v.name), pitch: 1.25, rate: 0.9 },
  { label: "🦁 Cool Lion", filter: (v) => /male/i.test(v.name) || /daniel|david|alex|james|george/i.test(v.name), pitch: 0.85, rate: 0.8 },
  { label: "🦉 Wise Owl", filter: (v) => /male/i.test(v.name) || /daniel|david|alex|tom/i.test(v.name), pitch: 0.95, rate: 0.75 },
  { label: "🐱 Playful Kitten", filter: (v) => /female/i.test(v.name) || /samantha|moira|tessa/i.test(v.name), pitch: 1.4, rate: 0.95 },
];

let selectedVoiceIdx = 0;

const speak = (word) => {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  const opt = VOICE_OPTIONS[selectedVoiceIdx] || VOICE_OPTIONS[0];
  const voices = window.speechSynthesis.getVoices();
  const enVoices = voices.filter(v => v.lang.startsWith("en"));
  const matched = enVoices.find(opt.filter) || enVoices[0] || voices[0];
  if (matched) u.voice = matched;
  u.rate = opt.rate;
  u.pitch = opt.pitch;
  u.lang = "en-SG";
  window.speechSynthesis.speak(u);
};

// ─── Phonetic Chunk Splitter ───
const splitIntoChunks = (word) => {
  const w = word.toLowerCase();
  const chunks = [];
  let i = 0;
  const patterns = [
    "ough","ight","tion","sion","ture","ness","ment","able","ible",
    "ould","ious","eous","ance","ence","ling","ting","ning",
    "th","sh","ch","wh","ph","ck","ng","qu","wr","kn","gh",
    "ai","ea","ee","oa","oo","ou","ow","ey","ay","oi","oy",
    "ar","er","ir","or","ur","al","el","il","ol","ul",
    "bl","cl","fl","gl","pl","sl","br","cr","dr","fr","gr",
    "pr","tr","sc","sk","sm","sn","sp","st","sw",
    "ing","ful","less","ant","ent","ble","ple","dle","tle",
    "age","ate","ine","ise","ize","ous","ive","ure"
  ];
  while (i < w.length) {
    let matched = false;
    for (let len = 4; len >= 2; len--) {
      const sub = w.slice(i, i + len);
      if (sub.length === len && patterns.includes(sub)) {
        if (i + len < w.length && i + len + 1 === w.length) {
          chunks.push(w.slice(i, i + len + 1)); i += len + 1;
        } else { chunks.push(sub); i += len; }
        matched = true; break;
      }
    }
    if (!matched) {
      if (i + 1 < w.length) {
        const c = w[i], n = w[i+1];
        const isV = (ch) => "aeiou".includes(ch);
        if ((!isV(c) && isV(n)) || (isV(c) && !isV(n))) { chunks.push(w.slice(i,i+2)); i+=2; }
        else { chunks.push(w[i]); i++; }
      } else {
        if (chunks.length > 0) chunks[chunks.length-1] += w[i]; else chunks.push(w[i]);
        i++;
      }
    }
  }
  const merged = [];
  for (let j = 0; j < chunks.length; j++) {
    if (chunks[j].length === 1 && merged.length > 0) merged[merged.length-1] += chunks[j];
    else if (chunks[j].length === 1 && j+1 < chunks.length) chunks[j+1] = chunks[j] + chunks[j+1];
    else merged.push(chunks[j]);
  }
  if (merged.length < 2 && merged[0] && merged[0].length >= 2) {
    const mid = Math.ceil(merged[0].length / 2);
    return [merged[0].slice(0, mid), merged[0].slice(mid)];
  }
  return merged.length > 0 ? merged : [word];
};

// ─── Shared ───
const btnStyle = (bg) => ({
  padding: "12px 28px", borderRadius: 14, border: "none", background: bg,
  color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
  fontFamily: "'Fredoka', sans-serif", boxShadow: `0 4px 15px ${bg}44`,
  transition: "transform 0.12s", letterSpacing: 0.3,
});

const Badge = ({ emoji, label, sub }) => (
  <div style={{
    background: "rgba(255,255,255,0.15)", borderRadius: 16, padding: "14px 18px",
    display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.2)"
  }}>
    <span style={{ fontSize: 28 }}>{emoji}</span>
    <div>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{sub}</div>
    </div>
  </div>
);

const SpeakerBtn = ({ word, size = 72 }) => (
  <button onClick={() => speak(word)} style={{
    width: size, height: size, borderRadius: "50%", border: "none",
    background: "linear-gradient(135deg, #FFD166, #F78C6B)", cursor: "pointer",
    fontSize: size * 0.42, boxShadow: "0 6px 20px rgba(247,140,107,0.3)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    transition: "transform 0.15s"
  }}
    onMouseDown={e => e.currentTarget.style.transform = "scale(0.9)"}
    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
  >🔊</button>
);

// ─── Voice Picker ───
function VoicePicker({ voiceIdx, setVoiceIdx, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(145deg, #1a1a3e, #24243e)", borderRadius: 24, padding: 28,
        maxWidth: 360, width: "100%", border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <h3 style={{ fontFamily: "'Fredoka', sans-serif", color: "#fff", fontSize: 22, marginBottom: 4, textAlign: "center" }}>
          Choose Your Voice
        </h3>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "'Nunito', sans-serif", textAlign: "center", marginBottom: 16 }}>
          Tap to preview, pick your favourite!
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {VOICE_OPTIONS.map((v, i) => (
            <button key={i} onClick={() => {
              setVoiceIdx(i);
              selectedVoiceIdx = i;
              speak("Hello! Let's practise spelling!");
            }} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
              borderRadius: 14, border: voiceIdx === i ? "2px solid #FFD166" : "2px solid rgba(255,255,255,0.08)",
              background: voiceIdx === i ? "rgba(255,209,102,0.12)" : "rgba(255,255,255,0.04)",
              cursor: "pointer", transition: "all 0.2s", width: "100%"
            }}>
              <span style={{ fontSize: 28 }}>{v.label.split(" ")[0]}</span>
              <span style={{ fontFamily: "'Fredoka', sans-serif", color: "#fff", fontSize: 16, fontWeight: 600 }}>
                {v.label.split(" ").slice(1).join(" ")}
              </span>
              {voiceIdx === i && <span style={{ marginLeft: "auto", color: "#FFD166", fontSize: 18 }}>✓</span>}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ ...btnStyle("#8338EC"), width: "100%", marginTop: 16 }}>Done</button>
      </div>
    </div>
  );
}

// ─── GAME 1: Spelling Test ───
function SpellingTest({ words, onBack }) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [showResult, setShowResult] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => { if (!done) setTimeout(() => speak(words[idx]), 400); }, [idx, done]);

  const submit = () => {
    const correct = input.trim().toLowerCase() === words[idx].toLowerCase();
    setShowResult(correct);
    setResults(r => [...r, { word: words[idx], answer: input.trim(), correct }]);
    setTimeout(() => { setShowResult(null); setInput(""); if (idx+1 < words.length) setIdx(idx+1); else setDone(true); }, 1200);
  };

  if (done) {
    const score = results.filter(r => r.correct).length;
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{score === words.length ? "🏆" : score >= words.length*0.7 ? "⭐" : "💪"}</div>
        <h2 style={{ color: "#fff", fontFamily: "'Fredoka', sans-serif", fontSize: 28 }}>{score} / {words.length} correct!</h2>
        <div style={{ margin: "20px auto", maxWidth: 380, textAlign: "left" }}>
          {results.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px",
              background: r.correct ? "rgba(6,214,160,0.2)" : "rgba(239,71,111,0.2)",
              borderRadius: 10, marginBottom: 6, color: "#fff", fontSize: 15, fontFamily: "'Nunito', sans-serif" }}>
              <span>{r.correct ? "✅" : "❌"} {r.word}</span>
              {!r.correct && <span style={{ color: "rgba(255,255,255,0.5)" }}>you wrote: {r.answer || "(empty)"}</span>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
          <button onClick={() => { setIdx(0); setResults([]); setDone(false); setInput(""); }} style={btnStyle("#06D6A0")}>Try Again</button>
          <button onClick={onBack} style={btnStyle("#118AB2")}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontSize: 14, marginBottom: 4 }}>Word {idx+1} of {words.length}</p>
      <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ width: `${(idx/words.length)*100}%`, height: "100%", background: "#FFD166", borderRadius: 3, transition: "width 0.4s" }} />
      </div>
      <SpeakerBtn word={words[idx]} size={100} />
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 10, fontFamily: "'Nunito', sans-serif" }}>Tap to hear again</p>
      <div style={{ position: "relative", marginTop: 20 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && input.trim() && submit()}
          placeholder="Type the word here..." autoFocus
          style={{ width: "100%", maxWidth: 340, padding: "14px 20px", fontSize: 20, borderRadius: 14,
            border: showResult === null ? "2px solid rgba(255,255,255,0.2)" : showResult ? "2px solid #06D6A0" : "2px solid #EF476F",
            background: "rgba(255,255,255,0.08)", color: "#fff", outline: "none",
            fontFamily: "'Nunito', sans-serif", textAlign: "center", boxSizing: "border-box" }} />
        {showResult !== null && (
          <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)",
            fontSize: 14, fontWeight: 700, color: showResult ? "#06D6A0" : "#EF476F",
            fontFamily: "'Fredoka', sans-serif", animation: "fadeUp 0.3s ease-out" }}>
            {showResult ? "Correct! 🎉" : `It's "${words[idx]}"`}
          </div>
        )}
      </div>
      <button onClick={submit} disabled={!input.trim() || showResult !== null}
        style={{ ...btnStyle("#06D6A0"), marginTop: 16, opacity: !input.trim() ? 0.4 : 1 }}>Check ✓</button>
    </div>
  );
}

// ─── GAME 2: Unscramble ───
function Unscramble({ words, onBack }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState([]);
  const [pool, setPool] = useState([]);
  const [correct, setCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const shuffle = useCallback((word) => {
    const letters = word.split("").map((l, i) => ({ letter: l, id: i }));
    for (let i = letters.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [letters[i],letters[j]]=[letters[j],letters[i]]; }
    if (letters.map(l => l.letter).join("") === word && word.length > 1) [letters[0],letters[1]]=[letters[1],letters[0]];
    return letters;
  }, []);

  useEffect(() => { setPool(shuffle(words[idx])); setSelected([]); setCorrect(null); setTimeout(() => speak(words[idx]), 400); }, [idx]);

  const tapPool = (item) => { setSelected(s => [...s, item]); setPool(p => p.filter(x => x.id !== item.id)); };
  const tapSelected = (item) => { setPool(p => [...p, item]); setSelected(s => s.filter(x => x.id !== item.id)); };

  useEffect(() => {
    if (selected.length === words[idx].length) {
      const isCorrect = selected.map(s => s.letter).join("").toLowerCase() === words[idx].toLowerCase();
      setCorrect(isCorrect); if (isCorrect) setScore(s => s+1);
      setTimeout(() => { if (idx+1 < words.length) setIdx(idx+1); else setDone(true); }, 1200);
    }
  }, [selected]);

  if (done) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>{score >= words.length*0.8 ? "🧩" : "👏"}</div>
      <h2 style={{ color: "#fff", fontFamily: "'Fredoka', sans-serif" }}>{score} / {words.length} unscrambled!</h2>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
        <button onClick={() => { setIdx(0); setScore(0); setDone(false); }} style={btnStyle("#06D6A0")}>Play Again</button>
        <button onClick={onBack} style={btnStyle("#118AB2")}>Back</button>
      </div>
    </div>
  );

  const tile = (bg) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 40, height: 44, borderRadius: 10, fontSize: 20, fontWeight: 700,
    fontFamily: "'Fredoka', sans-serif", color: "#fff", cursor: "pointer",
    background: bg, border: "none", boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
    userSelect: "none", textTransform: "lowercase" });

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "'Nunito', sans-serif" }}>Word {idx+1} of {words.length} · Score: {score}</p>
      <button onClick={() => speak(words[idx])} style={{ background: "none", border: "none", fontSize: 16, color: "#FFD166", cursor: "pointer", fontFamily: "'Nunito', sans-serif", marginBottom: 16, textDecoration: "underline" }}>🔊 Hear the word</button>
      <div style={{ minHeight: 56, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap",
        padding: "10px 16px", background: "rgba(255,255,255,0.06)", borderRadius: 14, marginBottom: 16,
        border: correct === null ? "2px dashed rgba(255,255,255,0.15)" : correct ? "2px solid #06D6A0" : "2px solid #EF476F" }}>
        {selected.map(item => <button key={item.id} onClick={() => correct === null && tapSelected(item)} style={tile("linear-gradient(135deg, #06D6A0, #118AB2)")}>{item.letter}</button>)}
        {selected.length === 0 && <span style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Nunito', sans-serif", fontSize: 14, alignSelf: "center" }}>Tap letters below</span>}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        {pool.map(item => <button key={item.id} onClick={() => correct === null && tapPool(item)} style={tile("linear-gradient(135deg, #8338EC, #3A86FF)")}>{item.letter}</button>)}
      </div>
      {correct !== null && <p style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: correct ? "#06D6A0" : "#EF476F", fontFamily: "'Fredoka', sans-serif", animation: "fadeUp 0.3s ease-out" }}>{correct ? "Correct! 🎉" : `Oops! It's "${words[idx]}"`}</p>}
    </div>
  );
}

// ─── GAME 3: Missing Letters ───
function MissingLetters({ words, onBack }) {
  const [idx, setIdx] = useState(0);
  const [blanks, setBlanks] = useState([]);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const inputRefs = useRef({});

  useEffect(() => {
    const word = words[idx];
    const count = Math.max(1, Math.floor(word.length * 0.4));
    const indices = [...Array(word.length).keys()];
    for (let i = indices.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [indices[i],indices[j]]=[indices[j],indices[i]]; }
    setBlanks(indices.slice(0, count).sort((a,b) => a-b));
    setAnswers({}); setChecked(false);
    setTimeout(() => speak(word), 400);
  }, [idx]);

  const check = () => {
    const word = words[idx];
    const ok = blanks.every(p => (answers[p]||"").toLowerCase() === word[p].toLowerCase());
    setChecked(true); if (ok) setScore(s => s+1);
    setTimeout(() => { if (idx+1 < words.length) setIdx(idx+1); else setDone(true); }, 1400);
  };

  if (done) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>🔤</div>
      <h2 style={{ color: "#fff", fontFamily: "'Fredoka', sans-serif" }}>{score} / {words.length} correct!</h2>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
        <button onClick={() => { setIdx(0); setScore(0); setDone(false); }} style={btnStyle("#06D6A0")}>Play Again</button>
        <button onClick={onBack} style={btnStyle("#118AB2")}>Back</button>
      </div>
    </div>
  );

  const word = words[idx];
  const allFilled = blanks.every(p => answers[p]?.trim());

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "'Nunito', sans-serif" }}>Word {idx+1} of {words.length} · Score: {score}</p>
      <button onClick={() => speak(word)} style={{ background: "none", border: "none", fontSize: 16, color: "#FFD166", cursor: "pointer", fontFamily: "'Nunito', sans-serif", marginBottom: 20, textDecoration: "underline" }}>🔊 Hear the word</button>
      <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
        {word.split("").map((letter, i) => {
          const isBlank = blanks.includes(i);
          if (!isBlank) return <div key={i} style={{ width: 38, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Fredoka', sans-serif", borderBottom: "2px solid rgba(255,255,255,0.15)" }}>{letter}</div>;
          const val = answers[i]||"";
          const isOk = checked && val.toLowerCase() === letter.toLowerCase();
          const isBad = checked && !isOk;
          return <input key={i} ref={el => inputRefs.current[i]=el} value={val} maxLength={1}
            onChange={e => { const v=e.target.value; setAnswers(a=>({...a,[i]:v})); if(v){const nb=blanks.find(b=>b>i&&!answers[b]?.trim()); if(nb!==undefined) inputRefs.current[nb]?.focus();} }}
            style={{ width: 38, height: 44, textAlign: "center", fontSize: 22, fontWeight: 700, fontFamily: "'Fredoka', sans-serif",
              borderRadius: 10, border: "none", outline: "none", boxSizing: "border-box", textTransform: "lowercase",
              background: isOk ? "rgba(6,214,160,0.3)" : isBad ? "rgba(239,71,111,0.3)" : "rgba(255,255,255,0.12)",
              color: isOk ? "#06D6A0" : isBad ? "#EF476F" : "#fff" }} />;
        })}
      </div>
      {checked && <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Fredoka', sans-serif",
        color: blanks.every(p=>(answers[p]||"").toLowerCase()===word[p].toLowerCase()) ? "#06D6A0" : "#EF476F",
        animation: "fadeUp 0.3s ease-out" }}>
        {blanks.every(p=>(answers[p]||"").toLowerCase()===word[p].toLowerCase()) ? "Perfect! 🎉" : `The word is "${word}"`}</p>}
      {!checked && <button onClick={check} disabled={!allFilled} style={{ ...btnStyle("#06D6A0"), opacity: allFilled ? 1 : 0.4 }}>Check ✓</button>}
    </div>
  );
}

// ─── GAME 4: Flashcards (audio-first) ───
function Flashcards({ words, onBack }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("listen");
  const [known, setKnown] = useState([]);
  const [unknown, setUnknown] = useState([]);
  const [done, setDone] = useState(false);
  const word = words[idx];

  useEffect(() => { if (!done) { setPhase("listen"); setTimeout(() => speak(word), 400); } }, [idx, done]);

  const next = (isKnown) => {
    if (isKnown) setKnown(k => [...k, word]); else setUnknown(u => [...u, word]);
    if (idx+1 < words.length) setTimeout(() => setIdx(idx+1), 200); else setTimeout(() => setDone(true), 200);
  };

  if (done) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>📚</div>
      <h2 style={{ color: "#fff", fontFamily: "'Fredoka', sans-serif" }}>Review Complete!</h2>
      <div style={{ display: "flex", gap: 20, justifyContent: "center", margin: "16px 0", flexWrap: "wrap" }}>
        <Badge emoji="✅" label={`${known.length} Known`} sub="Great job!" />
        <Badge emoji="📝" label={`${unknown.length} To Review`} sub="Keep going!" />
      </div>
      {unknown.length > 0 && <div style={{ margin: "12px auto", maxWidth: 300 }}>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "'Nunito', sans-serif", marginBottom: 8 }}>Words to practice:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {unknown.map((w,i) => <span key={i} style={{ background: "rgba(239,71,111,0.2)", color: "#EF476F", padding: "4px 12px", borderRadius: 8, fontSize: 14, fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{w}</span>)}
        </div>
      </div>}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
        <button onClick={() => { setIdx(0); setKnown([]); setUnknown([]); setDone(false); }} style={btnStyle("#06D6A0")}>Again</button>
        <button onClick={onBack} style={btnStyle("#118AB2")}>Back</button>
      </div>
    </div>
  );

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "'Nunito', sans-serif" }}>Card {idx+1} of {words.length}</p>
      <div style={{ width: 290, minHeight: 180, margin: "20px auto", borderRadius: 20,
        background: phase === "listen" ? "linear-gradient(135deg, #8338EC, #3A86FF)" : "linear-gradient(135deg, #06D6A0, #118AB2)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 24, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", transition: "background 0.4s" }}>
        {phase === "listen" ? (<>
          <button onClick={() => speak(word)} style={{ width: 72, height: 72, borderRadius: "50%", border: "none",
            background: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 34,
            display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>🔊</button>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontFamily: "'Fredoka', sans-serif", marginTop: 14 }}>Listen and think...</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "'Nunito', sans-serif", marginTop: 6 }}>Can you spell this word?</p>
        </>) : (<>
          <span style={{ fontSize: 36 }}>✨</span>
          <p style={{ color: "#fff", fontSize: 28, fontFamily: "'Fredoka', sans-serif", marginTop: 12, letterSpacing: 2 }}>{word}</p>
        </>)}
      </div>
      {phase === "listen" && <button onClick={() => { setPhase("reveal"); speak(word); }} style={{ ...btnStyle("#FFD166"), color: "#1a1a2e", marginTop: 4 }}>Reveal Spelling 👀</button>}
      {phase === "reveal" && <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8, animation: "fadeUp 0.3s ease-out" }}>
        <button onClick={() => next(true)} style={btnStyle("#06D6A0")}>I Know It ✅</button>
        <button onClick={() => next(false)} style={btnStyle("#EF476F")}>Still Learning 📝</button>
      </div>}
    </div>
  );
}

// ─── GAME 5: Chunk Builder ───
function ChunkBuilder({ words, onBack }) {
  const [idx, setIdx] = useState(0);
  const [pool, setPool] = useState([]);
  const [built, setBuilt] = useState([]);
  const [correct, setCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);

  useEffect(() => {
    const chunks = splitIntoChunks(words[idx]);
    const items = chunks.map((c,i) => ({ chunk: c, id: `${i}-${c}` }));
    const shuffled = [...items];
    for (let i = shuffled.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
    if (shuffled.length > 1 && shuffled.map(s => s.chunk).join("") === words[idx].toLowerCase()) [shuffled[0],shuffled[1]]=[shuffled[1],shuffled[0]];
    setPool(shuffled); setBuilt([]); setCorrect(null);
    setTimeout(() => speak(words[idx]), 400);
  }, [idx]);

  useEffect(() => {
    if (built.length > 0 && pool.length === 0) {
      const isOk = built.map(b => b.chunk).join("") === words[idx].toLowerCase();
      setCorrect(isOk); if (isOk) setScore(s => s+1);
      setTimeout(() => { if (idx+1 < words.length) setIdx(idx+1); else setDone(true); }, 1400);
    }
  }, [built, pool]);

  const handleDragStart = (e, item, source) => { setDragging({ item, source }); if (e.dataTransfer) e.dataTransfer.setData("text/plain",""); };
  const dropBuilt = (e) => { e.preventDefault(); setDragOver(null); if (!dragging || correct !== null) return; if (dragging.source === "pool") { setBuilt(b => [...b, dragging.item]); setPool(p => p.filter(x => x.id !== dragging.item.id)); } setDragging(null); };
  const dropPool = (e) => { e.preventDefault(); setDragOver(null); if (!dragging || correct !== null) return; if (dragging.source === "built") { setPool(p => [...p, dragging.item]); setBuilt(b => b.filter(x => x.id !== dragging.item.id)); } setDragging(null); };
  const tapPool = (item) => { if (correct !== null) return; setBuilt(b => [...b, item]); setPool(p => p.filter(x => x.id !== item.id)); };
  const tapBuilt = (item) => { if (correct !== null) return; setPool(p => [...p, item]); setBuilt(b => b.filter(x => x.id !== item.id)); };

  const colors = ["linear-gradient(135deg,#EF476F,#F78C6B)","linear-gradient(135deg,#8338EC,#B24BF3)","linear-gradient(135deg,#3A86FF,#6C63FF)","linear-gradient(135deg,#FFD166,#F78C6B)","linear-gradient(135deg,#118AB2,#06D6A0)","linear-gradient(135deg,#06D6A0,#3A86FF)"];

  if (done) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>🧱</div>
      <h2 style={{ color: "#fff", fontFamily: "'Fredoka', sans-serif" }}>{score} / {words.length} built!</h2>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
        <button onClick={() => { setIdx(0); setScore(0); setDone(false); }} style={btnStyle("#06D6A0")}>Play Again</button>
        <button onClick={onBack} style={btnStyle("#118AB2")}>Back</button>
      </div>
    </div>
  );

  const tile = (item, i, source) => (
    <div key={item.id} draggable onDragStart={e => handleDragStart(e, item, source)} onDragEnd={() => { setDragging(null); setDragOver(null); }}
      onClick={() => source === "pool" ? tapPool(item) : tapBuilt(item)}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 18px", borderRadius: 12, fontSize: 20, fontWeight: 700,
        fontFamily: "'Fredoka', sans-serif", color: "#fff", cursor: "grab",
        background: source === "built" ? "linear-gradient(135deg,#06D6A0,#118AB2)" : colors[i % colors.length],
        border: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.2)", userSelect: "none", textTransform: "lowercase",
        minWidth: 44, letterSpacing: 1, animation: `slideIn 0.3s ease-out ${i*0.05}s both` }}>{item.chunk}</div>
  );

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "'Nunito', sans-serif" }}>Word {idx+1} of {words.length} · Score: {score}</p>
      <SpeakerBtn word={words[idx]} />
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "'Nunito', sans-serif", margin: "8px 0 14px" }}>Listen, then drag or tap chunks to build</p>
      <div onDragOver={e => { e.preventDefault(); setDragOver("built"); }} onDragLeave={() => setDragOver(null)} onDrop={dropBuilt}
        style={{ minHeight: 64, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center",
          padding: "12px 18px", borderRadius: 16, marginBottom: 20,
          background: dragOver === "built" ? "rgba(6,214,160,0.12)" : "rgba(255,255,255,0.05)",
          border: correct === null ? (dragOver === "built" ? "2px dashed #06D6A0" : "2px dashed rgba(255,255,255,0.15)") : correct ? "2px solid #06D6A0" : "2px solid #EF476F" }}>
        {built.length === 0 && <span style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Nunito', sans-serif", fontSize: 14 }}>Drop chunks here</span>}
        {built.map((item,i) => tile(item, i, "built"))}
      </div>
      <div onDragOver={e => { e.preventDefault(); setDragOver("pool"); }} onDragLeave={() => setDragOver(null)} onDrop={dropPool}
        style={{ minHeight: 56, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center", padding: "10px 14px", borderRadius: 14,
          background: dragOver === "pool" ? "rgba(131,56,236,0.1)" : "transparent",
          border: dragOver === "pool" ? "2px dashed rgba(131,56,236,0.4)" : "2px dashed transparent" }}>
        {pool.map((item,i) => tile(item, i, "pool"))}
      </div>
      {correct !== null && <p style={{ marginTop: 16, fontSize: 18, fontWeight: 700, fontFamily: "'Fredoka', sans-serif", color: correct ? "#06D6A0" : "#EF476F", animation: "fadeUp 0.3s ease-out" }}>{correct ? "Well done! 🎉" : `Not quite — it's "${words[idx]}"`}</p>}
      {correct === true && <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "'Nunito', sans-serif", marginTop: 6 }}>{splitIntoChunks(words[idx]).join(" · ")}</p>}
    </div>
  );
}

// ─── GAME 7: Memory Match ───
function MemoryMatch({ words, onBack }) {
  const gameWords = words.slice(0, Math.min(6, words.length));
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const pairs = gameWords.flatMap((w, i) => [
      { id: `w-${i}`, type: "word", word: w, pairId: i },
      { id: `a-${i}`, type: "audio", word: w, pairId: i },
    ]);
    for (let i = pairs.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [pairs[i],pairs[j]]=[pairs[j],pairs[i]]; }
    setCards(pairs); setFlipped([]); setMatched([]); setMoves(0); setDone(false);
  }, []);

  const flipCard = (card) => {
    if (flipped.length >= 2 || flipped.find(f => f.id === card.id) || matched.includes(card.pairId)) return;
    if (card.type === "audio") speak(card.word);
    const newFlipped = [...flipped, card];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves(m => m+1);
      if (newFlipped[0].pairId === newFlipped[1].pairId) {
        const newMatched = [...matched, newFlipped[0].pairId];
        setMatched(newMatched);
        setTimeout(() => setFlipped([]), 400);
        if (newMatched.length === gameWords.length) setTimeout(() => setDone(true), 600);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  if (done) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48 }}>🎴</div>
      <h2 style={{ color: "#fff", fontFamily: "'Fredoka', sans-serif" }}>Matched all in {moves} moves!</h2>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
        <button onClick={() => { const pairs = gameWords.flatMap((w,i) => [{id:`w-${i}`,type:"word",word:w,pairId:i},{id:`a-${i}`,type:"audio",word:w,pairId:i}]); for (let i=pairs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]];} setCards(pairs); setFlipped([]); setMatched([]); setMoves(0); setDone(false); }} style={btnStyle("#06D6A0")}>Play Again</button>
        <button onClick={onBack} style={btnStyle("#118AB2")}>Back</button>
      </div>
    </div>
  );

  const cols = gameWords.length <= 4 ? 3 : 4;

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "'Nunito', sans-serif", marginBottom: 16 }}>
        Match each word to its sound · Moves: {moves}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, maxWidth: 400, margin: "0 auto" }}>
        {cards.map(card => {
          const isFlipped = flipped.find(f => f.id === card.id);
          const isMatched = matched.includes(card.pairId);
          return (
            <button key={card.id} onClick={() => flipCard(card)} style={{
              height: 70, borderRadius: 12, border: "none", cursor: "pointer",
              background: isMatched ? "rgba(6,214,160,0.25)" : isFlipped ? "linear-gradient(135deg,#3A86FF,#8338EC)" : "rgba(255,255,255,0.08)",
              color: "#fff", fontSize: isFlipped || isMatched ? (card.type === "word" ? 14 : 24) : 22,
              fontFamily: "'Fredoka', sans-serif", fontWeight: 600, transition: "all 0.25s",
              border: isMatched ? "2px solid #06D6A0" : isFlipped ? "2px solid #3A86FF" : "2px solid rgba(255,255,255,0.08)",
              opacity: isMatched ? 0.6 : 1, textTransform: "lowercase",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {isFlipped || isMatched ? (card.type === "word" ? card.word : "🔊") : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Games list ───
const GAMES = [
  { id: "test", emoji: "🎧", title: "Spelling Test", desc: "Listen & type", color: "#F78C6B" },
  { id: "chunks", emoji: "🧱", title: "Chunk Builder", desc: "Drag pieces to build", color: "#EF476F" },
  { id: "scramble", emoji: "🧩", title: "Unscramble", desc: "Rearrange letters", color: "#8338EC" },
  { id: "missing", emoji: "🔤", title: "Missing Letters", desc: "Fill the gaps", color: "#3A86FF" },
  { id: "flash", emoji: "📚", title: "Flashcards", desc: "Listen first, then check", color: "#06D6A0" },
  { id: "memory", emoji: "🎴", title: "Memory Match", desc: "Match words to sounds", color: "#B24BF3" },
];

// ─── Main App ───
export default function App() {
  const [screen, setScreen] = useState("home");
  const [words, setWords] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [activeGame, setActiveGame] = useState(null);
  const [savedLists, setSavedLists] = useState({});
  const [saveName, setSaveName] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [storageReady, setStorageReady] = useState(false);

  // Load saved lists
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("spelling-lists");
        if (res && res.value) setSavedLists(JSON.parse(res.value));
      } catch (e) { /* no saved data yet */ }
      setStorageReady(true);
      // Load voice preference
      try {
        const v = await window.storage.get("voice-idx");
        if (v && v.value) { const vi = parseInt(v.value); setVoiceIdx(vi); selectedVoiceIdx = vi; }
      } catch (e) {}
      // Init voices
      window.speechSynthesis.getVoices();
    })();
  }, []);

  const saveList = async (name, wordList) => {
    const updated = { ...savedLists, [name]: wordList };
    setSavedLists(updated);
    try { await window.storage.set("spelling-lists", JSON.stringify(updated)); } catch (e) {}
  };

  const deleteList = async (name) => {
    const updated = { ...savedLists };
    delete updated[name];
    setSavedLists(updated);
    try { await window.storage.set("spelling-lists", JSON.stringify(updated)); } catch (e) {}
  };

  const setVoice = async (i) => {
    setVoiceIdx(i);
    selectedVoiceIdx = i;
    try { await window.storage.set("voice-idx", String(i)); } catch (e) {}
  };

  const startGame = (id) => { setActiveGame(id); setScreen("game"); };
  const goMenu = () => { setScreen("menu"); setActiveGame(null); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-8px) } }
        @keyframes slideIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>

      {showVoice && <VoicePicker voiceIdx={voiceIdx} setVoiceIdx={setVoice} onClose={() => setShowVoice(false)} />}

      <div style={{
        minHeight: "100vh", background: "linear-gradient(145deg, #0f0c29, #1a1a3e, #24243e)",
        padding: "20px 16px", fontFamily: "'Nunito', sans-serif", position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(131,56,236,0.15), transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,214,160,0.1), transparent)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}>

          {/* Voice button - always visible */}
          <button onClick={() => setShowVoice(true)} style={{
            position: "absolute", top: 0, right: 0, background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "6px 12px",
            color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer",
            fontFamily: "'Nunito', sans-serif", fontWeight: 600, zIndex: 10,
            display: "flex", alignItems: "center", gap: 6
          }}>
            <span style={{ fontSize: 16 }}>{VOICE_OPTIONS[voiceIdx].label.split(" ")[0]}</span>
            Voice
          </button>

          {/* ─── HOME ─── */}
          {screen === "home" && (
            <div style={{ animation: "slideIn 0.4s ease-out" }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 52, marginBottom: 4, animation: "float 3s ease-in-out infinite" }}>📝</div>
                <h1 style={{ fontFamily: "'Fredoka', sans-serif", color: "#fff", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Spell & Play</h1>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 4 }}>Enter your spelling list to get started!</p>
              </div>

              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 20, border: "1px solid rgba(255,255,255,0.08)" }}>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Your Words</label>
                <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                  placeholder={"Type or paste your words here.\nOne word per line, e.g.:\napple\nbanana\ncherry"} rows={6}
                  style={{ width: "100%", marginTop: 8, padding: 14, borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 16, fontFamily: "'Nunito', sans-serif",
                    outline: "none", resize: "vertical", lineHeight: 1.6 }} />

                {/* Save input */}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="List name to save..."
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, fontFamily: "'Nunito', sans-serif", outline: "none" }} />
                  <button onClick={() => {
                    const w = textInput.split("\n").map(s => s.trim()).filter(Boolean);
                    if (w.length >= 2 && saveName.trim()) { saveList(saveName.trim(), w); setSaveName(""); }
                  }} disabled={!saveName.trim() || textInput.split("\n").map(s=>s.trim()).filter(Boolean).length < 2}
                    style={{ ...btnStyle("#118AB2"), padding: "10px 18px", fontSize: 14, opacity: !saveName.trim() ? 0.4 : 1 }}>
                    💾 Save
                  </button>
                </div>

                <button
                  onClick={() => { const w = textInput.split("\n").map(s => s.trim()).filter(Boolean); if (w.length >= 2) { setWords(w); setScreen("menu"); } }}
                  disabled={textInput.split("\n").map(s => s.trim()).filter(Boolean).length < 2}
                  style={{ ...btnStyle("#8338EC"), width: "100%", marginTop: 14, padding: "14px 0",
                    opacity: textInput.split("\n").map(s => s.trim()).filter(Boolean).length < 2 ? 0.4 : 1 }}>
                  Let's Go! 🚀
                </button>
              </div>

              {/* Saved Lists */}
              {Object.keys(savedLists).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                    💾 Saved Lists
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {Object.entries(savedLists).map(([name, list]) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                        background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
                        <button onClick={() => { setWords(list); setTextInput(list.join("\n")); setScreen("menu"); }}
                          style={{ flex: 1, background: "none", border: "none", color: "#fff", textAlign: "left",
                            cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 600 }}>
                          {name} <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>({list.length} words)</span>
                        </button>
                        <button onClick={() => deleteList(name)} style={{ background: "none", border: "none",
                          color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, padding: "4px 8px" }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample lists */}
              <div style={{ marginTop: 20 }}>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Or try a sample list</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.entries(SAMPLE_LISTS).map(([name, list]) => (
                    <button key={name} onClick={() => { setWords(list); setTextInput(list.join("\n")); setScreen("menu"); }}
                      style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)",
                        fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── MENU ─── */}
          {screen === "menu" && (
            <div style={{ animation: "slideIn 0.4s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <button onClick={() => setScreen("home")} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, padding: "8px 12px", color: "#fff", cursor: "pointer", fontSize: 16 }}>←</button>
                <div>
                  <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: "#fff", fontSize: 22 }}>Choose an Activity</h2>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{words.length} words loaded</p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {GAMES.map((g, i) => (
                  <button key={g.id} onClick={() => startGame(g.id)}
                    style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px",
                      borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.05)", cursor: "pointer",
                      animation: `slideIn 0.4s ease-out ${i*0.06}s both`,
                      transition: "transform 0.15s, background 0.2s", textAlign: "left", width: "100%" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateX(4px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "none"; }}>
                    <div style={{ width: 50, height: 50, borderRadius: 14, background: `${g.color}22`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{g.emoji}</div>
                    <div>
                      <div style={{ fontFamily: "'Fredoka', sans-serif", color: "#fff", fontSize: 17, fontWeight: 600 }}>{g.title}</div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 }}>{g.desc}</div>
                    </div>
                    <div style={{ marginLeft: "auto", color: "rgba(255,255,255,0.2)", fontSize: 18 }}>→</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Your Words</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {words.map((w, i) => <span key={i} style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600 }}>{w}</span>)}
                </div>
              </div>
            </div>
          )}

          {/* ─── GAME ─── */}
          {screen === "game" && (
            <div style={{ animation: "slideIn 0.4s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <button onClick={goMenu} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, padding: "8px 12px", color: "#fff", cursor: "pointer", fontSize: 16 }}>←</button>
                <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: "#fff", fontSize: 20 }}>
                  {GAMES.find(g => g.id === activeGame)?.emoji} {GAMES.find(g => g.id === activeGame)?.title}
                </h2>
              </div>
              {activeGame === "test" && <SpellingTest words={words} onBack={goMenu} />}
              {activeGame === "chunks" && <ChunkBuilder words={words} onBack={goMenu} />}
              {activeGame === "scramble" && <Unscramble words={words} onBack={goMenu} />}
              {activeGame === "missing" && <MissingLetters words={words} onBack={goMenu} />}
              {activeGame === "flash" && <Flashcards words={words} onBack={goMenu} />}
              {activeGame === "memory" && <MemoryMatch words={words} onBack={goMenu} />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
