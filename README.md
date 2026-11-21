# JerkLog

Habits · Training · Nutrition. Privacy-first, browser-local self-management for adults.

**Phase 1A implements Habits only. Training and Nutrition remain placeholders.** [简体中文](README.zh-CN.md)

## Run and verify

Node.js >=22.18 and npm; CI uses Node 22.18.0.

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

After building, `npm run test:e2e` uses installed Google Chrome with desktop/mobile viewports and owns a local production preview on port 4173. Use a consistent browser and origin for your own data.

## Habits

Record now with a transactional 1.5-second accidental-double-click guard, backfill history, edit occurrence time, confirm deletion and undo the last create/edit/delete. Undo survives refresh; it rejects stale or conflicting changes rather than overwriting another tab. Identical backfill times also have a 1.5-second duplicate-submit guard.

Dashboard and Habits derive today, Monday-based week, inclusive 7/30 local-calendar-day totals, latest occurrence, a 30-day trend/table and paged history from actual IndexedDB records. A monthly heatmap displays daily counts and filters records by selected date. No demo entries, health scores or habit-to-nutrition/training inference.

Themes and optional humorous copy affect presentation only. Writes provide dismissible Toast feedback, synchronous submission locking and sanitized errors. Loading/read errors are not rendered as zero statistics. New York unit fixtures cover DST; Shanghai browser fixtures cover CRUD and local midnight/month transitions. Nonexistent local times are rejected, and repeated DST hours support earlier/later selection.

## Data and scope

Dexie schema v2 adds a createdAt index and a local habitState store for cooldown and the single undo operation. Version 1 records/settings are retained and migration-tested. No cloud, login, tracking, advertising SDK, private-data requests or sensitive console logging. Local storage is not encryption; clearing it can erase all records. Backup and offline cold startup are not implemented.

No automatic merge, deployment, Release, Training or Nutrition business implementation. See [architecture](docs/ARCHITECTURE.md), [privacy](docs/PRIVACY.md), [development plan](JERKLOG_CODEX_PLAN.md), and the Chinese README for detailed date/undo rules and reusable infrastructure.

This Windows sandbox may require approved execution outside the sandbox for dev dependency prebundling; native TypeScript config loading is enabled. The host's Kaspersky HTTP injection is blocked only inside isolated browser test contexts; all other unexpected application requests fail the privacy assertion. System antivirus settings are untouched. Physical mobile devices, Safari, offline cold startup and large-history performance are not verified. MIT; existing LICENSE retained.
