# JerkLog

Habits · Training · Nutrition. A privacy-first, local-first app for adult self-management.

**Phase 1B: Training Lab**, retaining Phase 1A Habits. Nutrition remains a placeholder. [简体中文](README.zh-CN.md)

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

After building, `npm run test:e2e` uses installed Google Chrome with desktop/mobile viewports and owns a local preview on port 4173.

## Training Lab

- Offline exercise catalog with idempotent seeding, search/filter and custom exercise CRUD.
- Editable full-body, upper/lower, push-pull-legs and four-day split templates; arbitrary named training/rest days, ordered exercises, planned sets and rep ranges. Plans support duplicate, archive/restore and confirmed deletion.
- Planned/ad-hoc sessions, editable/deletable sets, kg or explicit bodyweight/loadless modes, optional RPE/RIR and notes, persistent pause/resume and completion timestamps.
- Real weekly completion counts, latest session, paged history, active duration and descriptive logged volume. Exercise and plan snapshots preserve history through later catalog/plan changes.
- Reused dark/light themes, humorous/serious copy, local validation/errors and keyboard navigation. Completed sessions are read-only in this phase; correct sets before finishing.

Input/display units are kg (three decimals). Integer grams support volume arithmetic. Bodyweight/loadless records have null load and are excluded from weighted volume; no body mass is guessed. Volume is not a comprehensive measure of training stimulus. Training is independent of Habits and does not infer health, recovery or calories from private habit records.

Schema v3 adds planDays/trainingMeta and forward-migrates training fields. No Habits, habitState, settings or Nutrition records are modified by migration. Tests demonstrate real v2 preservation and failed-upgrade rollback. See [architecture](docs/ARCHITECTURE.md), [privacy](docs/PRIVACY.md), [acceptance report](docs/ACCEPTANCE_PHASE_1B.md) and [task](JERKLOG_PHASE_1B_CODEX.md).

No backend, accounts, analytics, ads, telemetry, personal-data requests or sensitive console logging. Local storage is not encryption; clearing the browser may erase records. Backup/import, Nutrition business logic and offline PWA startup remain out of scope. No automatic merge, deployment or Release.

This host's Kaspersky HTTP injection is blocked only inside isolated browser tests; system security controls remain enabled. Windows dev prebundling may require approved execution outside the sandbox. Physical mobile devices, Safari, PWA offline behavior and large-history performance are unverified. MIT; existing LICENSE retained.
