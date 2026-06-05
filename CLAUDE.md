# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LevelUp is a mobile-first PWA for personal character development tracking. Users monitor 20+ personality traits across 6 categories (Core, Character, Mind, Body, Skills, Relationships), perform daily reviews, and track streaks. All data is stored in `localStorage` — there is no backend or database.

## Commands

```bash
npm start          # Dev server at http://localhost:3000
npm test           # Run tests in watch mode
npm run build      # Production build → ./build/
```

Run a single test file:
```bash
npm test -- --testPathPattern=App.test --watchAll=false
```

Run tests matching a name pattern:
```bash
npm test -- --testNamePattern="renders" --watchAll=false
```

## Architecture

The entire app lives in **`src/App.js`** (~1000 lines) — all components, state, and business logic are co-located in one file. There is intentionally no component splitting across files.

### Component Hierarchy
```
App
├── Header          — overall score %, streak counter, reset button
├── TraitsTab       — browse/filter traits by category, add custom traits
│   └── TraitCard   — individual trait with score bar and category accent
├── ReviewTab       — daily review flow: pick focus traits → score 1–5 → commit
├── LogTab          — hierarchical review history (Today / Week / Month / Year)
├── BottomNav       — 3-tab navigation (Traits / Review / Log)
├── Toast           — auto-dismiss notifications
└── ResetModal      — confirm data wipe
```

### State & Persistence

All state is loaded from and saved to `localStorage` on every meaningful change via `loadState()` / `saveState()`:

| `localStorage` key | Content |
|--------------------|---------|
| `lu_traits`        | Array of trait objects `{ id, name, category, score, lastReviewed }` |
| `lu_focus`         | Array of trait IDs selected for daily review (max 3) |
| `lu_log`           | Array of review entries `{ date, scores: [{ id, name, val, delta }] }` |
| `lu_streak`        | `{ count, lastDate }` |

### Scoring & Decay

- **Scoring**: Review uses a 1–5 scale mapped to deltas: `1→-2, 2→-1, 3→-1, 4→+1, 5→+2`. Scores are clamped `[0, 100]`.
- **Decay**: `applyDecay()` runs on app load. Traits **not** in the focus list lose 1 point per 7 days since `lastReviewed`. Focus-list traits are exempt from decay.
- **Overall score**: The header percentage is the mean of all trait scores divided by 100.

### Styling Conventions

- **No CSS framework.** Styles are a mix of inline React style objects (for dynamic/component-level styles) and CSS custom properties in `index.css` for global tokens.
- **CSS variables** defined in `:root` of `index.css`: `--green`, `--red`, `--amber`, `--bg`, `--card`, `--text`, `--text-muted`, `--border`, `--nav-h`, `--header-h`.
- **Category colors** are defined in the `CATEGORY_COLORS` constant in `App.js` and applied inline per trait card.
- **Layout**: Fixed max-width of `430px` centered — designed for mobile portrait.
- **Fonts**: DM Sans (body/UI), Syne (headings) — loaded via Google Fonts in `public/index.html`.

### Key Constants (top of App.js)

- `DEFAULT_TRAITS` — the 20 built-in traits with initial scores
- `SCORE_OPTIONS` — the 5 review choices with their deltas and colors
- `CATEGORIES` — ordered array of the 6 category names
- `CATEGORY_COLORS` — maps each category to `{ bg, accent }` colors
- `LS_KEYS` — the `localStorage` key names (`lu_traits`, `lu_focus`, `lu_log`, `lu_streak`)

## Deployment

Deployed to Vercel. `vercel.json` rewrites all routes to `/index.html` for SPA routing. Push to `main` triggers an automatic deployment.
