import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import cloudConfig from "./cloudConfig.json";
import { TRAIT_LESSONS, CATEGORY_LESSONS } from "./powerupLibrary";

// ─── Default traits ───────────────────────────────────────────────────────────
export const DEFAULT_TRAITS = [
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

export const SCORE_OPTIONS = [
  { val: 1, label: "Regressed",     delta: -2, color: "#dc2626" },
  { val: 2, label: "Poor Effort",   delta: -1, color: "#f97316" },
  { val: 3, label: "Neutral",       delta: -1, color: "#6b7280" },
  { val: 4, label: "Improved",      delta: +1, color: "#16a34a" },
  { val: 5, label: "Strong Growth", delta: +2, color: "#15803d" },
];

const CATEGORIES = ["Core", "Character", "Mind", "Body", "Skills", "Relationships"];

// Colors live in index.css as CSS variables so they can change with the theme.
const CATEGORY_COLORS = {
  Core:          { bg: "var(--cat-core-bg)",          accent: "var(--cat-core)" },
  Character:     { bg: "var(--cat-character-bg)",     accent: "var(--cat-character)" },
  Mind:          { bg: "var(--cat-mind-bg)",          accent: "var(--cat-mind)" },
  Body:          { bg: "var(--cat-body-bg)",          accent: "var(--cat-body)" },
  Skills:        { bg: "var(--cat-skills-bg)",        accent: "var(--cat-skills)" },
  Relationships: { bg: "var(--cat-relationships-bg)", accent: "var(--cat-relationships)" },
};
const FALLBACK_CATEGORY_COLOR = { bg: "var(--cat-default-bg)", accent: "var(--cat-default)" };

function categoryColor(category) {
  return CATEGORY_COLORS[category] || FALLBACK_CATEGORY_COLOR;
}

// Mixes a CSS color with transparency — used for tinted borders and glows.
function fade(color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

const LS_KEYS = {
  traits: "lu_traits",
  focus: "lu_focus",
  log: "lu_log",
  streak: "lu_streak",
  powerups: "lu_powerups",
  updatedAt: "lu_updated_at",
  meta: "lu_meta",
  settings: "lu_settings",
  backup: "lu_backup",
};

const SCHEMA_VERSION = 2;
const MAX_FOCUS = 3;
const MAX_POWERUPS = 60;
const POWERUP_POOL = 5;         // Powerups rotate through this many of the lowest traits
const DECAY_DAYS = 7;           // an unreviewed trait loses 1 point per this many days
const AI_TIMEOUT_MS = 45000;
const APP_VERSION = "4.0";

// ─── Date helpers ─────────────────────────────────────────────────────────────
// Dates are stored as local calendar days ("2026-11-15"). All math on them is done
// in UTC so daylight-saving changes can never add or drop a day.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayStr() {
  return toDateStr(new Date());
}

function dateToUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// Whole days from `from` to `to`. Negative when `to` is earlier.
export function dayDiff(from, to) {
  if (!from || !to) return 0;
  return Math.round((dateToUTC(to) - dateToUTC(from)) / 86400000);
}

export function addDays(dateStr, days) {
  return new Date(dateToUTC(dateStr) + days * 86400000).toISOString().slice(0, 10);
}

// Monday of the week containing dateStr.
export function weekStartOf(dateStr) {
  const dow = new Date(dateToUTC(dateStr)).getUTCDay();
  return addDays(dateStr, dow === 0 ? -6 : 1 - dow);
}

function formatDate(dateStr, options = { weekday: "short", month: "short", day: "numeric" }) {
  return new Date(dateToUTC(dateStr)).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

// Like formatDate, but says "Today" / "Yesterday" when that's what it is.
function formatDay(dateStr, today) {
  if (dateStr === today) return "Today";
  if (dateStr === addDays(today, -1)) return "Yesterday";
  return formatDate(dateStr);
}

function timeAgo(ms) {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Data cleaning ────────────────────────────────────────────────────────────
function clampScore(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 50;
  return Math.min(100, Math.max(0, Math.round(num)));
}

// Valid date string or null. Dates in the future are pulled back to today — the old
// app stored UTC dates, so an evening review could be stamped with tomorrow's date.
function cleanDate(value, today) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  return value > today ? today : value;
}

function freshTraits() {
  return DEFAULT_TRAITS.map(t => ({ ...t }));
}

export function emptyData() {
  return {
    traits: freshTraits(),
    focus: [],
    log: [],
    streak: { count: 0, lastDate: null, best: 0 },
    powerups: [],
    updatedAt: null,
  };
}

// Takes anything (old localStorage, a backup file, cloud data) and returns data in
// the exact shape the app expects. Bad entries are dropped instead of crashing the app.
export function normalizeData(raw, today = todayStr()) {
  const src = raw && typeof raw === "object" ? raw : {};

  const seenIds = new Set();
  let traits = (Array.isArray(src.traits) ? src.traits : [])
    .filter(t => {
      if (!t || typeof t.id !== "string" || !t.id || typeof t.name !== "string" || !t.name.trim()) return false;
      if (seenIds.has(t.id)) return false;
      seenIds.add(t.id);
      return true;
    })
    .map(t => {
      const lastReviewed = cleanDate(t.lastReviewed, today);
      const trait = {
        id: t.id,
        name: t.name.trim().slice(0, 60),
        category: CATEGORIES.includes(t.category) ? t.category : "Core",
        score: clampScore(t.score),
        lastReviewed,
      };
      const anchor = cleanDate(t.decayAnchor, today);
      if (lastReviewed && anchor) trait.decayAnchor = anchor < lastReviewed ? lastReviewed : anchor;
      return trait;
    });
  if (traits.length === 0) traits = freshTraits();

  const traitIds = new Set(traits.map(t => t.id));
  const focus = [...new Set(Array.isArray(src.focus) ? src.focus : [])]
    .filter(id => traitIds.has(id))
    .slice(0, MAX_FOCUS);

  const log = (Array.isArray(src.log) ? src.log : [])
    .map(e => {
      if (!e || typeof e.trait !== "string") return null;
      const date = cleanDate(e.date, today);
      const delta = Number(e.delta);
      if (!date || !Number.isFinite(delta)) return null;
      const entry = { trait: e.trait };
      if (typeof e.traitId === "string") entry.traitId = e.traitId;
      return { ...entry, score: Number(e.score) || 0, delta, date };
    })
    .filter(Boolean);

  const rawStreak = src.streak && typeof src.streak === "object" ? src.streak : {};
  const lastDate = cleanDate(rawStreak.lastDate, today);
  const count = lastDate ? Math.max(0, Math.floor(Number(rawStreak.count) || 0)) : 0;
  const streak = { count, lastDate, best: Math.max(count, Math.floor(Number(rawStreak.best) || 0)) };

  const seenDates = new Set();
  const powerups = (Array.isArray(src.powerups) ? src.powerups : [])
    .map(p => {
      if (!p) return null;
      const date = cleanDate(p.date, today);
      const texts = [p.traitName, p.title, p.lesson, p.action, p.reflection];
      if (!date || texts.some(s => typeof s !== "string" || !s) || seenDates.has(date)) return null;
      seenDates.add(date);
      const entry = {
        id: typeof p.id === "string" ? p.id : `${date}:${p.title}`,
        date,
        traitId: typeof p.traitId === "string" ? p.traitId : "",
        traitName: p.traitName,
        category: CATEGORIES.includes(p.category) ? p.category : "Core",
        title: p.title,
        lesson: p.lesson,
        action: p.action,
        reflection: p.reflection,
        source: p.source === "ai" ? "ai" : "library",
        done: Boolean(p.done),
        swap: Math.max(0, Math.floor(Number(p.swap) || 0)),
      };
      if (typeof p.lessonId === "string") entry.lessonId = p.lessonId;
      if (p.aiTried) entry.aiTried = true;
      return entry;
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_POWERUPS);

  return {
    traits,
    focus,
    log,
    streak,
    powerups,
    updatedAt: typeof src.updatedAt === "string" ? src.updatedAt : null,
  };
}

// ─── Decay ────────────────────────────────────────────────────────────────────
// A reviewed trait that is not in the focus list loses 1 point for every full 7 days
// since its decay anchor. The anchor then moves forward by the days that were charged,
// so the same week is never charged twice (the old app charged it on every launch).
// Focus traits are exempt: their clock is held at today.
// Returns the same array when nothing changed.
export function applyDecay(traits, focusIds, today = todayStr()) {
  let changed = false;
  const next = traits.map(t => {
    if (!t.lastReviewed) return t;
    if (focusIds.includes(t.id)) {
      if (t.decayAnchor === today) return t;
      changed = true;
      return { ...t, decayAnchor: today };
    }
    const anchor = t.decayAnchor || t.lastReviewed;
    const periods = Math.floor(dayDiff(anchor, today) / DECAY_DAYS);
    if (periods < 1) return t;
    changed = true;
    return {
      ...t,
      score: Math.max(0, t.score - periods),
      decayAnchor: addDays(anchor, periods * DECAY_DAYS),
    };
  });
  return changed ? next : traits;
}

// Days until an unreviewed trait loses its next point, or null if it isn't decaying.
function daysUntilDecay(trait, isFocus, today) {
  if (!trait.lastReviewed || isFocus) return null;
  const elapsed = dayDiff(trait.decayAnchor || trait.lastReviewed, today);
  return Math.max(1, DECAY_DAYS - (elapsed % DECAY_DAYS));
}

// ─── Streak ───────────────────────────────────────────────────────────────────
// The number to show: a streak only counts if the last review was today or yesterday.
export function currentStreak(streak, today = todayStr()) {
  if (!streak.lastDate) return 0;
  return dayDiff(streak.lastDate, today) <= 1 ? streak.count : 0;
}

export function bumpStreak(streak, today = todayStr()) {
  if (streak.lastDate === today) return streak;
  const count = streak.lastDate && dayDiff(streak.lastDate, today) === 1 ? streak.count + 1 : 1;
  return { count, lastDate: today, best: Math.max(streak.best || 0, count) };
}

// ─── Review ───────────────────────────────────────────────────────────────────
// Applies a committed review. `scores` maps trait id → 1–5. Returns new data.
export function applyReview(data, scores, today = todayStr()) {
  const entries = [];
  const traits = data.traits.map(t => {
    if (!data.focus.includes(t.id)) return t;
    const opt = SCORE_OPTIONS.find(o => o.val === scores[t.id]);
    if (!opt) return t;
    entries.push({ trait: t.name, traitId: t.id, score: opt.val, delta: opt.delta, date: today });
    return { ...t, score: clampScore(t.score + opt.delta), lastReviewed: today, decayAnchor: today };
  });
  if (entries.length === 0) return data;
  return {
    ...data,
    traits,
    focus: [],
    log: [...entries, ...data.log],
    streak: bumpStreak(data.streak, today),
  };
}

// ─── Score repair ─────────────────────────────────────────────────────────────
// The old app took decay points off again on every launch. This replays the review
// log for each built-in trait (starting score + every logged change − one point per
// full 7 days between reviews) to work out what the score should be, and reports
// the traits that are currently lower than that. Custom traits are skipped because
// their starting score was never recorded.
export function computeRepair(traits, log, today = todayStr()) {
  const offers = [];
  traits.forEach(trait => {
    const original = DEFAULT_TRAITS.find(d => d.id === trait.id);
    if (!original) return;
    const entries = log
      .filter(e => (e.traitId ? e.traitId === trait.id : e.trait === original.name))
      .slice()
      .reverse()                                   // the log is newest-first
      .sort((a, b) => a.date.localeCompare(b.date));
    if (entries.length === 0) return;

    let score = original.score;
    let last = null;
    entries.forEach(e => {
      if (last) score = Math.max(0, score - Math.floor(dayDiff(last, e.date) / DECAY_DAYS));
      score = clampScore(score + e.delta);
      last = e.date;
    });
    score = Math.max(0, score - Math.floor(dayDiff(last, today) / DECAY_DAYS));

    if (score > trait.score) offers.push({ id: trait.id, name: trait.name, from: trait.score, to: score });
  });
  return offers;
}

export function applyRepair(data, offers, today = todayStr()) {
  const byId = Object.fromEntries(offers.map(o => [o.id, o.to]));
  return {
    ...data,
    traits: data.traits.map(t => (t.id in byId ? { ...t, score: byId[t.id], decayAnchor: today } : t)),
  };
}

// ─── Powerups ─────────────────────────────────────────────────────────────────
// The traits a Powerup can target today: the lowest-scoring few, ordered so the one
// that has waited longest for a lesson comes first.
export function rankPowerupTraits(traits, powerups) {
  const lastLesson = {};
  powerups.forEach(p => {
    if (!lastLesson[p.traitId] || p.date > lastLesson[p.traitId]) lastLesson[p.traitId] = p.date;
  });
  return traits
    .map((trait, index) => ({ trait, index }))
    .sort((a, b) => a.trait.score - b.trait.score || a.index - b.index)
    .slice(0, POWERUP_POOL)
    .sort((a, b) =>
      (lastLesson[a.trait.id] || "").localeCompare(lastLesson[b.trait.id] || "") ||
      a.trait.score - b.trait.score ||
      a.index - b.index
    )
    .map(x => x.trait);
}

// Picks today's lesson from the built-in library. `swap` is how many times the user
// has asked for a different one today; each swap moves to the next trait in line.
export function buildLibraryPowerup(traits, powerups, today = todayStr(), swap = 0) {
  const history = powerups.filter(p => p.date !== today);
  const candidates = rankPowerupTraits(traits, history);
  if (candidates.length === 0) return null;

  const trait = candidates[swap % candidates.length];
  const ownLessons = TRAIT_LESSONS[trait.id];
  const lessons = ownLessons || CATEGORY_LESSONS[trait.category] || CATEGORY_LESSONS.Core;
  // Category lessons are shared by every custom trait in that category, so track them per trait.
  const lessonKey = lesson => (ownLessons ? lesson.id : `${lesson.id}:${trait.id}`);

  const lastUsed = {};
  history.forEach(p => {
    if (p.lessonId && !(p.lessonId in lastUsed)) lastUsed[p.lessonId] = p.date;
  });
  // Never-used lessons first, then the one used longest ago.
  const ordered = lessons
    .map((lesson, index) => ({ lesson, index }))
    .sort((a, b) =>
      (lastUsed[lessonKey(a.lesson)] || "").localeCompare(lastUsed[lessonKey(b.lesson)] || "") || a.index - b.index
    )
    .map(x => x.lesson);
  const lesson = ordered[Math.floor(swap / candidates.length) % ordered.length];
  const fill = text => text.replace(/\{trait\}/g, trait.name);

  return {
    id: `${today}:${lessonKey(lesson)}`,
    date: today,
    traitId: trait.id,
    traitName: trait.name,
    category: trait.category,
    lessonId: lessonKey(lesson),
    title: lesson.title,
    lesson: fill(lesson.lesson),
    action: fill(lesson.action),
    reflection: fill(lesson.reflection),
    source: "library",
    done: false,
    swap,
  };
}

function todayPowerupOf(data, today) {
  return data.powerups.find(p => p.date === today) || null;
}

function setTodayPowerup(data, entry) {
  return {
    ...data,
    powerups: [entry, ...data.powerups.filter(p => p.date !== entry.date)].slice(0, MAX_POWERUPS),
  };
}

// Makes sure there is a lesson for today. Returns the same object if there already is one.
export function ensureTodayPowerup(data, today = todayStr()) {
  if (todayPowerupOf(data, today)) return data;
  const entry = buildLibraryPowerup(data.traits, data.powerups, today, 0);
  return entry ? setTodayPowerup(data, entry) : data;
}

// ─── Cloud sync decisions ─────────────────────────────────────────────────────
// True when nothing has been done on this device yet, so cloud data can replace it safely.
export function isPristine(data) {
  if (data.log.length > 0 || data.streak.count > 0) return false;
  if (data.powerups.some(p => p.done || p.source === "ai")) return false;
  if (data.traits.length !== DEFAULT_TRAITS.length) return false;
  return data.traits.every((t, i) => t.id === DEFAULT_TRAITS[i].id && t.score === DEFAULT_TRAITS[i].score);
}

// What gets stored in the cloud for a user.
export function toCloudPayload(data) {
  return {
    schema: SCHEMA_VERSION,
    traits: data.traits,
    focus: data.focus,
    log: data.log,
    streak: data.streak,
    powerups: data.powerups,
    updatedAt: data.updatedAt,
  };
}

// Same progress on both sides, ignoring when it was last edited. Both sides go through
// normalizeData first so the comparison doesn't depend on the order keys were written in.
function sameContent(a, b) {
  const canonical = d => JSON.stringify({ ...toCloudPayload(normalizeData(d)), updatedAt: null });
  return canonical(a) === canonical(b);
}

// Decides what a sync should do. Pure function — no network, easy to test.
//   data   – what is on this device
//   meta   – this device's sync bookkeeping (meta.cloud is null until first sync)
//   remote – the cloud row { data, updated_at }, or null if the account has none
// Returns { action: "push" | "pull" | "link" | "ask" | "noop", discardsLocal? }
export function decideSync({ data, meta, remote, userId }) {
  if (!remote) return { action: "push" };

  const link = meta.cloud && meta.cloud.userId === userId ? meta.cloud : null;
  if (!link) {
    // First sync between this device and this account.
    if (isPristine(data)) return { action: "pull" };
    if (sameContent(data, remote.data)) return { action: "link" };
    return { action: "ask" };
  }

  const remoteChanged = remote.updated_at !== link.remoteUpdatedAt;
  const localChanged = data.updatedAt !== link.dataUpdatedAt;
  if (remoteChanged && localChanged) {
    // Both sides changed since the last sync: the most recent edit wins.
    const remoteEdit = (remote.data && remote.data.updatedAt) || "";
    return remoteEdit > (data.updatedAt || "") ? { action: "pull", discardsLocal: true } : { action: "push" };
  }
  if (remoteChanged) return { action: "pull" };
  if (localChanged) return { action: "push" };
  return { action: "noop" };
}

function summarize(data) {
  const lastReview = data.log.reduce((latest, e) => (e.date > latest ? e.date : latest), "");
  return { reviews: data.log.length, lastReview: lastReview || null, streak: data.streak.count };
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

// ─── localStorage ─────────────────────────────────────────────────────────────
function readJSON(key) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? null : JSON.parse(value);
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage full or blocked (private mode) — the app keeps working in memory
  }
}

function loadStoredData() {
  return {
    traits: readJSON(LS_KEYS.traits),
    focus: readJSON(LS_KEYS.focus),
    log: readJSON(LS_KEYS.log),
    streak: readJSON(LS_KEYS.streak),
    powerups: readJSON(LS_KEYS.powerups),
    updatedAt: readJSON(LS_KEYS.updatedAt),
  };
}

function saveData(data) {
  writeJSON(LS_KEYS.traits, data.traits);
  writeJSON(LS_KEYS.focus, data.focus);
  writeJSON(LS_KEYS.log, data.log);
  writeJSON(LS_KEYS.streak, data.streak);
  writeJSON(LS_KEYS.powerups, data.powerups);
  writeJSON(LS_KEYS.updatedAt, data.updatedAt);
}

function loadSettings() {
  const saved = readJSON(LS_KEYS.settings);
  const theme = saved && ["system", "light", "dark"].includes(saved.theme) ? saved.theme : "system";
  return { theme, aiPowerups: !(saved && saved.aiPowerups === false) };
}

// Loads everything from this device and brings it up to date: cleans it, upgrades
// data written by the old app, applies decay, and makes sure today has a Powerup.
export function loadInitialState(today = todayStr()) {
  const savedMeta = readJSON(LS_KEYS.meta);
  const meta = {
    schema: SCHEMA_VERSION,
    repairChecked: false,
    cloud: null,
    ...(savedMeta && typeof savedMeta === "object" ? savedMeta : {}),
  };

  let data = normalizeData(loadStoredData(), today);

  if (!savedMeta || !(savedMeta.schema >= 2)) {
    // Upgrade from the old app: start every decay clock fresh from today, since the
    // old version had already charged (and over-charged) for the time before now.
    data = { ...data, traits: data.traits.map(t => (t.lastReviewed ? { ...t, decayAnchor: today } : t)) };
    meta.schema = SCHEMA_VERSION;
  }

  data = { ...data, traits: applyDecay(data.traits, data.focus, today) };
  data = ensureTodayPowerup(data, today);

  let repairOffers = [];
  if (!meta.repairChecked) {
    repairOffers = computeRepair(data.traits, data.log, today);
    if (repairOffers.length === 0) meta.repairChecked = true;
  }

  return { data, meta, repairOffers };
}

// One safety copy of the data, taken right before anything replaces it.
function writeBackup(data, reason) {
  const backup = { at: new Date().toISOString(), reason, data: toCloudPayload(data) };
  return writeJSON(LS_KEYS.backup, backup) ? backup : null;
}

// ─── Backup files ─────────────────────────────────────────────────────────────
function downloadBackupFile(data) {
  const file = { app: "levelup", schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: toCloudPayload(data) };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `levelup-backup-${todayStr()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Reads the text of a backup file. Returns clean data, or throws with a readable message.
export function parseBackupFile(text, today = todayStr()) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a LevelUp backup.");
  }
  const source = parsed && parsed.app === "levelup" && parsed.data ? parsed.data : parsed;
  if (!source || !Array.isArray(source.traits) || source.traits.length === 0) {
    throw new Error("That file isn't a LevelUp backup.");
  }
  return normalizeData(source, today);
}

// ─── Cloud (Supabase) ─────────────────────────────────────────────────────────
// Cloud sync and AI Powerups switch on when a Supabase project is filled in, either in
// src/cloudConfig.json or through REACT_APP_SUPABASE_* build variables. Both values are
// public by design: the database only lets a signed-in user touch their own row.
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || cloudConfig.supabaseUrl;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || cloudConfig.supabasePublishableKey;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

async function fetchRemote(userId) {
  const { data, error } = await supabase
    .from("user_state")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data; // null when this account has nothing saved yet
}

// Saves to the cloud. `expectedUpdatedAt` is the cloud version we last saw (null to
// create the row). If another device saved in between, nothing is written and the
// error code LU_STALE tells the caller to sync again.
async function pushRemote(userId, payload, expectedUpdatedAt) {
  if (expectedUpdatedAt == null) {
    const { data, error } = await supabase
      .from("user_state")
      .insert({ user_id: userId, data: payload })
      .select("updated_at")
      .single();
    if (error) {
      if (error.code === "23505") error.code = "LU_STALE"; // another device created the row first
      throw error;
    }
    return data.updated_at;
  }
  const { data, error } = await supabase
    .from("user_state")
    .update({ data: payload })
    .eq("user_id", userId)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at");
  if (error) throw error;
  if (!data || data.length === 0) {
    const stale = new Error("Cloud data changed on another device.");
    stale.code = "LU_STALE";
    throw stale;
  }
  return data[0].updated_at;
}

// Asks the serverless function for a Claude-written lesson for one trait.
async function requestAiPowerup(accessToken, trait, recentTitles) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch("/api/powerup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        trait: { name: trait.name, category: trait.category, score: trait.score },
        recentTitles,
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    const lesson = body && body.lesson;
    const complete = lesson && ["title", "lesson", "action", "reflection"].every(k => typeof lesson[k] === "string" && lesson[k]);
    if (!response.ok || !complete) {
      const failure = new Error((body && body.error) || "request_failed");
      failure.code = (body && body.error) || "request_failed";
      throw failure;
    }
    return lesson;
  } finally {
    clearTimeout(timer);
  }
}

function aiFailureNote(code) {
  if (code === "daily_limit") return "You've used today's AI lessons, so this one is from the built-in library.";
  if (code === "not_configured") return "AI lessons aren't switched on yet, so this one is from the built-in library.";
  return "Couldn't reach the AI coach, so this one is from the built-in library.";
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────
const ICON_PATHS = {
  traits: <><path d="M12 3l8 9-8 9-8-9z" /><path d="M12 8.5l3.2 3.5-3.2 3.5L8.8 12z" /></>,
  review: <path d="M12 3l1.9 7.1L21 12l-7.1 1.9L12 21l-1.9-7.1L3 12l7.1-1.9z" />,
  powerup: <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z" />,
  log: <path d="M4 7h16M4 12h16M4 17h16" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  more: <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
  cloud: <path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 11a3.75 3.75 0 0 1-.25 7.5z" />,
};

function Icon({ name, size = 20, filled = false, strokeWidth = 2 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={filled ? 0 : strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

const headingStyle = { fontFamily: "Syne, sans-serif", fontWeight: 800, color: "var(--text)" };
const labelStyle = {
  fontSize: "12px", fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.06em",
};
const primaryButton = {
  padding: "14px", borderRadius: "12px", background: "var(--green-solid)",
  color: "#fff", fontSize: "15px", fontWeight: 700,
};
const secondaryButton = {
  padding: "14px", borderRadius: "12px", background: "var(--surface)",
  color: "var(--text-2)", fontSize: "15px", fontWeight: 600,
};
const dangerButton = { ...primaryButton, background: "var(--red-solid)" };

// Closes a sheet or dialog when Escape is pressed.
function useEscape(onClose) {
  useEffect(() => {
    if (!onClose) return undefined;
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
}

// Panel that slides up from the bottom. Tapping the dimmed area closes it.
function Sheet({ label, onClose, children, zIndex = 200 }) {
  useEscape(onClose);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "var(--overlay)",
        display: "flex", alignItems: "flex-end", zIndex,
      }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={label}
        className="lu-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--card)", borderRadius: "20px 20px 0 0",
          padding: "24px", paddingBottom: "calc(24px + var(--safe-b))",
          maxHeight: "90%", overflowY: "auto",
          animation: "slideUp 0.25s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Centered box for questions that need an answer before continuing.
function Dialog({ label, onClose, children, zIndex = 300 }) {
  useEscape(onClose);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "var(--overlay)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex, padding: "24px",
      }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={label}
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--card)", borderRadius: "20px", padding: "28px 24px",
          width: "100%", maxWidth: "340px", maxHeight: "90%", overflowY: "auto",
          animation: "fadeIn 0.2s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, children }) {
  return (
    <div className="scroll-area" style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 24px", textAlign: "center",
    }}>
      <div style={{ color: "var(--text-faint)", marginBottom: "16px" }}>
        <Icon name={icon} size={48} strokeWidth={1.5} />
      </div>
      <div style={{ ...headingStyle, fontSize: "20px", marginBottom: "8px" }}>{title}</div>
      <div style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div role="status" style={{
      position: "fixed", bottom: "calc(var(--nav-h) + var(--safe-b) + 20px)", left: "50%",
      transform: "translateX(-50%)",
      background: "var(--inverse-bg)", color: "var(--inverse-text)",
      padding: "10px 20px", borderRadius: "999px",
      fontSize: "14px", fontWeight: 500, zIndex: 999,
      maxWidth: "calc(100vw - 32px)", textAlign: "center", boxShadow: "var(--shadow-pop)",
      animation: "toastIn 0.25s ease",
    }}>
      {message}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ functionality, streakCount, needsAttention, onOpenSettings }) {
  const rank = getRank(functionality);
  return (
    <div style={{
      height: "var(--header-h)", background: "var(--card)",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px", flexShrink: 0,
    }}>
      <div>
        <div style={{ ...headingStyle, fontSize: "22px", lineHeight: 1 }}>
          LevelUp
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
          {rank} · {functionality}% Functionality
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div title="Days in a row with a review" style={{
          background: streakCount > 0 ? "var(--amber-light)" : "var(--surface)",
          color: streakCount > 0 ? "var(--amber-text)" : "var(--text-muted)",
          padding: "4px 10px", borderRadius: "999px", fontSize: "13px", fontWeight: 600,
        }}>
          🔥 {streakCount}
        </div>
        <button onClick={onOpenSettings} aria-label="Settings" title="Settings" style={{
          width: 36, height: 36, borderRadius: "50%", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-muted)", background: "var(--surface)",
        }}>
          <Icon name="gear" size={18} />
          {needsAttention && (
            <span style={{
              position: "absolute", top: 1, right: 1, width: 10, height: 10,
              borderRadius: "50%", background: "var(--amber)", border: "2px solid var(--card)",
            }} />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab, focusCount, powerupWaiting }) {
  const tabs = [
    { id: "traits",  label: "Traits",  icon: "traits" },
    { id: "review",  label: "Review",  icon: "review" },
    { id: "powerup", label: "Powerup", icon: "powerup" },
    { id: "log",     label: "Log",     icon: "log" },
  ];
  return (
    <nav style={{
      height: "calc(var(--nav-h) + var(--safe-b))", paddingBottom: "var(--safe-b)",
      background: "var(--card)", borderTop: "1px solid var(--border)",
      display: "flex", flexShrink: 0,
    }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={active ? "page" : undefined} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "4px",
            color: active ? "var(--green)" : "var(--text-muted)",
            position: "relative", transition: "color 0.15s",
          }}>
            <Icon name={t.icon} size={22} filled={t.icon === "review" || t.icon === "powerup"} />
            <span style={{ fontSize: "11px", fontWeight: 600 }}>{t.label}</span>
            {t.id === "review" && focusCount > 0 && (
              <span style={{
                position: "absolute", top: "8px", right: "calc(50% - 20px)",
                background: "var(--green-solid)", color: "#fff",
                borderRadius: "999px", fontSize: "10px", fontWeight: 700,
                padding: "1px 5px", minWidth: "16px", textAlign: "center",
              }}>{focusCount}</span>
            )}
            {t.id === "powerup" && powerupWaiting && (
              <span aria-label="New Powerup" style={{
                position: "absolute", top: "10px", right: "calc(50% - 16px)",
                width: 8, height: 8, borderRadius: "50%", background: "var(--amber)",
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Trait Card ───────────────────────────────────────────────────────────────
function scoreBarColor(score) {
  return score >= 70 ? "var(--green)" : score >= 40 ? "var(--amber)" : "var(--red)";
}

function ScoreBar({ score }) {
  return (
    <span style={{ display: "block", background: "var(--surface)", borderRadius: "999px", height: "6px", overflow: "hidden" }}>
      <span style={{
        display: "block", width: `${score}%`, height: "100%",
        background: scoreBarColor(score), borderRadius: "999px",
        transition: "width 0.4s ease",
      }} />
    </span>
  );
}

function CategoryChip({ category }) {
  const col = categoryColor(category);
  return (
    <span style={{
      fontSize: "11px", fontWeight: 600, color: col.accent,
      background: col.bg, border: `1px solid ${fade(col.accent, 27)}`,
      borderRadius: "999px", padding: "1px 7px", display: "inline-block",
    }}>{category}</span>
  );
}

function TraitCard({ trait, isFocus, onToggle, onDetails }) {
  const col = categoryColor(trait.category);

  return (
    <div style={{ position: "relative", animation: "fadeIn 0.2s ease" }}>
      <button
        aria-pressed={isFocus}
        onClick={onToggle}
        style={{
          display: "block", width: "100%", textAlign: "left",
          background: isFocus ? col.bg : "var(--card)",
          border: `2px solid ${isFocus ? col.accent : "var(--border)"}`,
          borderRadius: "14px", padding: "14px 14px 12px",
          transition: "all 0.18s",
          boxShadow: isFocus ? `0 0 0 3px ${fade(col.accent, 13)}` : "var(--shadow-card)",
        }}
      >
        <span style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          marginBottom: "10px", paddingRight: "30px",
        }}>
          <span>
            <span style={{ display: "block", fontWeight: 600, fontSize: "15px", color: "var(--text)" }}>{trait.name}</span>
            <span style={{ display: "block", marginTop: "3px" }}><CategoryChip category={trait.category} /></span>
          </span>
          <span style={{ textAlign: "right" }}>
            <span style={{ ...headingStyle, display: "block", fontSize: "22px", lineHeight: 1 }}>
              {trait.score}
            </span>
            {isFocus && (
              <span style={{ display: "block", fontSize: "10px", color: col.accent, fontWeight: 700, marginTop: "2px" }}>FOCUS</span>
            )}
          </span>
        </span>
        <ScoreBar score={trait.score} />
      </button>
      <button
        aria-label={`Details for ${trait.name}`}
        onClick={onDetails}
        style={{
          position: "absolute", top: "6px", right: "4px", width: 36, height: 36, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-faint)",
        }}
      >
        <Icon name="more" size={18} filled />
      </button>
    </div>
  );
}

// ─── Trait details ────────────────────────────────────────────────────────────
function TraitDetailSheet({ trait, isFocus, log, today, onClose, onToggleFocus, onRemove }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const isCustom = !DEFAULT_TRAITS.some(d => d.id === trait.id);
  const reviews = log
    .filter(e => (e.traitId ? e.traitId === trait.id : e.trait === trait.name))
    .slice(0, 5);
  const untilDecay = daysUntilDecay(trait, isFocus, today);

  let decayText;
  if (!trait.lastReviewed) decayText = "No decay until its first review.";
  else if (isFocus) decayText = "Paused while this is a focus trait.";
  else decayText = `Loses 1 point in ${untilDecay} day${untilDecay === 1 ? "" : "s"} unless you review it.`;

  const row = { display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", fontSize: "14px" };

  return (
    <Sheet label={`${trait.name} details`} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div style={{ ...headingStyle, fontSize: "22px", marginBottom: "6px" }}>{trait.name}</div>
          <CategoryChip category={trait.category} />
        </div>
        <div style={{ ...headingStyle, fontSize: "34px", lineHeight: 1 }}>{trait.score}</div>
      </div>
      <ScoreBar score={trait.score} />

      <div style={{ marginTop: "14px", borderTop: "1px solid var(--border)" }}>
        <div style={{ ...row, borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text-muted)" }}>Last reviewed</span>
          <span style={{ fontWeight: 600 }}>{trait.lastReviewed ? formatDay(trait.lastReviewed, today) : "Never"}</span>
        </div>
        <div style={{ ...row, borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>Decay</span>
          <span style={{ fontWeight: 600, textAlign: "right" }}>{decayText}</span>
        </div>
      </div>

      <div style={{ ...labelStyle, margin: "18px 0 6px" }}>Recent reviews</div>
      {reviews.length === 0 ? (
        <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>Not reviewed yet.</div>
      ) : reviews.map((e, i) => (
        <div key={i} style={{ ...row, padding: "6px 0" }}>
          <span style={{ color: "var(--text-2)" }}>
            {formatDay(e.date, today)}
            <span style={{ color: "var(--text-muted)" }}> · {SCORE_OPTIONS.find(o => o.val === e.score)?.label || "Review"}</span>
          </span>
          <span style={{ fontWeight: 700, color: deltaColor(e.delta) }}>{deltaLabel(e.delta)}</span>
        </div>
      ))}

      <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
        <button onClick={onClose} style={{ ...secondaryButton, flex: 1 }}>Close</button>
        <button onClick={() => { onToggleFocus(); onClose(); }} style={{ ...primaryButton, flex: 2 }}>
          {isFocus ? "Remove from focus" : "Add to focus"}
        </button>
      </div>
      {isCustom && (
        <button
          onClick={() => (confirmRemove ? onRemove() : setConfirmRemove(true))}
          style={{
            width: "100%", marginTop: "10px", padding: "12px", borderRadius: "12px",
            fontSize: "14px", fontWeight: 700, color: "var(--red)",
            background: confirmRemove ? "var(--red-light)" : "transparent",
          }}
        >
          {confirmRemove ? "Tap again to remove this trait" : "Remove this trait"}
        </button>
      )}
    </Sheet>
  );
}

function deltaColor(n) {
  if (n > 0) return "var(--green)";
  if (n < 0) return "var(--red)";
  return "var(--text-muted)";
}

function deltaLabel(n) {
  return (n > 0 ? "+" : "") + n + " pts";
}

// ─── Traits Tab ───────────────────────────────────────────────────────────────
function TraitsTab({ traits, focus, log, today, onToggleFocus, onAddTrait, onRemoveTrait, onGoReview }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScore, setNewScore] = useState(50);
  const [newCat, setNewCat] = useState("Core");
  const [filterCat, setFilterCat] = useState("All");
  const [detailId, setDetailId] = useState(null);

  const filtered = filterCat === "All" ? traits : traits.filter(t => t.category === filterCat);
  const groups = filterCat === "All"
    ? CATEGORIES.map(c => ({ cat: c, items: traits.filter(t => t.category === c) })).filter(g => g.items.length)
    : [{ cat: filterCat, items: filtered }];
  const detailTrait = detailId ? traits.find(t => t.id === detailId) : null;

  function closeAdd() {
    setNewName(""); setNewScore(50); setNewCat("Core"); setShowAdd(false);
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddTrait({ name: newName.trim(), category: newCat, score: newScore });
    closeAdd();
  }

  return (
    <div className="scroll-area" style={{ padding: "16px" }}>
      {/* Filter pills */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", marginBottom: "16px" }}>
        {["All", ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilterCat(c)} style={{
            flexShrink: 0, padding: "6px 14px", borderRadius: "999px",
            fontSize: "13px", fontWeight: 600,
            background: filterCat === c ? "var(--inverse-bg)" : "var(--card)",
            color: filterCat === c ? "var(--inverse-text)" : "var(--text-muted)",
            border: `1px solid ${filterCat === c ? "var(--inverse-bg)" : "var(--border)"}`,
            transition: "all 0.15s",
          }}>{c}</button>
        ))}
      </div>

      {/* Trait groups */}
      {groups.map(({ cat, items }) => (
        <div key={cat} style={{ marginBottom: "20px" }}>
          <div style={{ ...labelStyle, letterSpacing: "0.08em", marginBottom: "8px" }}>
            {cat}
          </div>
          {items.length === 0 && (
            <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>No traits in this category yet.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map(t => (
              <TraitCard
                key={t.id}
                trait={t}
                isFocus={focus.includes(t.id)}
                onToggle={() => onToggleFocus(t.id)}
                onDetails={() => setDetailId(t.id)}
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
          position: "fixed", bottom: "calc(var(--nav-h) + var(--safe-b) + 16px)", left: "50%",
          transform: "translateX(-50%)", zIndex: 100,
          animation: "slideUp 0.2s ease",
        }}>
          <button onClick={onGoReview} style={{
            background: "var(--green-solid)", color: "#fff",
            padding: "14px 28px", borderRadius: "999px",
            fontSize: "15px", fontWeight: 700,
            boxShadow: "0 4px 20px var(--green-glow)",
            whiteSpace: "nowrap",
          }}>
            Review {focus.length} trait{focus.length > 1 ? "s" : ""} →
          </button>
        </div>
      )}

      {/* Add trait sheet */}
      {showAdd && (
        <Sheet label="Add trait" onClose={closeAdd}>
          <form onSubmit={handleAdd}>
            <div style={{ ...headingStyle, fontSize: "20px", marginBottom: "20px" }}>
              Add Trait
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="new-trait-name" style={labelStyle}>Name</label>
              <input id="new-trait-name" className="lu-input" value={newName} maxLength={60}
                onChange={e => setNewName(e.target.value)} placeholder="e.g. Mindfulness" />
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="new-trait-category" style={labelStyle}>Category</label>
              <select id="new-trait-category" className="lu-input" value={newCat} onChange={e => setNewCat(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="new-trait-score" style={labelStyle}>
                Starting Score: <span style={{ color: "var(--text)" }}>{newScore}</span>
              </label>
              <input id="new-trait-score" type="range" min={0} max={100} value={newScore}
                onChange={e => setNewScore(Number(e.target.value))}
                style={{ display: "block", width: "100%", marginTop: "8px", accentColor: "var(--green)" }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={closeAdd} style={{ ...secondaryButton, flex: 1 }}>Cancel</button>
              <button type="submit" style={{ ...primaryButton, flex: 2 }}>Add Trait</button>
            </div>
          </form>
        </Sheet>
      )}

      {detailTrait && (
        <TraitDetailSheet
          trait={detailTrait}
          isFocus={focus.includes(detailTrait.id)}
          log={log}
          today={today}
          onClose={() => setDetailId(null)}
          onToggleFocus={() => onToggleFocus(detailTrait.id)}
          onRemove={() => { setDetailId(null); onRemoveTrait(detailTrait.id); }}
        />
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
      <EmptyState icon="traits" title="No Focus Traits">
        Go to Traits and tap up to {MAX_FOCUS} traits you want to work on today.
      </EmptyState>
    );
  }

  const allScored = focusTraits.every(t => scores[t.id] !== undefined);

  return (
    <div className="scroll-area" style={{ padding: "16px" }}>
      <div style={{ ...headingStyle, fontSize: "22px", marginBottom: "4px" }}>
        Daily Review
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>
        Score yourself honestly on each focus trait.
      </div>

      {focusTraits.map(trait => {
        const col = categoryColor(trait.category);
        const selected = scores[trait.id];
        const selectedOpt = SCORE_OPTIONS.find(o => o.val === selected);
        return (
          <div key={trait.id} style={{
            background: "var(--card)", border: "1.5px solid var(--border)",
            borderRadius: "16px", padding: "16px", marginBottom: "14px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "17px" }}>{trait.name}</div>
                <div style={{ fontSize: "12px", color: col.accent, fontWeight: 600 }}>{trait.category}</div>
              </div>
              <div style={{ ...headingStyle, fontSize: "26px" }}>{trait.score}</div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {SCORE_OPTIONS.map(opt => {
                const isSelected = selected === opt.val;
                return (
                  <button
                    key={opt.val}
                    aria-label={`${trait.name}: ${opt.val}, ${opt.label}`}
                    aria-pressed={isSelected}
                    onClick={() => setScores(s => ({ ...s, [trait.id]: opt.val }))}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: "10px",
                      fontSize: "18px", fontWeight: 800,
                      background: isSelected ? opt.color : "var(--surface)",
                      color: isSelected ? "#fff" : "var(--text-faint)",
                      border: `2px solid ${isSelected ? opt.color : "transparent"}`,
                      transition: "all 0.15s",
                      animation: isSelected ? "pop 0.2s ease" : "none",
                    }}
                  >
                    {opt.val}
                  </button>
                );
              })}
            </div>
            {selectedOpt && (
              <div style={{
                marginTop: "10px", padding: "8px 12px", borderRadius: "8px",
                background: selected >= 4 ? "var(--green-light)" : selected === 3 ? "var(--surface)" : "var(--red-light)",
                fontSize: "13px", fontWeight: 600,
                color: selected >= 4 ? "var(--green-strong)" : selected === 3 ? "var(--text-muted)" : "var(--red)",
              }}>
                {selectedOpt.label} &nbsp;·&nbsp; {deltaLabel(selectedOpt.delta)}
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
          background: allScored ? "var(--green-solid)" : "var(--border)",
          color: allScored ? "#fff" : "var(--text-faint)",
          fontSize: "16px", fontWeight: 700, marginTop: "4px",
          transition: "all 0.2s",
        }}
      >
        Commit Review
      </button>

      {/* Score legend */}
      <div style={{ marginTop: "20px", padding: "16px", background: "var(--surface-2)", borderRadius: "12px" }}>
        <div style={{ ...labelStyle, marginBottom: "10px" }}>
          Score Guide
        </div>
        {SCORE_OPTIONS.map(opt => (
          <div key={opt.val} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px" }}>
            <span style={{ fontWeight: 700, color: `var(--score-${opt.val})` }}>{opt.val} — {opt.label}</span>
            <span style={{ color: deltaColor(opt.delta), fontWeight: 700 }}>
              {deltaLabel(opt.delta)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Powerup Tab ──────────────────────────────────────────────────────────────
function PowerupBody({ entry }) {
  const block = { fontSize: "15px", lineHeight: 1.6, color: "var(--text-2)" };
  return (
    <>
      <p style={block}>{entry.lesson}</p>

      <div style={{
        marginTop: "16px", padding: "14px", borderRadius: "12px",
        background: "var(--green-light)", border: `1px solid ${fade("var(--green)", 30)}`,
      }}>
        <div style={{ ...labelStyle, color: "var(--green-strong)", marginBottom: "6px" }}>Today's move</div>
        <div style={{ fontSize: "15px", lineHeight: 1.5, fontWeight: 600, color: "var(--text)" }}>{entry.action}</div>
      </div>

      <div style={{ marginTop: "12px", padding: "14px", borderRadius: "12px", background: "var(--surface-2)" }}>
        <div style={{ ...labelStyle, marginBottom: "6px" }}>Reflect tonight</div>
        <div style={{ fontSize: "15px", lineHeight: 1.5, fontStyle: "italic", color: "var(--text-2)" }}>{entry.reflection}</div>
      </div>
    </>
  );
}

function PowerupSkeleton({ onSkip }) {
  const bar = (width, height = 14) => (
    <div className="lu-skeleton" style={{ width, height, marginBottom: "10px" }} />
  );
  return (
    <div aria-busy="true" aria-label="Writing your lesson">
      {bar("70%", 24)}
      <div style={{ height: "8px" }} />
      {bar("100%")}{bar("96%")}{bar("100%")}{bar("88%")}{bar("60%")}
      <div className="lu-skeleton" style={{ width: "100%", height: 76, borderRadius: 12, marginTop: "16px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Writing a lesson for you…</span>
        <button onClick={onSkip} style={{ fontSize: "13px", fontWeight: 700, color: "var(--green)", padding: "6px 0" }}>
          Use a built-in lesson
        </button>
      </div>
    </div>
  );
}

function PowerupTab({
  entry, history, traits, focus, today, aiEnabled, aiBusy, aiNote, showSignInHint,
  onDone, onNewLesson, onRequestAi, onSkipAi, onAddFocus, onOpenSettings,
}) {
  const [openId, setOpenId] = useState(null);

  // First visit of the day with AI switched on: swap the built-in lesson for a personal one.
  const wantsAi = Boolean(aiEnabled && entry && entry.source === "library" && !entry.done && !entry.aiTried);
  useEffect(() => {
    if (wantsAi) onRequestAi();
  }, [wantsAi, onRequestAi]);

  if (!entry) {
    return (
      <EmptyState icon="powerup" title="No Powerup yet">
        Add a trait on the Traits tab and your first lesson will show up here.
      </EmptyState>
    );
  }

  const trait = traits.find(t => t.id === entry.traitId);
  const col = categoryColor(entry.category);
  const inFocus = focus.includes(entry.traitId);
  const doneDates = new Set([entry, ...history].filter(p => p.done).map(p => p.date));
  const week = [6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
    const date = addDays(today, -daysAgo);
    return { date, done: doneDates.has(date), label: formatDate(date, { weekday: "narrow" }) };
  });
  const loading = aiBusy || wantsAi;

  return (
    <div className="scroll-area" style={{ padding: "16px" }}>
      <div style={{ ...headingStyle, fontSize: "22px", marginBottom: "4px" }}>Today's Powerup</div>
      <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "14px" }}>
        One short lesson a day, aimed at your lowest traits.
      </div>

      {/* The last seven days: filled when that day's Powerup was done */}
      <div aria-label={`${week.filter(d => d.done).length} of the last 7 Powerups done`} style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {week.map(d => (
          <div key={d.date} style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              height: "6px", borderRadius: "999px",
              background: d.done ? "var(--green)" : "var(--border)",
              outline: d.date === today && !d.done ? "1.5px solid var(--text-faint)" : "none",
            }} />
            <div style={{
              fontSize: "10px", fontWeight: 700, marginTop: "4px",
              color: d.date === today ? "var(--text)" : "var(--text-faint)",
            }}>{d.label}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: "var(--card)", border: `1.5px solid ${entry.done ? fade("var(--green)", 45) : "var(--border)"}`,
        borderRadius: "16px", padding: "18px 16px", boxShadow: "var(--shadow-card)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "8px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "12px", fontWeight: 700, color: col.accent,
            background: col.bg, border: `1px solid ${fade(col.accent, 27)}`,
            borderRadius: "999px", padding: "3px 10px",
          }}>
            {entry.traitName}{trait ? ` · ${trait.score}` : ""}
          </div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.06em" }}>
            {loading ? "" : entry.source === "ai" ? "✦ WRITTEN FOR YOU" : "BUILT-IN LESSON"}
          </div>
        </div>

        {loading ? (
          <PowerupSkeleton onSkip={onSkipAi} />
        ) : (
          <>
            <div style={{ ...headingStyle, fontSize: "21px", lineHeight: 1.25, marginBottom: "10px" }}>
              {entry.title}
            </div>
            <PowerupBody entry={entry} />

            {aiNote && (
              <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--text-muted)" }}>{aiNote}</div>
            )}

            {entry.done ? (
              <div style={{
                marginTop: "16px", padding: "12px 14px", borderRadius: "12px",
                background: "var(--green-light)", color: "var(--green-strong)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontSize: "14px", fontWeight: 700,
              }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <Icon name="check" size={18} strokeWidth={3} /> Done for today
                </span>
                <button onClick={() => onDone(false)} style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
                  Undo
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button onClick={onNewLesson} style={{ ...secondaryButton, flex: 1 }}>New lesson</button>
                <button onClick={() => onDone(true)} style={{ ...primaryButton, flex: 2 }}>I did it</button>
              </div>
            )}

            {trait && (
              <button
                onClick={() => !inFocus && onAddFocus(entry.traitId)}
                disabled={inFocus}
                style={{
                  width: "100%", marginTop: "10px", padding: "12px", borderRadius: "12px",
                  fontSize: "14px", fontWeight: 600,
                  color: inFocus ? "var(--text-muted)" : col.accent,
                  border: `1.5px solid ${inFocus ? "var(--border)" : fade(col.accent, 40)}`,
                }}
              >
                {inFocus ? `${entry.traitName} is in today's focus` : `Add ${entry.traitName} to today's review`}
              </button>
            )}
          </>
        )}
      </div>

      {showSignInHint && (
        <button onClick={onOpenSettings} style={{
          width: "100%", marginTop: "12px", padding: "12px 14px", borderRadius: "12px",
          background: "var(--surface-2)", border: "1px dashed var(--border)",
          fontSize: "13px", color: "var(--text-muted)", textAlign: "left", lineHeight: 1.4,
        }}>
          <span style={{ fontWeight: 700, color: "var(--text-2)" }}>✦ Want lessons written for you?</span>{" "}
          Sign in from Settings to turn on AI Powerups.
        </button>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ ...labelStyle, letterSpacing: "0.08em", marginBottom: "10px" }}>Earlier</div>
          {history.map(p => {
            const isOpen = openId === p.id;
            return (
              <div key={p.id} style={{ marginBottom: "10px" }}>
                <button
                  onClick={() => setOpenId(isOpen ? null : p.id)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px",
                    padding: "12px 14px", background: "var(--card)", textAlign: "left",
                    border: "1.5px solid var(--border)", borderRadius: isOpen ? "12px 12px 0 0" : "12px",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: "14px", color: "var(--text)" }}>{p.title}</span>
                    <span style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {formatDay(p.date, today)} · {p.traitName}
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, color: p.done ? "var(--green)" : "var(--text-faint)" }}>
                    {p.done && <Icon name="check" size={16} strokeWidth={3} />}
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isOpen ? "▾" : "▸"}</span>
                  </span>
                </button>
                {isOpen && (
                  <div style={{
                    background: "var(--surface-2)", border: "1.5px solid var(--border)", borderTop: "none",
                    borderRadius: "0 0 12px 12px", padding: "14px",
                  }}>
                    <PowerupBody entry={p} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────
function netDelta(entries) {
  return entries.reduce((sum, e) => sum + e.delta, 0);
}

// One collapsible row in the log: a day, week, month, or year.
function LogGroup({ title, entries, isOpen, onToggle, isYear, padded, children }) {
  const net = netDelta(entries);
  return (
    <div style={{ marginBottom: "10px" }}>
      <button onClick={onToggle} aria-expanded={isOpen} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px", background: isYear ? "var(--surface-2)" : "var(--card)",
        border: "1.5px solid var(--border)", borderRadius: isOpen ? "12px 12px 0 0" : "12px",
        textAlign: "left",
      }}>
        <span style={isYear
          ? { ...headingStyle, fontSize: "16px" }
          : { fontWeight: 700, fontSize: "14px", color: "var(--text)" }}>
          {title}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: deltaColor(net) }}>
            {deltaLabel(net)}
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {entries.length} review{entries.length !== 1 ? "s" : ""}
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{isOpen ? "▾" : "▸"}</span>
        </span>
      </button>
      {isOpen && (
        <div style={{
          background: "var(--surface-2)", border: "1.5px solid var(--border)",
          borderTop: "none", borderRadius: "0 0 12px 12px",
          padding: padded ? "10px" : 0, overflow: "hidden",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function LogTab({ log, today }) {
  const [expanded, setExpanded] = useState({});

  if (log.length === 0) {
    return (
      <EmptyState icon="log" title="No entries yet">
        Complete your first review to start tracking progress.
      </EmptyState>
    );
  }

  // ── Build structure ──────────────────────────────────────────────────────────
  const byDate = {};
  log.forEach(entry => {
    if (!byDate[entry.date]) byDate[entry.date] = [];
    byDate[entry.date].push(entry);
  });
  const newestFirst = (a, b) => b.localeCompare(a);
  const allDates = Object.keys(byDate).sort(newestFirst);

  const recentCutoff = addDays(today, -7);
  const recentDates = allDates.filter(d => d >= recentCutoff);
  const olderDates  = allDates.filter(d => d < recentCutoff);

  // Older days are grouped by week, weeks by month, months by year.
  const byWeek = {};
  olderDates.forEach(d => {
    const wk = weekStartOf(d);
    if (!byWeek[wk]) byWeek[wk] = [];
    byWeek[wk].push(d);
  });
  const allWeeks = Object.keys(byWeek).sort(newestFirst);

  const byMonth = {};
  allWeeks.forEach(wk => {
    const mk = wk.slice(0, 7);
    if (!byMonth[mk]) byMonth[mk] = [];
    byMonth[mk].push(wk);
  });
  const allMonths = Object.keys(byMonth).sort(newestFirst);

  const byYear = {};
  allMonths.forEach(mk => {
    const yr = mk.slice(0, 4);
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(mk);
  });
  const allYears = Object.keys(byYear).sort(newestFirst);

  const useYears = allMonths.length > 12;
  const useMonths = allWeeks.length >= 5;

  const weekEntries = wk => (byWeek[wk] || []).flatMap(d => byDate[d] || []);
  const monthEntries = mk => (byMonth[mk] || []).flatMap(weekEntries);
  const yearEntries = yr => (byYear[yr] || []).flatMap(monthEntries);

  // ── Render helpers ───────────────────────────────────────────────────────────
  function groupProps(key, openByDefault = false) {
    const isOpen = expanded[key] !== undefined ? expanded[key] : openByDefault;
    return { isOpen, onToggle: () => setExpanded(prev => ({ ...prev, [key]: !isOpen })) };
  }

  function renderDay(dateStr, openByDefault) {
    const entries = byDate[dateStr] || [];
    return (
      <LogGroup key={dateStr} title={formatDay(dateStr, today)} entries={entries} {...groupProps("day-" + dateStr, openByDefault)}>
        {entries.map((e, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px",
            borderTop: i > 0 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-2)" }}>{e.trait}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                fontSize: "12px", fontWeight: 700,
                color: deltaColor(e.delta),
                background: e.delta > 0 ? "var(--green-light)" : e.delta < 0 ? "var(--red-light)" : "var(--surface)",
                padding: "2px 8px", borderRadius: "999px",
              }}>
                {deltaLabel(e.delta)}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {SCORE_OPTIONS.find(o => o.delta === e.delta && o.val === e.score)?.label || ""}
              </span>
            </div>
          </div>
        ))}
      </LogGroup>
    );
  }

  function renderWeek(wk) {
    const title = "Week of " + formatDate(wk, { month: "short", day: "numeric" });
    return (
      <LogGroup key={wk} title={title} entries={weekEntries(wk)} padded {...groupProps("week-" + wk)}>
        {(byWeek[wk] || []).map(d => renderDay(d, false))}
      </LogGroup>
    );
  }

  function renderMonth(mk) {
    const title = formatDate(mk + "-01", { month: "long", year: "numeric" });
    return (
      <LogGroup key={mk} title={title} entries={monthEntries(mk)} padded {...groupProps("month-" + mk)}>
        {(byMonth[mk] || []).map(renderWeek)}
      </LogGroup>
    );
  }

  function renderYear(yr) {
    return (
      <LogGroup key={yr} title={yr} entries={yearEntries(yr)} isYear padded {...groupProps("year-" + yr)}>
        {(byYear[yr] || []).map(renderMonth)}
      </LogGroup>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="scroll-area" style={{ padding: "16px" }}>
      <div style={{ ...headingStyle, fontSize: "22px", marginBottom: "4px" }}>
        Progress Log
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>
        {log.length} total review{log.length !== 1 ? "s" : ""}
      </div>

      {/* Recent days — always visible */}
      {recentDates.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          {recentDates.map(d => renderDay(d, d === today))}
        </div>
      )}

      {/* Older history */}
      {olderDates.length > 0 && (
        <div>
          <div style={{ ...labelStyle, letterSpacing: "0.08em", marginBottom: "10px" }}>
            Earlier
          </div>

          {useYears
            ? allYears.map(renderYear)
            : useMonths
              ? allMonths.map(renderMonth)
              : allWeeks.map(renderWeek)
          }
        </div>
      )}
    </div>
  );
}

// ─── Account (sign in / sign up / password reset) ─────────────────────────────
function authErrorText(error) {
  const message = (error && error.message) || "";
  if (/invalid login credentials/i.test(message)) return "Wrong email or password.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first. Check your inbox for the link.";
  if (/already registered/i.test(message)) return "That email already has an account. Try signing in.";
  if (/failed to fetch|network|load failed/i.test(message)) return "Couldn't reach the server. Check your connection.";
  return message || "Something went wrong. Try again.";
}

function FormMessage({ message }) {
  if (!message) return null;
  const isError = message.kind === "error";
  return (
    <div role={isError ? "alert" : "status"} style={{
      marginBottom: "12px", padding: "10px 12px", borderRadius: "10px", fontSize: "13px", lineHeight: 1.4,
      background: isError ? "var(--red-light)" : "var(--green-light)",
      color: isError ? "var(--red)" : "var(--green-strong)", fontWeight: 600,
    }}>
      {message.text}
    </div>
  );
}

function AuthForm() {
  const [mode, setMode] = useState("signin"); // signin | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  function switchMode(next) {
    setMode(next);
    setMessage(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const address = email.trim();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: address, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: address, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        const alreadyExists = data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
        if (alreadyExists) {
          setMessage({ kind: "error", text: "That email already has an account. Try signing in." });
        } else if (!data.session) {
          setMode("signin");
          setPassword("");
          setMessage({ kind: "info", text: "Almost there. Open the confirmation link we emailed you, then sign in here." });
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: window.location.origin });
        if (error) throw error;
        setMessage({ kind: "info", text: "If that email has an account, a reset link is on its way." });
      }
    } catch (error) {
      setMessage({ kind: "error", text: authErrorText(error) });
    } finally {
      setBusy(false);
    }
  }

  const submitLabel = mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Email me a reset link";
  const linkStyle = { fontSize: "13px", fontWeight: 700, color: "var(--green)", padding: "4px 0" };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "12px" }}>
        {mode === "forgot"
          ? "Enter your email and we'll send a link to set a new password."
          : "Sign in to back up your progress, use it on more than one device, and get AI-written Powerups."}
      </div>
      <FormMessage message={message} />
      <div style={{ marginBottom: "10px" }}>
        <label htmlFor="auth-email" style={labelStyle}>Email</label>
        <input id="auth-email" className="lu-input" type="email" required autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      {mode !== "forgot" && (
        <div style={{ marginBottom: "14px" }}>
          <label htmlFor="auth-password" style={labelStyle}>Password</label>
          <input id="auth-password" className="lu-input" type="password" required minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 6 characters" : ""} />
        </div>
      )}
      <button type="submit" disabled={busy} style={{ ...primaryButton, width: "100%", opacity: busy ? 0.6 : 1 }}>
        {busy ? "One moment…" : submitLabel}
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
        {mode === "signin" ? (
          <>
            <button type="button" style={linkStyle} onClick={() => switchMode("signup")}>Create an account</button>
            <button type="button" style={linkStyle} onClick={() => switchMode("forgot")}>Forgot password?</button>
          </>
        ) : (
          <button type="button" style={linkStyle} onClick={() => switchMode("signin")}>Back to sign in</button>
        )}
      </div>
    </form>
  );
}

// Shown after someone opens the password-reset link from their email.
function NewPasswordForm({ onDone }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMessage({ kind: "error", text: authErrorText(error) });
    else onDone();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "12px" }}>
        Choose a new password for your account.
      </div>
      <FormMessage message={message} />
      <label htmlFor="new-password" style={labelStyle}>New password</label>
      <input id="new-password" className="lu-input" type="password" required minLength={6} autoComplete="new-password"
        value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
      <button type="submit" disabled={busy} style={{ ...primaryButton, width: "100%", marginTop: "14px", opacity: busy ? 0.6 : 1 }}>
        {busy ? "One moment…" : "Save new password"}
      </button>
    </form>
  );
}

function syncStatusText(sync, online) {
  if (sync.status === "syncing") return "Syncing…";
  if (sync.status === "conflict") return "Paused. Choose which data to keep.";
  if (!online || sync.status === "offline") return "Offline. Changes will sync when you're back online.";
  if (sync.status === "error") return "Couldn't sync. Will try again.";
  if (sync.at) return `Synced ${timeAgo(sync.at)}`;
  return "Not synced yet";
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsSection({ title, children }) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ ...labelStyle, letterSpacing: "0.08em", marginBottom: "10px" }}>{title}</div>
      {children}
    </div>
  );
}

function SettingsRow({ title, detail, action, onClick, tone }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px",
      padding: "12px 0", borderTop: "1px solid var(--border)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>{title}</div>
        {detail && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px", lineHeight: 1.4 }}>{detail}</div>}
      </div>
      <button onClick={onClick} style={{
        flexShrink: 0, padding: "8px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: 700,
        background: tone === "danger" ? "var(--red-light)" : "var(--surface)",
        color: tone === "danger" ? "var(--red)" : "var(--text-2)",
      }}>
        {action}
      </button>
    </div>
  );
}

const BACKUP_REASONS = {
  reset: "before a reset",
  import: "before restoring a file",
  cloud: "before cloud data replaced it",
  repair: "before points were restored",
  restore: "before the last undo",
};

function SettingsSheet({
  onClose, settings, onChangeSettings, session, sync, online, recovery, onRecoveryDone,
  onSyncNow, onSignOut, onExport, onImport, backup, onRestoreBackup, onRecheckRepair, onReset,
}) {
  const fileInput = useRef(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [importError, setImportError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      setImportError(null);
      setPendingImport(parseBackupFile(await file.text()));
    } catch (error) {
      setImportError(error.message);
    }
  }

  const themes = [
    { id: "system", label: "System" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
  ];
  const backupDate = backup
    ? new Date(backup.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <Sheet label="Settings" onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ ...headingStyle, fontSize: "22px" }}>Settings</div>
        <button onClick={onClose} aria-label="Close settings" style={{
          width: 36, height: 36, borderRadius: "50%", background: "var(--surface)", color: "var(--text-muted)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="close" size={18} />
        </button>
      </div>

      <SettingsSection title="Account">
        {!supabase ? (
          <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Cloud sync isn't connected yet. Everything is saved on this device only, so download a backup now and then.
          </div>
        ) : recovery ? (
          <NewPasswordForm onDone={onRecoveryDone} />
        ) : !session ? (
          <AuthForm />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", background: "var(--green-light)", color: "var(--green-strong)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon name="cloud" size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "15px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.user.email}
                </div>
                <div style={{ fontSize: "12px", color: sync.status === "error" || sync.status === "conflict" ? "var(--amber)" : "var(--text-muted)", marginTop: "2px" }}>
                  {syncStatusText(sync, online)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", margin: "12px 0 4px" }}>
              <button onClick={onSyncNow} disabled={sync.status === "syncing"} style={{ ...secondaryButton, flex: 1, padding: "11px" }}>Sync now</button>
              <button onClick={onSignOut} style={{ ...secondaryButton, flex: 1, padding: "11px" }}>Sign out</button>
            </div>
            <SettingsRow
              title="AI Powerups"
              detail="A lesson written for you each day. Turn off to use built-in lessons only."
              action={settings.aiPowerups ? "On" : "Off"}
              onClick={() => onChangeSettings({ aiPowerups: !settings.aiPowerups })}
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Appearance">
        <div role="radiogroup" aria-label="Theme" style={{ display: "flex", background: "var(--surface)", borderRadius: "12px", padding: "4px" }}>
          {themes.map(t => {
            const active = settings.theme === t.id;
            return (
              <button key={t.id} role="radio" aria-checked={active} onClick={() => onChangeSettings({ theme: t.id })} style={{
                flex: 1, padding: "9px 0", borderRadius: "9px", fontSize: "14px", fontWeight: 700,
                background: active ? "var(--card)" : "transparent",
                color: active ? "var(--text)" : "var(--text-muted)",
                boxShadow: active ? "var(--shadow-card)" : "none",
              }}>{t.label}</button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="Your data">
        <SettingsRow title="Download a backup" detail="Saves everything to a file you keep." action="Download" onClick={onExport} />
        <SettingsRow title="Restore from a backup file" detail="Replaces what's on this device." action="Choose file" onClick={() => fileInput.current && fileInput.current.click()} />
        <input ref={fileInput} type="file" accept="application/json,.json" onChange={handleFile} style={{ display: "none" }} aria-label="Backup file" />
        {importError && (
          <div role="alert" style={{ fontSize: "13px", fontWeight: 600, color: "var(--red)", paddingBottom: "10px" }}>{importError}</div>
        )}
        {backup && (
          <SettingsRow
            title="Undo the last replace"
            detail={`Safety copy from ${backupDate}, saved ${BACKUP_REASONS[backup.reason] || "automatically"}.`}
            action="Undo"
            onClick={onRestoreBackup}
          />
        )}
        <SettingsRow
          title="Check for lost points"
          detail="An old bug charged decay too often. This rebuilds scores from your log."
          action="Check"
          onClick={onRecheckRepair}
        />
      </SettingsSection>

      <SettingsSection title="Danger zone">
        <SettingsRow title="Reset everything" detail="Clears scores, streak, log, and Powerups." action="Reset" tone="danger" onClick={onReset} />
      </SettingsSection>

      <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-faint)" }}>
        LevelUp v{APP_VERSION}
      </div>

      {pendingImport && (
        <Dialog label="Restore backup" onClose={() => setPendingImport(null)} zIndex={400}>
          <div style={{ ...headingStyle, fontSize: "20px", marginBottom: "10px" }}>Restore this backup?</div>
          <div style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.5, marginBottom: "20px" }}>
            The file has {pendingImport.traits.length} traits and {pendingImport.log.length} review{pendingImport.log.length === 1 ? "" : "s"}.
            It will replace everything on this device. You can undo this from Settings.
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setPendingImport(null)} style={{ ...secondaryButton, flex: 1 }}>Cancel</button>
            <button onClick={() => { onImport(pendingImport); setPendingImport(null); }} style={{ ...primaryButton, flex: 1 }}>Restore</button>
          </div>
        </Dialog>
      )}
    </Sheet>
  );
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────
function ResetModal({ onConfirm, onCancel }) {
  return (
    <Dialog label="Reset everything" onClose={onCancel} zIndex={400}>
      <div style={{ ...headingStyle, fontSize: "22px", marginBottom: "10px" }}>
        Reset Everything?
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.5, marginBottom: "24px" }}>
        This will delete all your scores, streak, and log history. A safety copy stays on this device, so you can undo it from Settings.
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={onCancel} style={{ ...secondaryButton, flex: 1 }}>Cancel</button>
        <button onClick={onConfirm} style={{ ...dangerButton, flex: 1 }}>Reset</button>
      </div>
    </Dialog>
  );
}

function RepairModal({ offers, onAccept, onDecline }) {
  const total = offers.reduce((sum, o) => sum + (o.to - o.from), 0);
  return (
    <Dialog label="Restore lost points">
      <div style={{ ...headingStyle, fontSize: "22px", marginBottom: "10px" }}>
        Restore {total} lost point{total === 1 ? "" : "s"}?
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.5, marginBottom: "14px" }}>
        An earlier version took decay points off every time the app opened, instead of once a week.
        That's fixed. Going by your review log, these traits should be higher:
      </div>
      <div style={{ maxHeight: "210px", overflowY: "auto", marginBottom: "20px", border: "1px solid var(--border)", borderRadius: "12px" }}>
        {offers.map((o, i) => (
          <div key={o.id} style={{
            display: "flex", justifyContent: "space-between", padding: "9px 12px", fontSize: "14px",
            borderTop: i > 0 ? "1px solid var(--border)" : "none",
          }}>
            <span style={{ fontWeight: 600 }}>{o.name}</span>
            <span style={{ color: "var(--text-muted)" }}>
              {o.from} → <span style={{ fontWeight: 700, color: "var(--green)" }}>{o.to}</span>
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={onDecline} style={{ ...secondaryButton, flex: 1 }}>Keep current</button>
        <button onClick={onAccept} style={{ ...primaryButton, flex: 1 }}>Restore</button>
      </div>
    </Dialog>
  );
}

// First sync on a device that already has progress, into an account that also has progress.
function ConflictModal({ local, remote, today, busy, onUseCloud, onUseDevice, onSignOut }) {
  const describe = s =>
    `${s.reviews} review${s.reviews === 1 ? "" : "s"}` +
    (s.lastReview ? ` · last one ${formatDay(s.lastReview, today)}` : "");
  const card = { padding: "12px 14px", borderRadius: "12px", border: "1.5px solid var(--border)", marginBottom: "10px" };
  return (
    <Dialog label="Choose which data to keep" zIndex={400}>
      <div style={{ ...headingStyle, fontSize: "21px", marginBottom: "10px" }}>
        Which progress do you want to keep?
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.5, marginBottom: "16px" }}>
        This device and your account both have progress saved. Pick one. The other is replaced, and a safety copy of this device's data is kept either way.
      </div>
      <div style={card}>
        <div style={{ fontSize: "14px", fontWeight: 700 }}>Your account</div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>{describe(remote)}</div>
      </div>
      <div style={card}>
        <div style={{ fontSize: "14px", fontWeight: 700 }}>This device</div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>{describe(local)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px", opacity: busy ? 0.6 : 1 }}>
        <button disabled={busy} onClick={onUseCloud} style={primaryButton}>Use my account's progress</button>
        <button disabled={busy} onClick={onUseDevice} style={secondaryButton}>Use this device's progress</button>
        <button disabled={busy} onClick={onSignOut} style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", padding: "6px" }}>
          Decide later and sign out
        </button>
      </div>
    </Dialog>
  );
}

function UpdateBanner({ onRefresh }) {
  return (
    <div role="status" style={{
      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
      padding: "8px 16px", background: "var(--inverse-bg)", color: "var(--inverse-text)", fontSize: "13px", fontWeight: 600,
    }}>
      <span>A new version of LevelUp is ready.</span>
      <button onClick={onRefresh} style={{
        padding: "6px 14px", borderRadius: "999px", background: "var(--green-solid)", color: "#fff",
        fontSize: "13px", fontWeight: 700, flexShrink: 0,
      }}>Refresh</button>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
// Cleans incoming data (cloud, backup file, safety copy) and brings it up to today.
function prepareData(raw, today) {
  const clean = normalizeData(raw, today);
  return ensureTodayPowerup({ ...clean, traits: applyDecay(clean.traits, clean.focus, today) }, today);
}

export default function App() {
  const [initial] = useState(loadInitialState);
  const [tab, setTab] = useState("traits");
  const [data, setData] = useState(initial.data);
  const [meta, setMetaState] = useState(initial.meta);
  const [repairOffers, setRepairOffers] = useState(initial.repairOffers);
  const [settings, setSettings] = useState(loadSettings);
  const [today, setToday] = useState(todayStr);
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [backup, setBackup] = useState(() => {
    const saved = readJSON(LS_KEYS.backup);
    return saved && saved.data ? saved : null;
  });
  const [updateReady, setUpdateReady] = useState(() => window.__luWaitingRegistration || null);
  const [online, setOnline] = useState(() => navigator.onLine !== false);

  // Cloud state
  const [session, setSession] = useState(null);
  const [recovery, setRecovery] = useState(false);
  const [sync, setSync] = useState({ status: "idle", at: null, error: null });
  const [conflict, setConflict] = useState(null); // { remote } while the user must choose
  const [conflictBusy, setConflictBusy] = useState(false);

  // AI Powerup state
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState(null);

  // Refs give the async sync / AI code the latest values without re-creating callbacks.
  const dataRef = useRef(data);
  const metaRef = useRef(meta);
  const sessionRef = useRef(null);
  const conflictRef = useRef(null);
  const syncBusy = useRef(false);
  const syncQueued = useRef(false);
  const aiRun = useRef(0);
  const aiInFlight = useRef(false);
  const aiFallback = useRef(null);

  const showToast = useCallback(msg => setToast(msg), []);
  const clearToast = useCallback(() => setToast(null), []);

  const setMeta = useCallback(next => {
    metaRef.current = next;
    setMetaState(next);
    writeJSON(LS_KEYS.meta, next);
  }, []);

  // A change the user made: stamps the time so cloud sync knows this device has news.
  const updateData = useCallback(change => {
    setData(prev => {
      const next = change(prev);
      return next === prev ? prev : { ...next, updatedAt: new Date().toISOString() };
    });
  }, []);

  // Save on every change.
  useEffect(() => {
    dataRef.current = data;
    saveData(data);
  }, [data]);

  useEffect(() => {
    writeJSON(LS_KEYS.meta, metaRef.current);
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // New day (or app reopened after a while): apply decay and line up today's Powerup.
  // These are derived changes every device computes the same way, so they don't count as edits.
  const refreshDay = useCallback(() => {
    const now = todayStr();
    setToday(now);
    setData(prev => {
      const traits = applyDecay(prev.traits, prev.focus, now);
      return ensureTodayPowerup(traits === prev.traits ? prev : { ...prev, traits }, now);
    });
  }, []);

  // ── Theme ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);

    const query = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const paintBrowserBar = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && query && query.matches);
      const tag = document.querySelector('meta[name="theme-color"]');
      if (tag) tag.setAttribute("content", dark ? "#151b23" : "#ffffff");
    };
    paintBrowserBar();
    if (!query || !query.addEventListener) return undefined;
    query.addEventListener("change", paintBrowserBar);
    return () => query.removeEventListener("change", paintBrowserBar);
  }, [settings.theme]);

  function changeSettings(patch) {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      writeJSON(LS_KEYS.settings, next);
      return next;
    });
  }

  // ── Cloud sync ───────────────────────────────────────────────────────────────
  const applyRemote = useCallback((remote, userId, keepSafetyCopy) => {
    if (keepSafetyCopy) {
      const saved = writeBackup(dataRef.current, "cloud");
      if (saved) setBackup(saved);
    }
    const next = prepareData(remote.data, todayStr());
    dataRef.current = next;
    setData(next);
    setMeta({ ...metaRef.current, cloud: { userId, remoteUpdatedAt: remote.updated_at, dataUpdatedAt: next.updatedAt } });
  }, [setMeta]);

  const runSync = useCallback(async () => {
    const current = sessionRef.current;
    if (!supabase || !current || conflictRef.current) return;
    if (syncBusy.current) { syncQueued.current = true; return; }
    syncBusy.current = true;
    setSync(s => ({ ...s, status: "syncing", error: null }));
    const userId = current.user.id;
    try {
      let settled = false;
      for (let attempt = 0; attempt < 3 && !settled; attempt++) {
        const remote = await fetchRemote(userId);
        const snapshot = dataRef.current;
        const decision = decideSync({ data: snapshot, meta: metaRef.current, remote, userId });

        if (decision.action === "ask") {
          conflictRef.current = { remote };
          setConflict({ remote });
          setSync(s => ({ ...s, status: "conflict" }));
          return;
        }
        if (decision.action === "pull") {
          applyRemote(remote, userId, Boolean(decision.discardsLocal));
          settled = true;
        } else if (decision.action === "link") {
          setMeta({ ...metaRef.current, cloud: { userId, remoteUpdatedAt: remote.updated_at, dataUpdatedAt: snapshot.updatedAt } });
          settled = true;
        } else if (decision.action === "push") {
          try {
            const savedAt = await pushRemote(userId, toCloudPayload(snapshot), remote ? remote.updated_at : null);
            setMeta({ ...metaRef.current, cloud: { userId, remoteUpdatedAt: savedAt, dataUpdatedAt: snapshot.updatedAt } });
            settled = true;
          } catch (error) {
            if (error.code !== "LU_STALE") throw error; // another device got in first: look again
          }
        } else {
          settled = true;
        }
      }
      if (!settled) throw new Error("Cloud data kept changing. Will try again.");
      setSync({ status: "idle", at: Date.now(), error: null });
    } catch (error) {
      setSync(s => ({
        status: navigator.onLine === false ? "offline" : "error",
        at: s.at,
        error: (error && error.message) || "Sync failed",
      }));
    } finally {
      syncBusy.current = false;
      if (syncQueued.current) {
        syncQueued.current = false;
        runSync();
      }
    }
  }, [applyRemote, setMeta]);

  // Track who is signed in. Supabase reports the saved session through this same listener
  // when the app starts (INITIAL_SESSION), so it is the single source of truth.
  useEffect(() => {
    if (!supabase) return undefined;
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
        setShowSettings(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Sync as soon as someone is signed in.
  const userId = session ? session.user.id : null;
  useEffect(() => {
    if (userId) runSync();
  }, [userId, runSync]);

  // Push local changes shortly after they happen; retry slowly after a failure.
  const linkedUser = meta.cloud ? meta.cloud.userId : null;
  const syncedStamp = meta.cloud ? meta.cloud.dataUpdatedAt : null;
  useEffect(() => {
    if (!userId || conflict || !online || sync.status === "syncing") return undefined;
    if (linkedUser !== userId || data.updatedAt === syncedStamp) return undefined;
    const timer = setTimeout(runSync, sync.status === "error" ? 30000 : 1500);
    return () => clearTimeout(timer);
  }, [userId, conflict, online, sync.status, linkedUser, syncedStamp, data.updatedAt, runSync]);

  // Come back to the app, come back online, or cross midnight with it open.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      refreshDay();
      runSync();
    };
    const onOnline = () => { setOnline(true); runSync(); };
    const onOffline = () => setOnline(false);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = setInterval(refreshDay, 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(timer);
    };
  }, [refreshDay, runSync]);

  async function resolveConflict(choice) {
    const pending = conflictRef.current;
    const current = sessionRef.current;
    if (!pending || !current) return;
    setConflictBusy(true);
    try {
      if (choice === "cloud") {
        applyRemote(pending.remote, current.user.id, true);
      } else {
        const snapshot = dataRef.current;
        const saved = writeBackup(snapshot, "cloud");
        if (saved) setBackup(saved);
        const savedAt = await pushRemote(current.user.id, toCloudPayload(snapshot), pending.remote.updated_at);
        setMeta({ ...metaRef.current, cloud: { userId: current.user.id, remoteUpdatedAt: savedAt, dataUpdatedAt: snapshot.updatedAt } });
      }
      conflictRef.current = null;
      setConflict(null);
      setSync({ status: "idle", at: Date.now(), error: null });
    } catch (error) {
      if (error.code === "LU_STALE") {
        // The account changed while the question was open. Ask again with fresh numbers.
        conflictRef.current = null;
        setConflict(null);
        runSync();
      } else {
        showToast("Couldn't reach the cloud. Try again.");
      }
    } finally {
      setConflictBusy(false);
    }
  }

  async function signOut() {
    conflictRef.current = null;
    setConflict(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Signing out only needs to succeed on this device.
    }
    setSync({ status: "idle", at: null, error: null });
    showToast("Signed out. Your data stays on this device.");
  }

  // ── New version banner ───────────────────────────────────────────────────────
  useEffect(() => {
    const onUpdate = e => setUpdateReady(e.detail);
    window.addEventListener("lu-sw-update", onUpdate);
    return () => window.removeEventListener("lu-sw-update", onUpdate);
  }, []);

  function applyUpdate() {
    const waiting = updateReady && updateReady.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  // ── Traits and review ────────────────────────────────────────────────────────
  function toggleFocus(id) {
    if (!data.focus.includes(id) && data.focus.length >= MAX_FOCUS) {
      showToast(`Max ${MAX_FOCUS} focus traits`);
      return;
    }
    updateData(d => {
      if (d.focus.includes(id)) return { ...d, focus: d.focus.filter(x => x !== id) };
      if (d.focus.length >= MAX_FOCUS) return d;
      return { ...d, focus: [...d.focus, id] };
    });
  }

  function addTrait({ name, category, score }) {
    const id = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    updateData(d => ({ ...d, traits: [...d.traits, { id, name, category, score, lastReviewed: null }] }));
    showToast(`${name} added!`);
  }

  function removeTrait(id) {
    const trait = data.traits.find(t => t.id === id);
    updateData(d => ({ ...d, traits: d.traits.filter(t => t.id !== id), focus: d.focus.filter(x => x !== id) }));
    if (trait) showToast(`${trait.name} removed`);
  }

  function commitReview(scores) {
    updateData(d => applyReview(d, scores, todayStr()));
    showToast("Review committed! 🔥");
    setTab("log");
  }

  // ── Powerups ─────────────────────────────────────────────────────────────────
  const aiEnabled = Boolean(supabase && session && settings.aiPowerups && online);

  // Asks Claude for today's lesson. `advance` moves on to the next trait in line first.
  // Whatever goes wrong, the built-in lesson is used instead.
  const requestAi = useCallback(async (advance = false) => {
    if (!supabase || aiInFlight.current) return;
    const now = todayStr();
    const snapshot = dataRef.current;
    const existing = todayPowerupOf(snapshot, now);
    const swap = (existing ? existing.swap : 0) + (advance ? 1 : 0);
    const fallback = buildLibraryPowerup(snapshot.traits, snapshot.powerups, now, swap);
    if (!fallback) return;
    const trait = snapshot.traits.find(t => t.id === fallback.traitId);

    const run = ++aiRun.current;
    aiInFlight.current = true;
    aiFallback.current = { ...fallback, aiTried: true };
    setAiBusy(true);
    setAiNote(null);
    let failure = null;
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) {
        const signedOut = new Error("signed_out");
        signedOut.code = "signed_out";
        throw signedOut;
      }
      // Lessons already seen for this trait, so Claude teaches something different. Today's
      // built-in lesson only counts once the user has actually looked at it (advance).
      const recentTitles = snapshot.powerups
        .filter(p => p.traitId === trait.id && (advance || p.date !== now))
        .slice(0, 6)
        .map(p => p.title);
      const lesson = await requestAiPowerup(auth.session.access_token, trait, recentTitles);
      if (run === aiRun.current) {
        updateData(d => setTodayPowerup(d, {
          id: `${now}:ai:${Date.now()}`,
          date: now,
          traitId: trait.id,
          traitName: trait.name,
          category: trait.category,
          title: lesson.title,
          lesson: lesson.lesson,
          action: lesson.action,
          reflection: lesson.reflection,
          source: "ai",
          done: false,
          swap,
        }));
      }
    } catch (error) {
      failure = error;
    } finally {
      aiInFlight.current = false;
      if (run === aiRun.current) {
        setAiBusy(false);
        if (failure) {
          const entry = aiFallback.current;
          updateData(d => setTodayPowerup(d, entry));
          setAiNote(aiFailureNote(failure.code));
        }
      }
    }
  }, [updateData]);

  const requestTodayAi = useCallback(() => requestAi(false), [requestAi]);

  // "Use a built-in lesson" while the AI one is still being written.
  const skipAi = useCallback(() => {
    aiRun.current++;
    setAiBusy(false);
    const entry = aiFallback.current;
    const now = todayStr();
    updateData(d => {
      if (entry && entry.date === now) return setTodayPowerup(d, entry);
      const existing = todayPowerupOf(d, now);
      return existing ? setTodayPowerup(d, { ...existing, aiTried: true }) : d;
    });
  }, [updateData]);

  function newLesson() {
    if (aiEnabled) {
      requestAi(true);
      return;
    }
    const now = todayStr();
    setAiNote(null);
    updateData(d => {
      const existing = todayPowerupOf(d, now);
      const next = buildLibraryPowerup(d.traits, d.powerups, now, (existing ? existing.swap : 0) + 1);
      return next ? setTodayPowerup(d, { ...next, aiTried: true }) : d;
    });
  }

  function markPowerupDone(done) {
    const now = todayStr();
    updateData(d => {
      const existing = todayPowerupOf(d, now);
      return existing ? setTodayPowerup(d, { ...existing, done }) : d;
    });
    if (done) showToast("Powerup complete ⚡");
  }

  // ── Data: reset, backup, restore, repair ─────────────────────────────────────
  function keepSafetyCopy(reason) {
    const saved = writeBackup(dataRef.current, reason);
    if (saved) setBackup(saved);
  }

  function handleReset() {
    keepSafetyCopy("reset");
    updateData(() => ensureTodayPowerup(emptyData(), todayStr()));
    setMeta({ ...metaRef.current, repairChecked: true });
    setRepairOffers([]);
    setShowReset(false);
    setShowSettings(false);
    showToast("All data reset");
  }

  function importData(imported) {
    keepSafetyCopy("import");
    updateData(() => prepareData(imported, todayStr()));
    setShowSettings(false);
    showToast("Backup restored");
  }

  function restoreBackup() {
    if (!backup) return;
    const restored = prepareData(backup.data, todayStr());
    keepSafetyCopy("restore");
    updateData(() => restored);
    setShowSettings(false);
    showToast("Previous data restored");
  }

  function recheckRepair() {
    const offers = computeRepair(data.traits, data.log, todayStr());
    if (offers.length === 0) {
      showToast("No lost points found");
      return;
    }
    setShowSettings(false);
    setRepairOffers(offers);
  }

  function acceptRepair() {
    const total = repairOffers.reduce((sum, o) => sum + (o.to - o.from), 0);
    keepSafetyCopy("repair");
    updateData(d => applyRepair(d, repairOffers, todayStr()));
    setMeta({ ...metaRef.current, repairChecked: true });
    setRepairOffers([]);
    showToast(`Restored ${total} point${total === 1 ? "" : "s"}`);
  }

  function declineRepair() {
    setMeta({ ...metaRef.current, repairChecked: true });
    setRepairOffers([]);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const { traits, focus, log, streak, powerups } = data;
  const functionality = traits.length
    ? Math.round(traits.reduce((s, t) => s + t.score, 0) / traits.length)
    : 0;
  const todayPowerup = todayPowerupOf(data, today);
  const syncNeedsAttention = Boolean(session) && (sync.status === "error" || sync.status === "conflict");

  return (
    <>
      <Header
        functionality={functionality}
        streakCount={currentStreak(streak, today)}
        needsAttention={syncNeedsAttention}
        onOpenSettings={() => setShowSettings(true)}
      />
      {updateReady && <UpdateBanner onRefresh={applyUpdate} />}

      {tab === "traits" && (
        <TraitsTab
          traits={traits}
          focus={focus}
          log={log}
          today={today}
          onToggleFocus={toggleFocus}
          onAddTrait={addTrait}
          onRemoveTrait={removeTrait}
          onGoReview={() => setTab("review")}
        />
      )}
      {tab === "review" && (
        <ReviewTab traits={traits} focus={focus} onCommit={commitReview} />
      )}
      {tab === "powerup" && (
        <PowerupTab
          entry={todayPowerup}
          history={powerups.filter(p => p.date !== today).slice(0, 14)}
          traits={traits}
          focus={focus}
          today={today}
          aiEnabled={aiEnabled}
          aiBusy={aiBusy}
          aiNote={aiNote}
          showSignInHint={Boolean(supabase && !session)}
          onDone={markPowerupDone}
          onNewLesson={newLesson}
          onRequestAi={requestTodayAi}
          onSkipAi={skipAi}
          onAddFocus={toggleFocus}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}
      {tab === "log" && (
        <LogTab log={log} today={today} />
      )}

      <BottomNav
        tab={tab}
        setTab={setTab}
        focusCount={focus.length}
        powerupWaiting={Boolean(todayPowerup && !todayPowerup.done)}
      />

      {toast && <Toast message={toast} onDone={clearToast} />}

      {showSettings && (
        <SettingsSheet
          onClose={() => setShowSettings(false)}
          settings={settings}
          onChangeSettings={changeSettings}
          session={session}
          sync={sync}
          online={online}
          recovery={recovery}
          onRecoveryDone={() => { setRecovery(false); showToast("Password updated"); }}
          onSyncNow={runSync}
          onSignOut={signOut}
          onExport={() => downloadBackupFile(data)}
          onImport={importData}
          backup={backup}
          onRestoreBackup={restoreBackup}
          onRecheckRepair={recheckRepair}
          onReset={() => setShowReset(true)}
        />
      )}
      {showReset && <ResetModal onConfirm={handleReset} onCancel={() => setShowReset(false)} />}
      {repairOffers.length > 0 && !conflict && (
        <RepairModal offers={repairOffers} onAccept={acceptRepair} onDecline={declineRepair} />
      )}
      {conflict && (
        <ConflictModal
          local={summarize(data)}
          remote={summarize(normalizeData(conflict.remote.data, today))}
          today={today}
          busy={conflictBusy}
          onUseCloud={() => resolveConflict("cloud")}
          onUseDevice={() => resolveConflict("device")}
          onSignOut={signOut}
        />
      )}
    </>
  );
}
