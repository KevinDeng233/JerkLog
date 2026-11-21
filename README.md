# JerkLog

Habits · Training · Nutrition. A privacy-first, browser-local React app for adults.

**Status: Phase 0 + Phase 1 only. Awaiting acceptance.** Not a complete PWA release.

[简体中文](README.zh-CN.md) · [Development plan](JERKLOG_CODEX_PLAN.md)

## Run

Use Node.js >=22.18 (verified on 26.13.0) and npm. From this directory:

```sh
npm ci
npm run dev
```

Open the printed local address. Always use the same browser and origin (scheme, host and port) to access your data.

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

The E2E smoke suite uses installed Google Chrome, desktop and mobile viewports, and starts a local production preview on port 4173. Build first. No browser download is required if Chrome is installed. Mobile emulation does not verify physical Android or iOS devices.

## Implemented

- Five hash-routed pages with responsive navigation, Chinese copy, dark/light/system themes and keyboard focus support.
- Habits: record, backfill, edit time, confirmed deletion, undo last deletion, recent 50 records and local-calendar day/week/30-day totals.
- Training: named basic plans and free/planned single-set records with exercise, reps and weight. Each save creates a completed single-set session atomically.
- Nutrition: manually created foods with source/state, grams and meal type; daily label-based kcal/macros with immutable record snapshots.
- IndexedDB through Dexie, schema v1; copy preferences also stored locally.

## Boundaries

No login, backend, tracking, ads or telemetry. No relationship is inferred between private habits and health, nutrition or training. Local storage is not encryption. Clearing browser storage can erase all records; backups are not implemented yet. This app is for self-management and does not replace medical advice.

Phase 2 templates, schedules, exercise/food libraries and recommendations; Phase 3 backup/import/reset and offline app-shell caching; Phase 4 CI and deployment are intentionally pending. Application startup without network is not guaranteed until Phase 3, although saved IndexedDB data survives refresh. No remote repository is configured and nothing is pushed, merged, deployed or released.

See [architecture](docs/ARCHITECTURE.md) and [privacy](docs/PRIVACY.md). MIT © 2026 KevinD.

## Verification environment

Verified with Windows, Node 26.13.0, npm 11.20.0 and installed Chrome. The four required checks pass, with 25 unit tests and two desktop/mobile browser workflows. Full dependency audit reports zero vulnerabilities at verification time.

This machine's Kaspersky antivirus injects a script into HTTP responses. The isolated E2E context blocks that identified injection host before execution, then rejects other external requests, XHR/fetch, WebSockets and non-GET requests. System antivirus settings are untouched; browser extensions and system software are outside the application's network guarantee.

Scripts use Node's native TypeScript config loading to avoid sandbox ancestor-directory discovery by esbuild (Node >=22.18). Dev dependency prebundling also required approved execution outside this sandbox; the dev UI passed a real Chrome startup check. Regular local terminals can run npm run dev directly. The E2E wrapper owns the Vite preview directly to avoid Windows shell child-process cleanup hangs. Loaded-page offline reads pass; offline cold startup, physical mobile devices, Safari and Firefox are unverified.
