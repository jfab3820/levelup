import { useState, useEffect, useCallback } from "react";

// ─── Default traits ───────────────────────────────────────────────────────────
const DEFAULT_TRAITS = [
  // Core
  { id: "discipline",    name: "Discipline",            category: "Core",          score: 50, lastReviewed: null },
  { id: "consistency",   name: "Consistency",           category: "Core",          score: 50, lastReviewed: null },
  { id: "accountability",name: "Accountability",        category: "Core",          score: 50, lastReviewed: null },
  { id: "vision",        name: "Vision",                category: "Core",          score: 55, lastReviewed: null },
  // Character
  { id: "integrity",     name: "Integrity",             category: "Character",     score: 60, lastReviewed: null },
  { id: "humility",      name: "Humility",              category: "Character",     score: 55, lastReviewed: null },
  { id: "courage",       name: "Courage",               category: "Character",     score: 50, lastReviewed: null },
  { id: "patience",      name: "Patience",              category: "Character",     score: 45, lastReviewed: null },
  { id: "gratitude",     name: "Gratitude",             category: "Character",     score: 55, lastReviewed: null },
  // Mind
  { id: "emotional",     name: "Emotional Control",     category: "Mind",          score: 45, lastReviewed: null },
  { id: "focus",         name: "Focus",                 category: "Mind",          score: 50, lastReviewed: null },
  { id: "reasoning",     name: "Reasoning",             category: "Mind",          score: 60, lastReviewed: null },
  { id: "learning",      name: "Learning",              category: "Mind",          score: 55, lastReviewed: null },
  { id: "creativity",    name: "Creativity",            category: "Mind",          score: 60, lastReviewed: null },
  // Body
  { id: "health",        name: "Health",                category: "Body",          score: 50, lastReviewed: null },
  // Skills
  { id: "negotiation",   name: "Negotiation",           category: "Skills",        score: 50, lastReviewed: null },
  { id: "communication", name: "Communication",         category: "Skills",        score: 55, lastReviewed: null },
  { id: "financial",     name: "Financial Intelligence", category: "Skills",       score: 40, lastReviewed: null },
  { id: "leadership",    name: "Leadership",            category: "Skills",        score: 50, lastReviewed: null },
  // Relationships
  { id: "family",        name: "Family Presence",       category: "Relationships", score: 55, lastReviewed: null },
];

const SCORE_OPTIONS = [
  { val: 1, label: "Regressed",     delta: -2, color: "#dc2626" },
  { val: 2, label: "Poor Effort",   delta: -1, color: "#f97316" },
  { val: 3, label: "Neutral",       delta: -1, color: "#6b7280" },
  { val: 4, label: "Improved",      delta: +1, color: "#16a34a" },
  { val: 5, label: "Strong Growth", delta: +2, color: "#15803d" },
];

const CATEGORIES = ["Core", "Character", "Mind", "Body", "Skills", "Relationships"];

const CATEGORY_COLORS = {
  Core:          { bg: "#eff6ff", accent: "#2563eb" },
  Character:     { bg: "#fdf4ff", accent: "#9333ea" },
  Mind:          { bg: "#ecfdf5", accent: "#16a34a" },
  Body:          { bg: "#fff7ed", accent: "#ea580c" },
  Skills:        { bg: "#fefce8", accent: "#ca8a04" },
  Relationships: { bg: "#fff1f2", accent: "#e11d48" },
};

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_KEYS = { traits: "lu_traits", focus: "lu_focus", log: "lu_log", streak: "lu_streak" };

function loadState() {
  try {
    const traits  = JSON.parse(localStorage.getItem(LS_KEYS.traits))  || DEFAULT_TRAITS;
    const focus   = JSON.parse(localStorage.getItem(LS_KEYS.focus))   || [];
    const log     = JSON.parse(localStorage.getItem(LS_KEYS.log))     || [];
    const streak  = JSON.parse(localStorage.getItem(LS_KEYS.streak))  || { count: 0, lastDate: null };
    return { traits, focus, log, streak };
  } catch {
    return { traits: DEFAULT_TRAITS, focus: [], log: [], streak: { count: 0, lastDate: null } };
  }
}

function saveState(traits, focus, log, streak) {
  localStorage.setItem(LS_KEYS.traits,  JSON.stringify(traits));
  localStorage.setItem(LS_KEYS.focus,   JSON.stringify(focus));
  localStorage.setItem(LS_KEYS.log,     JSON.stringify(log));
  localStorage.setItem(LS_KEYS.streak,  JSON.stringify(streak));
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysBetween(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return 0;
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.floor(Math.abs(d2 - d1) / 86400000);
}

// ─── Apply decay on load ──────────────────────────────────────────────────────
function applyDecay(traits, focusIds) {
  const today = todayStr();
  return traits.map(t => {
    if (focusIds.includes(t.id)) return t;
    if (!t.lastReviewed) return t;
    const days = daysBetween(t.lastReviewed, today);
    if (days >= 7) {
      const periods = Math.floor(days / 7);
      const newScore = Math.max(0, t.score - periods);
      return { ...t, score: newScore };
    }
    return t;
  });
}

// ─── Rank label ───────────────────────────────────────────────────────────────
function getRank(pct) {
  if (pct >= 90) return "Ascended";
  if (pct >= 75) return "Elite";
  if (pct >= 60) return "Advanced";
  if (pct >= 45) return "Developing";
  if (pct >= 30) return "Beginner";
  return "Starting";
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: "calc(var(--nav-h) + 20px)", left: "50%",
      transform: "translateX(-50%)",
      background: "#111827", color: "#fff",
      padding: "10px 20px", borderRadius: "999px",
      fontSize: "14px", fontWeight: 500, zIndex: 999,
      whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      animation: "toastIn 0.25s ease",
    }}>
      {message}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ functionality, streak, onReset }) {
  const rank = getRank(functionality);
  return (
    <div style={{
      height: "var(--header-h)", background: "#fff",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px", flexShrink: 0,
    }}>
      <div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: "22px", fontWeight: 800, color: "#111827", lineHeight: 1 }}>
          LevelUp
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
          {rank} · {functionality}% Functionality
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          background: streak.count > 0 ? "#fef3c7" : "#f3f4f6",
          color: streak.count > 0 ? "#92400e" : "var(--text-muted)",
          padding: "4px 10px", borderRadius: "999px", fontSize: "13px", fontWeight: 600,
        }}>
          🔥 {streak.count}
        </div>
        <button onClick={onReset} style={{
          width: 32, height: 32, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-muted)", fontSize: "16px",
          background: "#f3f4f6",
        }} title="Reset all data">↺</button>
      </div>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab, focusCount }) {
  const tabs = [
    { id: "traits", label: "Traits", icon: "◈" },
    { id: "review", label: "Review", icon: "✦" },
    { id: "log",    label: "Log",    icon: "≡" },
  ];
  return (
    <div style={{
      height: "var(--nav-h)", background: "#fff",
      borderTop: "1px solid var(--border)",
      display: "flex", flexShrink: 0,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "3px",
          color: tab === t.id ? "var(--green)" : "var(--text-muted)",
          fontSize: "20px", position: "relative",
          transition: "color 0.15s",
        }}>
          {t.icon}
          <span style={{ fontSize: "11px", fontWeight: 600 }}>{t.label}</span>
          {t.id === "review" && focusCount > 0 && (
            <span style={{
              position: "absolute", top: "8px", right: "calc(50% - 16px)",
              background: "var(--green)", color: "#fff",
              borderRadius: "999px", fontSize: "10px", fontWeight: 700,
              padding: "1px 5px", minWidth: "16px", textAlign: "center",
            }}>{focusCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Trait Card ───────────────────────────────────────────────────────────────
function TraitCard({ trait, isFocus, onToggle }) {
  const col = CATEGORY_COLORS[trait.category] || { bg: "#f9fafb", accent: "#6b7280" };
  const pct = trait.score;
  const barColor = pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626";

  return (
    <div onClick={onToggle} style={{
      background: isFocus ? col.bg : "#fff",
      border: `2px solid ${isFocus ? col.accent : "var(--border)"}`,
      borderRadius: "14px", padding: "14px 14px 12px",
      cursor: "pointer", transition: "all 0.18s",
      animation: "fadeIn 0.2s ease",
      boxShadow: isFocus ? `0 0 0 3px ${col.accent}22` : "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "15px", color: "#111827" }}>{trait.name}</div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: col.accent,
            background: col.bg, border: `1px solid ${col.accent}44`,
            borderRadius: "999px", padding: "1px 7px", display: "inline-block", marginTop: "3px",
          }}>{trait.category}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: "22px", fontWeight: 800, color: "#111827", lineHeight: 1 }}>
            {trait.score}
          </div>
          {isFocus && (
            <div style={{ fontSize: "10px", color: col.accent, fontWeight: 700, marginTop: "2px" }}>FOCUS</div>
          )}
        </div>
      </div>
      <div style={{ background: "#f3f4f6", borderRadius: "999px", height: "6px", overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: barColor, borderRadius: "999px",
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

// ─── Traits Tab ───────────────────────────────────────────────────────────────
function TraitsTab({ traits, focus, onToggleFocus, onAddTrait, onGoReview }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScore, setNewScore] = useState(50);
  const [newCat, setNewCat] = useState("Core");
  const [filterCat, setFilterCat] = useState("All");

  const filtered = filterCat === "All" ? traits : traits.filter(t => t.category === filterCat);
  const groups = filterCat === "All"
    ? CATEGORIES.map(c => ({ cat: c, items: traits.filter(t => t.category === c) })).filter(g => g.items.length)
    : [{ cat: filterCat, items: filtered }];

  function handleAdd() {
    if (!newName.trim()) return;
    onAddTrait({ name: newName.trim(), category: newCat, score: newScore });
    setNewName(""); setNewScore(50); setNewCat("Core"); setShowAdd(false);
  }

  return (
    <div className="scroll-area" style={{ padding: "16px" }}>
      {/* Filter pills */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", marginBottom: "16px" }}>
        {["All", ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilterCat(c)} style={{
            flexShrink: 0, padding: "6px 14px", borderRadius: "999px",
            fontSize: "13px", fontWeight: 600,
            background: filterCat === c ? "#111827" : "#fff",
            color: filterCat === c ? "#fff" : "var(--text-muted)",
            border: `1px solid ${filterCat === c ? "#111827" : "var(--border)"}`,
            transition: "all 0.15s",
          }}>{c}</button>
        ))}
      </div>

      {/* Trait groups */}
      {groups.map(({ cat, items }) => (
        <div key={cat} style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: "8px", textTransform: "uppercase" }}>
            {cat}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map(t => (
              <TraitCard
                key={t.id}
                trait={t}
                isFocus={focus.includes(t.id)}
                onToggle={() => onToggleFocus(t.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Add Trait button */}
      <button onClick={() => setShowAdd(true)} style={{
        width: "100%", padding: "14px",
        border: "2px dashed var(--border)", borderRadius: "14px",
        fontSize: "14px", fontWeight: 600, color: "var(--text-muted)",
        marginTop: "4px", marginBottom: "8px",
        transition: "all 0.15s",
      }}>
        + Add New Trait
      </button>

      {/* Floating review button */}
      {focus.length > 0 && (
        <div style={{
          position: "fixed", bottom: "calc(var(--nav-h) + 16px)", left: "50%",
          transform: "translateX(-50%)", zIndex: 100,
          animation: "slideUp 0.2s ease",
        }}>
          <button onClick={onGoReview} style={{
            background: "var(--green)", color: "#fff",
            padding: "14px 28px", borderRadius: "999px",
            fontSize: "15px", fontWeight: 700,
            boxShadow: "0 4px 20px rgba(22,163,74,0.4)",
            whiteSpace: "nowrap",
          }}>
            Review {focus.length} trait{focus.length > 1 ? "s" : ""} →
          </button>
        </div>
      )}

      {/* Add trait modal */}
      {showAdd && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "flex-end", zIndex: 200,
        }} onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: "20px 20px 0 0",
            padding: "24px", width: "100%", animation: "slideUp 0.25s ease",
          }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "20px" }}>
              Add Trait
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Mindfulness"
                style={{
                  display: "block", width: "100%", marginTop: "6px",
                  padding: "12px 14px", border: "1.5px solid var(--border)",
                  borderRadius: "10px", fontSize: "15px", outline: "none",
                }}
              />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Category
              </label>
              <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{
                display: "block", width: "100%", marginTop: "6px",
                padding: "12px 14px", border: "1.5px solid var(--border)",
                borderRadius: "10px", fontSize: "15px", background: "#fff",
              }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Starting Score: <span style={{ color: "#111827" }}>{newScore}</span>
              </label>
              <input type="range" min={0} max={100} value={newScore}
                onChange={e => setNewScore(Number(e.target.value))}
                style={{ display: "block", width: "100%", marginTop: "8px", accentColor: "var(--green)" }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowAdd(false)} style={{
                flex: 1, padding: "14px", borderRadius: "12px",
                background: "#f3f4f6", fontSize: "15px", fontWeight: 600, color: "var(--text-muted)",
              }}>Cancel</button>
              <button onClick={handleAdd} style={{
                flex: 2, padding: "14px", borderRadius: "12px",
                background: "var(--green)", color: "#fff", fontSize: "15px", fontWeight: 700,
              }}>Add Trait</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Review Tab ───────────────────────────────────────────────────────────────
function ReviewTab({ traits, focus, onCommit }) {
  const focusTraits = traits.filter(t => focus.includes(t.id));
  const [scores, setScores] = useState({});

  if (focusTraits.length === 0) {
    return (
      <div className="scroll-area" style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>◈</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>
          No Focus Traits
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.5 }}>
          Go to Traits and tap up to 3 traits you want to work on today.
        </div>
      </div>
    );
  }

  const allScored = focusTraits.every(t => scores[t.id] !== undefined);

  return (
    <div className="scroll-area" style={{ padding: "16px" }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: "22px", fontWeight: 800, marginBottom: "4px" }}>
        Daily Review
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>
        Score yourself honestly on each focus trait.
      </div>

      {focusTraits.map(trait => {
        const col = CATEGORY_COLORS[trait.category] || { bg: "#f9fafb", accent: "#6b7280" };
        const selected = scores[trait.id];
        return (
          <div key={trait.id} style={{
            background: "#fff", border: "1.5px solid var(--border)",
            borderRadius: "16px", padding: "16px", marginBottom: "14px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "17px" }}>{trait.name}</div>
                <div style={{ fontSize: "12px", color: col.accent, fontWeight: 600 }}>{trait.category}</div>
              </div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: "26px", fontWeight: 800 }}>{trait.score}</div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {SCORE_OPTIONS.map(opt => {
                const isSelected = selected === opt.val;
                return (
                  <button key={opt.val} onClick={() => setScores(s => ({ ...s, [trait.id]: opt.val }))} style={{
                    flex: 1, padding: "10px 0", borderRadius: "10px",
                    fontSize: "18px", fontWeight: 800,
                    background: isSelected ? opt.color : "#f3f4f6",
                    color: isSelected ? "#fff" : "#9ca3af",
                    border: `2px solid ${isSelected ? opt.color : "transparent"}`,
                    transition: "all 0.15s",
                    animation: isSelected ? "pop 0.2s ease" : "none",
                  }}>
                    {opt.val}
                  </button>
                );
              })}
            </div>
            {selected !== undefined && (
              <div style={{
                marginTop: "10px", padding: "8px 12px", borderRadius: "8px",
                background: selected >= 4 ? "#dcfce7" : selected === 3 ? "#f3f4f6" : "#fee2e2",
                fontSize: "13px", fontWeight: 600,
                color: selected >= 4 ? "#15803d" : selected === 3 ? "#6b7280" : "#dc2626",
              }}>
                {SCORE_OPTIONS.find(o => o.val === selected).label} &nbsp;·&nbsp;{" "}
                {SCORE_OPTIONS.find(o => o.val === selected).delta > 0 ? "+" : ""}
                {SCORE_OPTIONS.find(o => o.val === selected).delta} pts
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={() => allScored && onCommit(scores)}
        disabled={!allScored}
        style={{
          width: "100%", padding: "16px", borderRadius: "14px",
          background: allScored ? "var(--green)" : "#e5e7eb",
          color: allScored ? "#fff" : "#9ca3af",
          fontSize: "16px", fontWeight: 700, marginTop: "4px",
          transition: "all 0.2s",
        }}
      >
        Commit Review
      </button>

      {/* Score legend */}
      <div style={{ marginTop: "20px", padding: "16px", background: "#f9fafb", borderRadius: "12px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
          Score Guide
        </div>
        {SCORE_OPTIONS.map(opt => (
          <div key={opt.val} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px" }}>
            <span style={{ fontWeight: 700, color: opt.color }}>{opt.val} — {opt.label}</span>
            <span style={{ color: opt.delta > 0 ? "var(--green)" : opt.delta === 0 ? "var(--text-muted)" : "var(--red)", fontWeight: 700 }}>
              {opt.delta > 0 ? "+" : ""}{opt.delta} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────
function LogTab({ log }) {
  if (!log.length) {
    return (
      <div className="scroll-area" style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>≡</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>
          No Reviews Yet
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.5 }}>
          Complete your first daily review to see your history here.
        </div>
      </div>
    );
  }

  const grouped = log.reduce((acc, entry) => {
    const date = entry.date || "Unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="scroll-area" style={{ padding: "16px" }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: "22px", fontWeight: 800, marginBottom: "20px" }}>
        Review Log
      </div>
      {dates.map(date => (
        <div key={date} style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
            {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {grouped[date].map((entry, i) => {
              const opt = SCORE_OPTIONS.find(o => o.val === entry.score);
              return (
                <div key={i} style={{
                  background: "#fff", border: "1.5px solid var(--border)",
                  borderRadius: "12px", padding: "12px 14px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "15px" }}>{entry.trait}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{opt?.label}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, color: opt?.color }}>
                      {entry.score}
                    </div>
                    <div style={{ fontSize: "12px", color: opt?.delta > 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                      {opt?.delta > 0 ? "+" : ""}{opt?.delta} pts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Reset Modal ──────────────────────────────────────────────────────────────
function ResetModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 300, padding: "24px",
    }}>
      <div style={{
        background: "#fff", borderRadius: "20px", padding: "28px 24px",
        width: "100%", maxWidth: "340px", animation: "fadeIn 0.2s ease",
      }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: "22px", fontWeight: 800, marginBottom: "10px" }}>
          Reset Everything?
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.5, marginBottom: "24px" }}>
          This will delete all your scores, streak, and log history. This cannot be undone.
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "14px", borderRadius: "12px",
            background: "#f3f4f6", fontSize: "15px", fontWeight: 600, color: "#374151",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "14px", borderRadius: "12px",
            background: "var(--red)", color: "#fff", fontSize: "15px", fontWeight: 700,
          }}>Reset</button>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]         = useState("traits");
  const [traits, setTraits]   = useState([]);
  const [focus, setFocus]     = useState([]);
  const [log, setLog]         = useState([]);
  const [streak, setStreak]   = useState({ count: 0, lastDate: null });
  const [toast, setToast]     = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  // Load + apply decay on mount
  useEffect(() => {
    const state = loadState();
    const decayed = applyDecay(state.traits, state.focus);
    setTraits(decayed);
    setFocus(state.focus);
    setLog(state.log);
    setStreak(state.streak);
    setLoaded(true);
  }, []);

  // Persist on every change
  useEffect(() => {
    if (!loaded) return;
    saveState(traits, focus, log, streak);
  }, [traits, focus, log, streak, loaded]);

  const showToast = useCallback((msg) => setToast(msg), []);

  function toggleFocus(id) {
    setFocus(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) { showToast("Max 3 focus traits"); return prev; }
      return [...prev, id];
    });
  }

  function addTrait({ name, category, score }) {
    const id = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    setTraits(prev => [...prev, { id, name, category, score, lastReviewed: null }]);
    showToast(`${name} added!`);
  }

  function commitReview(scores) {
    const today = todayStr();
    const newLog = [];

    setTraits(prev => prev.map(t => {
      if (!focus.includes(t.id)) return t;
      const val = scores[t.id];
      const opt = SCORE_OPTIONS.find(o => o.val === val);
      const newScore = Math.min(100, Math.max(0, t.score + opt.delta));
      newLog.push({ trait: t.name, score: val, delta: opt.delta, date: today });
      return { ...t, score: newScore, lastReviewed: today };
    }));

    setLog(prev => [...newLog, ...prev]);

    // Update streak
    setStreak(prev => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];
      if (prev.lastDate === today) return prev;
      if (prev.lastDate === yStr) return { count: prev.count + 1, lastDate: today };
      return { count: 1, lastDate: today };
    });

    setFocus([]);
    showToast("Review committed! 🔥");
    setTab("log");
  }

  function handleReset() {
    Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k));
    setTraits(DEFAULT_TRAITS);
    setFocus([]);
    setLog([]);
    setStreak({ count: 0, lastDate: null });
    setShowReset(false);
    showToast("All data reset");
  }

  const functionality = traits.length
    ? Math.round(traits.reduce((s, t) => s + t.score, 0) / traits.length)
    : 0;

  if (!loaded) return null;

  return (
    <>
      <Header functionality={functionality} streak={streak} onReset={() => setShowReset(true)} />

      {tab === "traits" && (
        <TraitsTab
          traits={traits}
          focus={focus}
          onToggleFocus={toggleFocus}
          onAddTrait={addTrait}
          onGoReview={() => setTab("review")}
        />
      )}
      {tab === "review" && (
        <ReviewTab traits={traits} focus={focus} onCommit={commitReview} />
      )}
      {tab === "log" && (
        <LogTab log={log} />
      )}

      <BottomNav tab={tab} setTab={setTab} focusCount={focus.length} />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {showReset && <ResetModal onConfirm={handleReset} onCancel={() => setShowReset(false)} />}
    </>
  );
}