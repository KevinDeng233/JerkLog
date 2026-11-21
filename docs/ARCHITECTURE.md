# Phase 0 architecture

React shell and HashRouter live in `src/app`; each of the five pages has a separate feature folder. Common headings, metrics and explicit module placeholders are shared components. CSS variables provide default dark, light and system themes; no remote fonts or assets are required.

Dexie schema v1 declares habitEntries, workoutPlans, exercises, workoutSessions, workoutSets, foods, mealEntries, nutritionGoals and settings. UUID and timestamp contracts are typed in models.ts. Domain stores remain empty in a new installation. Phase 0 only reads/writes theme preferences; humorMode is reserved for later work. No domain CRUD, statistics or nutrition calculations are present.

Schema migration policy: append a new version and transactional .upgrade() when persisted data changes; never rewrite an existing schema or clear browser data to resolve failures. The existing Phase 1 branch uses the same v1 schema, so opening this foundation must not wipe its data. Tests verify preference updates preserve pre-existing records and extension fields.

Preferences are written transactionally. The UI updates optimistically and reverts on storage failure, while an error boundary handles unavailable IndexedDB. System preference changes are observed through matchMedia. Route changes focus main content; the skip link focuses main without altering the hash route.

Vitest covers real storage boundaries through fake-indexeddb and pure theme resolution. Browser smoke verifies all five routes, disabled business actions, theme persistence/system changes, layout width, keyboard focus, empty domain stores and no unexpected application requests. All fixtures are synthetic and isolated.

GitHub Actions uses pinned checkout/setup-node action SHAs, read-only contents permission, Node 22.18.0 and npm ci. Every lint/typecheck/test/build step must pass; no continue-on-error, skipped tests, deployment credentials or publish step is configured. Browser smoke is optional locally and is not claimed as part of this basic CI.
