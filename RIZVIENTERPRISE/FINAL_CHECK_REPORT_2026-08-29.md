# RIZVI FOMS — CORRECTION REPORT — 2026-08-29

This release was checked against the user's re-typed/corrected source
`45_2Depart-Soft.pdf` (96 pages, has a genuine text layer — unlike the
original `SOURCE_Software_instruction.pdf` in this package, which is a
CamScanner image scan with no extractable text).

## What was verified line-by-line against the source PDF
- 18 Corporate items — exact match
- 91 Departments — exact match (including the source's own duplicate names)
- 156 Sections — exact match
- 564 Designations — cross-checked one by one

## What was found and fixed
`enterprise-master-data.json`, `enterprise-master-data.js`, and
`backend/public/enterprise-master-data.js` contained **96 designation
name errors**, of two kinds:
1. The neighboring "Designation Group" column text had been merged
   into the designation `name` field for scattered rows (e.g.
   `"Junior HR Officer HR / Admin / Welfare /Compliance"`).
2. OCR-era typos inherited from the original scanned PDF (e.g.
   `"1E Executive"` → `IE Executive`, `"Patter Master"` → `Pattern
   Master`, `"Safely Inspector"` → `Safety Inspector`, `"Bl Analyst"`
   → `BI Analyst`, `"Qi Quail"` → `QI`).

All 564 names have been corrected in all three data files and
validated (JSON parses, JS syntax passes, count is still exactly 564).

## Live Dashboard — what it actually was, and what changed
The "Live Aquarium Dashboard" (`live-dashboard.js`, plus the stats bar
hardcoded inside `index.html`'s `liveDashboardPage()` template) was a
decorative canvas animation with **hardcoded, unchanging numbers**
(`tasks: 2845, kpi: 96.7, attendance: 10256, ...`) that were never
fetched from any backend and, in `live-dashboard.js`, never even
rendered anywhere.

Changed:
- Added a real `GET /api/v2/enterprise/live-stats` endpoint
  (`backend/routes/enterprise.js`) that computes actual counts from
  the SQLite tables: employee count, today's attendance count, active
  checklist items, today's completed checklist responses, policy
  document count, audit log count, and a computed KPI percentage.
- `live-dashboard.js` now calls this endpoint on load and every 30
  seconds (using the app's existing `api()` helper, so it respects
  the configured API base and auth token) and writes the results into
  the dashboard's stat tiles, which now have stable element IDs
  (`liveStat_tasks`, `liveStat_kpi`, etc.) instead of static text.
- If the backend is unreachable, the tiles show `…` rather than fake
  numbers — it does not fall back to invented data.

The animation itself (fish, bubbles, fountain, flowers, Bengali voice
narration) is still decorative/visual, by design — only the numeric
stat tiles were wired to real data.

## Vercel
This package had **no Vercel configuration at all** — it was built
for Firebase Hosting + Google Cloud Run only. Added `vercel.json` and
`.vercelignore` for a static-frontend deployment on Vercel, and
`VERCEL_SETUP_BN.md` explaining that the Express/better-sqlite3
backend cannot run as Vercel serverless functions and must stay on
Cloud Run (or similar) — the frontend's existing Settings-page
API-base mechanism is used to connect the two.

## Update — same day, second pass

### Designation → Department/Section
The source PDF genuinely does not assign each of the 564 designations
to one specific department/section — this is not something that can
be "completed" without inventing data, and doing so would contradict
the 2026-08-28 audit's own honest disclosure.

What the source DOES provide, and what was missed in the first pass:
a "Designation Group" column (22 categories, e.g. "HR / Admin /
Welfare / Compliance", "Sewing / Production") next to every one of
the 564 rows. This is now added as a real `group` field on every
designation in `enterprise-master-data.json`/`.js` (source-grounded,
not invented).

On top of that, `scale/SUGGESTED_GROUP_MAPPING.json` proposes a
department/section match for each of the 22 groups — this part IS a
heuristic built by this assistant, clearly labeled as such in the
file itself, and needs an authorized admin's review before being
treated as official. It is a starting point, not a verified fact.

`scale/RESPONSIBILITY_PROFILE_TEMPLATE_564.csv` — a ready-to-fill
spreadsheet, one row per designation, with id/name/group/suggested
department/suggested section pre-filled and all 20 responsibility
fields (Job Purpose, Daily Duties, KPI, etc.) left blank for an
authorized person to complete. No responsibility content was
invented — this only saves the manual work of listing 564 rows.

### Load/scale testing
Not run, and cannot honestly be claimed as run: this assistant has no
network access and there is no live deployment to point traffic at.
Added `scale/LOAD_TEST_k6.js` instead — a real k6 script wired to the
actual endpoints (`/api/auth/login`, `/api/v2/enterprise/live-stats`,
`/api/employees`), ready for the user to run once the app is
deployed somewhere reachable. Its own header comment says plainly
that it hasn't been executed yet.

### Still genuinely open
- Reviewing/approving the suggested group→department/section mapping
- Filling in the responsibility CSV with real job content
- Actually running the load test against a live deployment
- Everything else already flagged in the 2026-08-28 audit (managed
  PostgreSQL migration, object storage, disaster recovery, UAT)

These aren't being left out by oversight — they require either a live
running system or business decisions only the company can make, and
no zip file or one-session correction can substitute for that.
