# Architecture / Phase 1

- `src/app`: React shell, HashRouter, route focus, theme listener, local-storage failure boundary.
- `src/features`: separate dashboard, habits, training, nutrition and settings pages.
- `src/db`: typed entities, Dexie schema v1, validated writes and transactions.
- `src/lib`: pure local-calendar statistics and label-based nutrition calculations.
- `src/i18n`: Chinese navigation/copy catalog; English translation remains future work.
- `src/styles`: CSS tokens and responsive styles; no remote fonts or assets.
- `tests/unit`: calendar/DST, numeric rules, persistence, snapshots and transaction rollback with fake IndexedDB.
- `tests/e2e`: real Chrome, isolated synthetic browser records, refresh/navigation/settings/privacy smoke.

## Schema v1

Nine stores: habitEntries, workoutPlans, exercises, workoutSessions, workoutSets, foods, mealEntries, nutritionGoals, settings. Explicit UUID primary keys; events use ISO timestamps, meal dates use validated local `YYYY-MM-DD` keys. `nutritionGoals` is reserved but has no UI in Phase 1. Empty database starts without fabricated statistics or seed private data.

Future migration: append `db.version(2).stores(...).upgrade(tx => ...)`; never rewrite v1, reset user storage, or recover from errors by deleting the database. Test migrations with an actual prior-version fixture before shipping.

Workout writes validate input, then atomically save a custom exercise, completed session and set. Changing a plan does not mutate sets. Foods are independently stored; meal entries snapshot food name and calculated nutrients so later changes cannot rewrite history. kcal comes from the entered label, never from inferred macro totals. Internal calculations remain unrounded; display uses one decimal place.

Weeks start Monday. Last 30 days means today plus the preceding 29 local calendar days, excluding future events. Calendar boundaries use Date setters, not fixed millisecond day lengths. A timer and window focus refresh time-sensitive views after midnight.

## Security and scope

No app fetch/XHR, network writes, analytics, storage dumps or private values in URLs. CSP limits connections to same origin and the local Vite dev websocket. Production consists of static assets; it has no runtime API. React renders input as text; no raw HTML or dynamic code evaluation. Dependencies are exact-pinned with package-lock.json.

Deletion of a habit requires confirmation. Only the last deleted record in the mounted habits page can be undone; navigating away/reloading discards that undo buffer. Validation and storage failures produce UI feedback; write transactions roll back. Backup/reset UI, service workers and deployment workflows are deliberately absent until the later phases.
