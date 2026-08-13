# grid tracker

A minimalist, offline-first **grid habit tracker** — the paper bullet-journal
layout, on the web. Habits, sleep, mood and fasting for a whole month, all on
one page.

> Live at **[tracker.shubhambhatia.in](https://tracker.shubhambhatia.in)**

It's built from a real diary spread: days run across the top, habits down the
left, an `✕` in a cell means done. Below the grid, three little line charts
track **Sleep**, **Mood** (−2 to +2) and **Fasting** hours, each with a running
average — just like the hand-drawn version.

## Why it's different

- **No account, no server, no tracking.** Everything lives in your browser's
  `localStorage`. Your data never leaves your device.
- **Yours to shape.** Rename habits, add your own, remove what you don't use.
  The layout is a template, not a rulebook.
- **Export anywhere.** One click gives you a CSV that opens directly in Excel
  and imports natively into Notion as a database.
- **Truly minimal.** No chart library, no UI kit. Static export — a folder of
  plain files you can host anywhere.

## Using it

1. **Mark a habit** — click any cell. Click again to clear it.
2. **Edit habits** — click a habit's name to rename it (empty name deletes it),
   or use **+ add habit**. Your edited list becomes the template for future
   months.
3. **Log sleep / mood / fasting** — type a number in the per-day row. Mood is
   −2 to +2; sleep and fasting are in hours. Averages and charts update live.
4. **Move between months** — `‹` / `›`, or **today**.
5. **Export** — **Export CSV** downloads the current month.

### CSV → Excel or Notion

The export is one row per day, one column per habit, plus Sleep / Mood /
Fasting:

```
Date,Day,Creatine,Exercise,...,Sleep,Mood,Fasting
2026-08-01,Sat,X,,...,6,0,16
```

- **Excel** — just open the `.csv`.
- **Notion** — in a page, `New table → Import → CSV`, pick the file. Notion
  builds a database you can then edit, filter and template however you like.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export → ./out
```

The build produces a static site in `out/` (Next.js `output: "export"`), so you
can drop it on Vercel, GitHub Pages, Netlify, or any static host.

## Deploying to Vercel

This repo deploys as a standard Next.js project. Point a Vercel project at it
and add the domain `tracker.shubhambhatia.in` in **Project → Settings →
Domains**. No environment variables are needed — the app is fully client-side.

## Tech

Next.js (App Router) · React · TypeScript · inline-SVG charts · zero runtime
dependencies. Data model and helpers live in `lib/`; the UI is in
`components/`.

## License

[MIT](./LICENSE) — fork it, self-host it, make it yours.
