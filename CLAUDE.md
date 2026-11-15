# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LevelUp is a mobile-first PWA for personal character development tracking. Users monitor 20+ personality traits across 6 categories (Core, Character, Mind, Body, Skills, Relationships), perform daily reviews, track streaks, and get a daily "Powerup" micro-lesson aimed at their lowest traits.

The app is local-first: all data lives in `localStorage` and the app works fully offline. Optional cloud features (Supabase sign-in and sync, Claude-written Powerups) switch on only when a Supabase project is configured in `src/cloudConfig.json`.

## Commands

```bash
npm start          # Dev server at http://localhost:3000
npm test           # Run tests in watch mode
npm run build      # Production build → ./build/
```

Run everything once (what CI would do):
```bash
CI=true npm test -- --watchAll=false
CI=true npm run build
```

Run a single test file:
```bash
npm test -- --testPathPattern=App.test --watchAll=false
```

Run tests matching a name pattern:
```bash
npm test -- --testNamePattern="decay" --watchAll=false
```

Vercel builds with `CI=1`, which turns ESLint warnings into build failures. Keep the build warning-free.

## Architecture

The app lives in **`src/App.js`** (~2,800 lines) — all components, state, and business logic are co-located in one file. There is intentionally no component splitting across files. The one exception is **`src/powerupLibrary.js`**, which holds lesson text only (no logic).

`App.js` is ordered top to bottom: constants → date helpers → data cleaning → decay / streak / review / repair → Powerup selection → sync decisions → localStorage → cloud I/O → UI components → `App`.

### Other files

| Path | Purpose |
|------|---------|
| `src/powerupLibrary.js` | Built-in lessons: `TRAIT_LESSONS` (3 per default trait id) and `CATEGORY_LESSONS` (for custom traits; `{trait}` is replaced with the trait name) |
| `src/index.css` | Design tokens for light and dark themes, global styles, animations |
| `src/cloudConfig.json` | Supabase URL + publishable key. Empty strings = cloud off |
| `src/service-worker.js` | Workbox service worker (compiled only in production builds) |
| `src/serviceWorkerRegistration.js` | Registers the worker; reports waiting updates |
| `api/powerup.js` | Vercel serverless function: Claude writes one lesson |
| `supabase/migrations/*.sql` | `user_state`, `powerup_generations`, `claim_powerup_generation()` |

### Component Hierarchy
```
App
├── Header            — overall score %, streak, settings button
├── UpdateBanner      — "new version ready" (service worker update)
├── TraitsTab         — browse/filter traits, add custom traits
│   ├── TraitCard     — tap to toggle focus; ⋯ opens details
│   └── TraitDetailSheet — decay countdown, recent reviews, remove custom trait
├── ReviewTab         — score focus traits 1–5 → commit
├── PowerupTab        — today's lesson, week strip, earlier lessons
├── LogTab            — review history (Today / Week / Month / Year) via LogGroup
├── BottomNav         — Traits / Review / Powerup / Log
├── SettingsSheet     — account (AuthForm, NewPasswordForm), theme, backups, reset
├── Toast, ResetModal, RepairModal, ConflictModal
└── shared: Sheet, Dialog, Icon, EmptyState, ScoreBar, CategoryChip
```

### State & Persistence

`App` keeps one `data` object `{ traits, focus, log, streak, powerups, updatedAt }` and saves it on every change. `loadInitialState()` reads, cleans (`normalizeData`), migrates, applies decay, and ensures today's Powerup.

| `localStorage` key | Content |
|--------------------|---------|
| `lu_traits`        | Array of `{ id, name, category, score, lastReviewed, decayAnchor? }` |
| `lu_focus`         | Array of trait IDs selected for review (max 3) |
| `lu_log`           | Array of review entries, newest first: `{ trait, traitId?, score, delta, date }` (`trait` is the name; entries written before v4 have no `traitId`) |
| `lu_streak`        | `{ count, lastDate, best }` |
| `lu_powerups`      | Array of daily lessons, newest first (max 60): `{ id, date, traitId, traitName, category, title, lesson, action, reflection, source: "library"\|"ai", done, swap, lessonId?, aiTried? }` |
| `lu_updated_at`    | ISO time of the last **user** edit (drives sync) |
| `lu_meta`          | `{ schema, repairChecked, cloud: { userId, remoteUpdatedAt, dataUpdatedAt } \| null }` |
| `lu_settings`      | `{ theme: "system"\|"light"\|"dark", aiPowerups }` (device-only, never synced) |
| `lu_backup`        | One safety copy `{ at, reason, data }` taken before anything replaces data |

Two kinds of state change, and the difference matters for sync:

- **User edits** go through `updateData(fn)`, which stamps `updatedAt`.
- **Derived changes** (decay, creating today's built-in Powerup) use plain `setData` and do **not** stamp `updatedAt`. Every device computes them identically, and stamping them would let a stale device overwrite newer cloud data.

### Dates

Dates are **local calendar days** as `YYYY-MM-DD` strings (`todayStr()`, `toDateStr()`). Never use `toISOString()` to get a date — that is UTC, and in US time zones it returns tomorrow's date in the evening. Date math (`dayDiff`, `addDays`, `weekStartOf`) runs on the strings in UTC so daylight saving can't shift a day. Tests run with `TZ=America/Chicago` (set in `src/testGlobalSetup.js`).

### Scoring & Decay

- **Scoring**: Review uses a 1–5 scale mapped to deltas: `1→-2, 2→-1, 3→-1, 4→+1, 5→+2`. Scores are clamped `[0, 100]`. `applyReview()` is a pure function.
- **Decay**: `applyDecay()` runs on load, when the app returns to the foreground, and once a minute. A reviewed trait **not** in focus loses 1 point per full 7 days since its `decayAnchor` (falls back to `lastReviewed`); the anchor then advances by the days charged, so a week is never charged twice. Focus traits are exempt (anchor held at today). Never-reviewed traits don't decay.
- **Streak**: `bumpStreak()` on review; `currentStreak()` shows 0 once a day has been missed.
- **Overall score**: the header percentage is the mean of all trait scores.
- **Repair**: `computeRepair()` replays the log for built-in traits to find scores an old decay bug pushed too low. Offered once on upgrade and on demand from Settings.

### Powerups

- `rankPowerupTraits()` takes the 5 lowest-scoring traits and puts the one that has waited longest for a lesson first.
- `buildLibraryPowerup(traits, powerups, today, swap)` picks a lesson not used recently; `swap` (the "New lesson" button) moves to the next trait in line.
- With cloud configured, a signed-in user, and `settings.aiPowerups` on, the first visit to the tab each day calls `POST /api/powerup`. Any failure falls back to the built-in lesson and sets `aiTried` so it isn't retried on every visit.

### Cloud sync (Supabase)

- `supabase` is `null` unless `cloudConfig.json` (or `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_PUBLISHABLE_KEY`) is filled in. All cloud UI and effects check for that.
- One row per user in `user_state` holds `toCloudPayload(data)`. The database sets `updated_at`, which is used as a version: `pushRemote()` updates only where `updated_at` equals the version last seen, and throws `LU_STALE` otherwise.
- `decideSync()` is the pure decision function: `push`, `pull`, `link`, `ask` (first sync where both sides have progress → `ConflictModal`), or `noop`. When both sides changed, the most recent user edit wins and the local copy is backed up.
- Session state comes only from `supabase.auth.onAuthStateChange` (it emits `INITIAL_SESSION` at startup). Don't add a separate `getSession()` call for state — it races with sign-in.

### Serverless function (`api/powerup.js`)

CommonJS, runs on Vercel. Flow: POST only → requires `ANTHROPIC_API_KEY` and Supabase config (else `503 not_configured`) → requires a Supabase bearer token → validates input → `claim_powerup_generation` RPC (5 per user per 24h, `429 daily_limit`) → Claude via `@anthropic-ai/sdk` `messages.parse` with a zod schema → `{ lesson, remaining }`. Model defaults to `claude-opus-5-5`, overridable with `POWERUP_MODEL`. Errors map to short codes the app turns into a note.

### Styling Conventions

- **No CSS framework.** Styles are inline React style objects, plus CSS custom properties in `index.css` for tokens.
- **Use tokens, not hex values**, so light and dark both work: `--bg`, `--card`, `--surface`, `--surface-2`, `--text`, `--text-2`, `--text-muted`, `--text-faint`, `--border`, `--green`, `--green-solid` (button fills), `--green-strong`, `--green-light`, `--red`, `--red-solid`, `--red-light`, `--amber`, `--amber-light`, `--amber-text`, `--inverse-bg`, `--inverse-text`, `--nav-h`, `--header-h`, `--safe-b`.
- **Theme**: `<html data-theme="light|dark">` forces a theme; no attribute follows the device. The dark token block appears twice in `index.css` (forced dark, and system dark) — keep them identical.
- **Category colors**: `CATEGORY_COLORS` maps each category to `{ bg, accent }`, both CSS variables (`--cat-*`). Use `fade(color, percent)` for tinted borders.
- **Layout**: fixed max-width of `430px` centered — designed for mobile portrait. Sheets use the `lu-sheet` class to stay in that column.
- **Fonts**: DM Sans (body/UI), Syne (headings, via `headingStyle`) — loaded from Google Fonts in `public/index.html` and cached by the service worker. Syne at weight 800 is very wide; give headings a full row.
- Elements inside a `<button>` must be `<span>`s (see `TraitCard`); don't nest buttons.

### Key Constants (top of App.js)

- `DEFAULT_TRAITS` — the 20 built-in traits with initial scores (also the baseline for `computeRepair`; changing a starting score changes repair results)
- `SCORE_OPTIONS` — the 5 review choices with their deltas and colors
- `CATEGORIES` — ordered array of the 6 category names
- `CATEGORY_COLORS` — maps each category to `{ bg, accent }` CSS variables
- `LS_KEYS` — the `localStorage` key names
- `MAX_FOCUS`, `MAX_POWERUPS`, `POWERUP_POOL`, `DECAY_DAYS`, `SCHEMA_VERSION`, `APP_VERSION`

### Service Worker (PWA / Offline)

`src/service-worker.js` is compiled by Create React App's Workbox plugin during `npm run build` (not in `npm start`). It precaches the build, answers navigations with `index.html` (except `/api/*`), and caches Google Fonts. When a new deployment is waiting, `index.js` fires a `lu-sw-update` window event and the app shows `UpdateBanner`; "Refresh" posts `SKIP_WAITING` and reloads.

## Tests

- `src/App.test.js` — pure logic (dates, decay, streak, review, repair, migration, Powerups, sync decisions) and UI flows with cloud off.
- `src/cloud.test.js` — sign-in, sync, and AI Powerups against an in-memory Supabase stand-in (mocks `@supabase/supabase-js` and `cloudConfig.json`).
- `src/powerupApi.test.js` — the serverless function with Claude and Supabase stubbed (`@jest-environment node`).

Pure functions are exported from `App.js` by name for testing.

## Deployment

Deployed to Vercel (framework preset: Create React App). `vercel.json` rewrites every route except `/api/*` to `/index.html` and gives `api/powerup.js` a 60-second limit. Push to `main` triggers a production deployment; other branches get previews.

Environment variables (Vercel project settings): `ANTHROPIC_API_KEY` (secret, required for AI Powerups), `POWERUP_MODEL` (optional). Supabase values live in `src/cloudConfig.json` and are public by design.

## Roadmap / Next Up

- **Connect a Supabase project** — the auth, sync, and AI code is built and tested with stand-ins but has not run against a live project yet. Steps are in `README.md`.
- Ideas after that: trends/insights chart, review notes, reminders.
