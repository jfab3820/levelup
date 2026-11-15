# LevelUp

A mobile-first PWA for tracking personal character development. Score yourself on 20+ traits, review a few every day, keep a streak going, and get a daily **Powerup**: a one-minute lesson aimed at your lowest traits.

Live: https://levelup-hazel-seven.vercel.app

## What it does

- **Traits** — 20 built-in traits across 6 categories, plus your own. Tap up to 3 to focus on today.
- **Review** — score each focus trait 1–5. Scores move up or down and the review is logged.
- **Powerup** — one short lesson a day with a concrete action and a question for tonight. Works offline from a built-in library; signed-in users can get lessons written by Claude.
- **Log** — review history grouped by day, week, month, and year.
- **Decay** — a reviewed trait that isn't in focus loses 1 point per 7 days until you review it again.
- **Settings** — account and sync, light/dark theme, backups, undo, reset.

Everything is saved on the device (`localStorage`). Cloud sync is optional.

## Run it

```bash
npm install
```

```bash
npm start
```

```bash
npm test
```

```bash
npm run build
```

`npm start` serves the app at http://localhost:3000. The service worker (offline mode) only runs in production builds.

## Project layout

| Path | What it is |
|---|---|
| `src/App.js` | The whole app: components, state, and logic |
| `src/powerupLibrary.js` | Built-in Powerup lessons (content only) |
| `src/index.css` | Design tokens (light and dark) and global styles |
| `src/cloudConfig.json` | Supabase project URL and publishable key (empty = cloud off) |
| `src/service-worker.js` | Offline support (compiled by the build) |
| `api/powerup.js` | Vercel serverless function that asks Claude for a lesson |
| `supabase/migrations/` | Database tables and security rules for cloud sync |
| `src/*.test.js` | Tests |

## Turning on cloud sync and AI Powerups

The app runs fine without any of this. These steps add sign-in, sync across devices, and Claude-written lessons.

1. **Create a Supabase project** at https://supabase.com (the free plan is enough).
2. **Create the tables.** In the Supabase dashboard open *SQL Editor*, paste the contents of `supabase/migrations/20261115000000_levelup_cloud.sql`, and run it.
3. **Point the app at the project.** In *Project Settings → API*, copy the project URL and the publishable key into `src/cloudConfig.json`:

   ```json
   {
     "supabaseUrl": "https://YOUR-PROJECT.supabase.co",
     "supabasePublishableKey": "sb_publishable_..."
   }
   ```

   Both values are safe to commit. The database only lets a signed-in user read and write their own row.
4. **Set the site URL.** In *Authentication → URL Configuration*, set *Site URL* to the app's address (for example `https://levelup-hazel-seven.vercel.app`) so confirmation and password-reset emails link back to the app.
5. **Add the Anthropic API key** (only needed for AI Powerups). In the Vercel project go to *Settings → Environment Variables* and add `ANTHROPIC_API_KEY`. This one is a secret: it lives only in Vercel, never in the code.
6. Commit, push, and deploy.

### AI Powerup settings

| Vercel environment variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Required. Your key from https://platform.claude.com |
| `POWERUP_MODEL` | Optional. Defaults to `claude-opus-5-5`. Set to `claude-haiku-5-5` for the lowest cost |

Guardrails on spending:

- The endpoint only answers signed-in users.
- Each user gets 5 AI lessons per 24 hours (enforced in the database by `claim_powerup_generation`).
- Set a monthly spend limit in the Anthropic Console as a backstop.

If anything fails (no key, limit reached, offline), the app quietly uses a built-in lesson instead.

## How sync works

- The whole state (traits, focus, log, streak, Powerups) is stored as one row per user.
- Local changes upload about a second and a half after they happen. Coming back to the app or coming back online triggers a sync.
- Each save only succeeds if the cloud copy hasn't changed since this device last saw it. If it has, the device looks again instead of overwriting.
- The first time a device with progress signs in to an account that also has progress, the app asks which one to keep. The other is replaced, and the device's copy is kept as a safety backup either way.

## Deployment

Hosted on Vercel. Pushing to `main` deploys to production; other branches get preview deployments. `vercel.json` sends every route except `/api/*` to `index.html`.
