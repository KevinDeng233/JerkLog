# JerkLog

Habits · Training · Nutrition. A privacy-first, local-first app for adults.

**Phase 0: project foundation only.** Business recording features are not implemented in this branch. [简体中文](README.zh-CN.md)

## Development

Use Node.js >=22.18 and npm (CI uses Node 22.18.0).

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

Optional browser verification requires installed Google Chrome; run `npm run build` then `npm run test:e2e`. The wrapper owns a local Vite preview and tests desktop/mobile viewports. This is not physical mobile or Safari verification.

## Included

React + strict TypeScript + Vite, five HashRouter pages, desktop sidebar/mobile navigation, dark/light/system themes, CSS tokens, a Chinese copy catalog and humor-mode extension field. The three domain pages show explicit placeholders with disabled actions. Dashboard statistics use an em dash, not fabricated numbers. Only theme preferences are written to IndexedDB.

Dexie schema v1 declares the nine planned stores without seeding personal data. Existing records are never cleared. Vitest tests schema initialization, preference persistence/rollback and theme resolution. GitHub Actions runs clean installation, lint, typecheck, tests and build with read-only permissions; it does not deploy or publish.

## Structure

```text
.github/workflows/ci.yml
src/
  app/                 # shell, routes, theme, storage failure UI
  components/          # shared UI and explicit placeholders
  db/                  # typed schema v1 and theme preferences
  features/
    dashboard/
    habits/
    training/
    nutrition/
    settings/
  i18n/                # Chinese copy and future humor interface
  lib/                 # theme resolution and action feedback
  styles/              # theme tokens and responsive layout
  main.tsx
tests/
  unit/                # foundation regression tests
  e2e/                 # navigation, themes, privacy smoke
scripts/e2e.mjs
```

## Scope and privacy

No login, cloud, telemetry or advertising SDK. Local storage is not encryption; clearing browser data may erase preferences. The app does not infer health, nutrition or training conclusions from private habits. Self-management only; not medical advice.

Phase 1 record CRUD, statistics, training writes and nutrition calculations remain pending. Templates, backup/import, offline app-shell caching, deployment and releases are outside this PR. See [architecture](docs/ARCHITECTURE.md), [privacy](docs/PRIVACY.md) and [development plan](JERKLOG_CODEX_PLAN.md).

Native TypeScript config loading avoids esbuild config-bundling restrictions on this Windows sandbox. Dev dependency prebundling may still require an approved run outside that sandbox; ordinary local terminals can run `npm run dev` directly. This host's Kaspersky injects a script into HTTP responses; isolated browser tests abort that identified injection host and reject all other unexpected application requests. No antivirus settings are modified.

MIT; the existing main-branch LICENSE is retained.
