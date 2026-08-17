# grid.tracker

Read this before making changes. It exists so any future session — human or
LLM — has the context that would otherwise live only in chat history.

## What this is and why it exists

This project recreates a paper bullet-journal spread as a minimalist website.
The owner (Shubham) hand-draws a monthly grid in a physical diary, divided
into four parts: a habit grid (days across the top, habits down the side,
✕ per day done), and three line-tracked metrics below it — Sleep, Mood, and
Fasting hours — each with a running average. The goal was to put that exact
mental model on the web at his own domain, **tracker.shubhambhatia.in**, as
an **open-source template**: other people should be able to use the hosted
site directly, or export their data and drop it into their own Excel sheet
or Notion workspace, editing the habit list to fit their own life.

The single guiding constraint, repeated throughout this project's history,
is: **keep it minimal.** No feature should be added "because it would be
nice" — only because the owner explicitly asked for it. When in doubt, cut
before you add. See "Explicit non-goals" below before proposing anything new.

## Core product decisions (already made — don't relitigate without asking)

These were deliberate choices, made with the owner via direct questions
early in the project. Don't silently change them:

- **Local-only storage, no backend, no accounts.** Everything lives in the
  browser's `localStorage` (`lib/store.ts`). No server, no database, no
  login. This is the load-bearing decision behind "private and minimal" —
  it also means there is no cross-device sync and no server-side backup.
  That's an accepted trade-off, not an oversight.
- **Next.js static export** (`next.config.mjs` → `output: "export"`). The
  whole app is client-side React; there is no API route and there should
  never need to be one, given local-only storage. This also means the app
  is just a folder of static files — anyone can fork and self-host it.
- **CSV as the one export format.** Opens directly in Excel; imports into
  Notion as a database (`New page → Import → CSV`). No `.xlsx` generation,
  no JSON backup/import (yet — see "Known gaps" below), no other formats.
  Keep it to CSV unless explicitly asked to add another.
- **Cross-grid interaction everywhere, including the metrics.** Originally
  Sleep/Mood/Fasting were free-typed number inputs. The owner corrected this
  early on: everything should be click-to-mark ✕, exactly like the habit
  grid, because that's what makes the paper journal fast to use. Sleep and
  Fasting have **user-editable Y-axis values** (up to 3 and 4 respectively);
  Mood is a **fixed** +2/+1/0/−1/−2 scale. Don't reintroduce free-text number
  entry for these.
- **Habits are a template, not a fixed list.** The starter habits
  (`lib/defaults.ts` → `DEFAULT_TEMPLATE`) are just a seed. Users rename,
  add, and remove habits per month, and edits sync forward as the new
  default template (`patchMonth(..., syncTemplate = true)` in
  `components/Tracker.tsx`). This is intentional — the whole point is that
  people define their own habits, matching the "template, not gospel"
  framing from the original brief.
- **Visual identity is deliberately spare.** Monospace type throughout
  (the grid is a ledger, and monospace gives tabular alignment for free), a
  pen-blue ink accent (`--ink`) against warm paper neutrals, minimal copy.
  A graph-paper page backdrop was tried and then **removed** because its
  22px grid didn't tile with the board's 30px day columns — don't re-add a
  decorative background grid unless it's built on the same module as
  `--col`/`--row`. Explanatory copy under the grid was deliberately cut
  down to one line — the interactions should be discoverable, not
  documented in body text on the page.

## Architecture

```
app/
  layout.tsx        Root layout, page metadata (title/OG/theme-color)
  page.tsx           Renders <Tracker /> — that's the entire page
  globals.css        All styling. CSS custom properties drive both the
                      light palette (:root) and dark palette
                      (@media prefers-color-scheme: dark) — no toggle,
                      it follows the OS/browser setting.
components/
  Tracker.tsx        The whole app: state, all mutation handlers, and the
                      full grid render (habit rows + 3 metric sections).
                      Deliberately one large component rather than split
                      into many — the interactions are tightly coupled
                      (shared day columns, shared month state) and the
                      file is still easy to scan top-to-bottom.
  MetricOverlay.tsx   Draws the SVG trend line over a metric's marked
                      cells (absolutely positioned over the value-row
                      grid). Breaks the line across gap days.
lib/
  types.ts            The data model: Store, MonthData, MetricConfig.
  defaults.ts          Seed values: DEFAULT_TEMPLATE (habit list),
                       DEFAULT_SLEEP_AXIS, DEFAULT_FASTING_AXIS,
                       MOOD_VALUES (fixed), METRICS config array.
  dates.ts             Pure date helpers (month keys, weekday letters,
                       day counts). No dependencies, no side effects.
  store.ts             localStorage read/write + migration of older
                       saved data (fills in fields added later, like
                       startDay/sleepAxis/fastingAxis, so nobody's saved
                       data breaks when the schema grows).
  csv.ts               Builds the CSV string and triggers the browser
                       download. Respects startDay (days before it are
                       left out of the export, matching the UI).
```

### Data model shape (`lib/types.ts`)

A `Store` holds a `template` (default habit list), default `sleepAxis` /
`fastingAxis`, and a `months` map keyed `"YYYY-MM"`. Each `MonthData` has its
own `habits`, `cells` (habit → day → done), `startDay`, its own
`sleepAxis`/`fastingAxis` (so editing one month's axis doesn't retroactively
change past months), and `sleep`/`mood`/`fasting` (day → marked value).
Months are created lazily from the template the first time they're touched
(`emptyMonth` in `lib/defaults.ts`).

### Key interaction rules to preserve

- **One mark per day per metric.** Clicking a Y-axis cell for a day that's
  already marked at a different value **moves** the mark; clicking the
  already-marked value **clears** it. This mirrors the habit toggle
  behavior and is implemented in `toggleMark` in `Tracker.tsx`.
- **`startDay`** dims and disables columns before it (CSS class `.pre`),
  and excludes them from averages, the trend line, and the CSV. This is
  how a user who starts tracking mid-month (e.g. "I forgot until the
  10th") isn't stuck looking at a month of empty leading columns.
- **Today's column is highlighted** (CSS class `.today`) whenever the
  currently viewed month is the real current month.
- Removing a habit or an axis value **deletes that data immediately, with
  no confirmation and no undo.** This is a known rough edge (see below),
  not an intentional design decision to be proud of.

## Deployment & git workflow

- **Vercel project `grid-tracker1`** is connected via GitHub App
  integration (not a manual file upload — an earlier attempt used
  `deploy_to_vercel`'s direct-upload path before the GitHub App was
  installed; that standalone project is stale/deprecated, don't resurrect
  it). Pushes to `main` auto-deploy to **tracker.shubhambhatia.in**.
- **Workflow the owner asked for explicitly: PR into `main`, owner
  merges.** Don't push directly to `main`. Open a PR from a feature
  branch, let Vercel post its preview-deployment comment, and leave it
  for the owner to review and merge — don't merge your own PRs here.
  In practice the owner has been merging PRs within minutes, so if you're
  about to push a follow-up change, `git fetch origin main` and check
  whether your branch is already behind before assuming a PR is still
  open.
- Commit messages should explain *why*, not restate the diff. Don't put
  the AI model name in commits/PRs — chat-only, per the environment's own
  rules.

## Explicit non-goals

These have come up in product brainstorming and were deliberately **not**
pursued, to protect the minimalism the owner has repeatedly asked for.
Don't add them without being asked directly:

- Accounts, login, or any cross-device sync.
- Push notifications / reminders.
- Multi-user or sharing features.
- A year-over-year or multi-month analytics/rollup view.
- `.xlsx` generation, or any export format beyond CSV.

## Known gaps (raised, not yet acted on — ask before fixing)

- **No backup/restore.** Because storage is local-only, clearing browser
  data or switching devices silently loses everything. A JSON
  export/import (distinct from the one-way CSV export) was flagged as the
  most important open gap, precisely because local-only was a deliberate
  choice — but it hasn't been requested yet, so it isn't built.
- **No confirmation or undo on destructive actions** (removing a habit,
  removing a Y-axis value).
- **Not mobile-optimized.** The grid is a fixed-width, horizontally
  scrolling table with 30px tap targets — workable, but built desktop-first
  despite this being a plausibly daily/mobile-checked tool.
- No favicon, no Open Graph image for link previews.

## If you're making changes

1. Re-read the "Core product decisions" section above before adding
   anything — most feature ideas for this project should be *rejected*,
   not built, unless the owner asked for that specific thing.
2. Match the existing style: monospace, the `--ink`/`--paper`/`--panel`
   CSS custom properties (both light and dark blocks), no new dependencies
   unless truly necessary (there are currently zero runtime dependencies
   beyond React/Next).
3. Run `npm run build` before considering a change done — this is a
   static export, so a build failure here is a production failure, not
   just a lint warning.
4. Push to a feature branch and open a PR into `main`; don't merge it
   yourself.
