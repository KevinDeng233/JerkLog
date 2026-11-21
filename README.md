# JerkLog

Habits · Training · Nutrition. A privacy-first, local-first app for adult self-management.

**Phase 1C: Nutrition Lab**, retaining Phase 1A Habits and Phase 1B Training. [简体中文](README.zh-CN.md)

## Development

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

After building, `npm run test:e2e` uses installed Google Chrome with desktop/mobile viewports and owns a local preview on port 4173. Use the same browser, scheme, host and port to access the same local records.

## Nutrition Lab

- Six small, independently verified USDA SR Legacy food rows, with visible identifiers, source URLs, publication date and CC0 provenance. Search/filter by preparation state; no implicit raw/cooked conversion. Custom foods support create/edit/archive/restore/delete, explicit label/user provenance and optional defined serving grams.
- Breakfast/lunch/dinner/snack diary with explicit grams or known servings, selected local calendar date, editing and confirmed deletion. Immutable food snapshots preserve history after food edits/deletion.
- Persisted entry → meal → daily kcal/protein/carbs/fat calculations. Missing values stay unknown; partial totals are labeled. Label kcal is retained independently of macro-derived energy.
- Optional manual daily goals, individually unsettable, with real progress. An optional adult Mifflin–St Jeor maintenance estimator fills only a draft after explicit action; saving is separate. Parameters stay transient.
- Optional, explainable meal ideas based on explicit direction, preferences/restrictions and known diary values. No Habits/Training inputs or medical inference.
- Existing responsive dark/light shell, serious/humorous copy, keyboard-accessible dialogs, safe errors, local persistence, revision conflict checks and transactional duplicate protection.

See [food sources and exact rows](FOOD_SOURCES.md), [Phase 1C acceptance report](docs/ACCEPTANCE_PHASE_1C.md), [architecture](docs/ARCHITECTURE.md), [privacy](docs/PRIVACY.md) and [task](JERKLOG_PHASE_1C_CODEX.md).

## Existing modules and storage

Habits retains timestamped logging/backfill/edit/delete/undo, actual statistics, trends and calendar. Training retains its offline exercise catalog, editable plans/templates, planned/ad-hoc sessions, kg/bodyweight sets, pause/resume, history snapshots and descriptive statistics. Completed workouts remain read-only. [Phase 1B report](docs/ACCEPTANCE_PHASE_1B.md) documents its behavior and limitations.

Schema v4 preserves all previous stores, migrates legacy Nutrition without resetting the database, and adds Nutrition preferences/control stores. Tests verify populated v3 Habits/Training/Settings preservation and failed-upgrade rollback. No Habits or Training business logic is rewritten.

No backend, accounts, analytics, ads, telemetry, runtime food API or sensitive console logging. Private records remain in local IndexedDB; local storage is not encryption and clearing browser data may erase records. Backup/import and service-worker offline cold startup are not implemented. Offline reading/navigation in an already-loaded page is tested; physical phones, Safari and large-history performance remain unverified.

This host's Kaspersky HTTP injection is blocked only inside isolated browser tests; system protection remains enabled. MIT; existing LICENSE retained. Phase 1C ends at a Draft PR: no automatic merge, deployment or Release.
