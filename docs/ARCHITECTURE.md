# Architecture / Phase 1C

The existing React/TypeScript/Vite shell, HashRouter, UI tokens, theme settings, useAction feedback, safe errors and local-calendar utilities are reused. Habits and Training business logic is unchanged in Phase 1C. Nutrition owns pure calculators, a transactional repository, indexed reads, foods/diary/goals/recommendations folders and reactive views. No framework or runtime dependency was added.

## Nutrition schema v4 and preservation

Version 4 retains every prior store and the v1/v2/v3 definitions. It adds nutritionMeta and nutritionPreferences; foods indexes name/state, and mealEntries indexes localDate, mealType, foodId, createdAt and localDate/mealType. The old date index remains for legacy compatibility. The upgrade writes only foods, mealEntries and nutritionGoals. It never resets/deletes a database or writes Habits, habitState, Training or Settings. Real populated-v3 tests compare all those unrelated records exactly, then verify they remain unchanged after catalog initialization; an injected upgrade error proves rollback to the original v3 records/version.

Legacy scalar food nutrients become per100g; absent values stay null. String provenance is retained as legacySource and displayed as user/legacy provenance. Legacy meal snapshots held consumed nutrients, so they are converted to per100g using the original recorded grams, not today's food library. Original snapshot/fields remain retained for inspection. Unknown preparation/source remain explicit, and unavailable timestamps use an internal epoch sentinel rather than an invented meal time. The stored local date is preserved without UTC conversion; absent/invalid old dates remain reachable in a repair list. Missing goal fields become null.

The compact public catalog has stable FDC IDs and a version marker, initializes only on Nutrition entry, adds no private meals/goals/preferences, and never overwrites existing same-ID foods. Built-ins remain immutable. Source rows and reuse terms are documented in FOOD_SOURCES.md.

## Nutrition writes, calculations and dates

NutritionRepository owns write transactions over its five stores only. Revision checks reject stale food/meal/goal/preference edits. Stable meal IDs and a persisted 1500ms same-content signature serialize accidental duplicate writes across connections; failure rolls back entry/control changes together. History snapshots include name/state/per100g/provenance and optional brand/serving metadata. Editing grams/date/meal category changes the record while retaining its original food snapshot; food deletion never cascades to diary history.

All nutrients are number or null. Per100g × grams/100 is calculated independently for each field, preserving label kcal even when it differs from 4/4/9. Numeric bounds/precision and finite checks run before persistence; aggregation tracks known subtotal and missing entry count without per-entry rounding. Unknown totals and partial progress are visibly distinguished. Goals are independently optional and never inferred from zero or absent values.

Explicit Gregorian localDate is the diary grouping key; UTC createdAt is an audit timestamp. Calendar validation uses date components, including leap years, without interpreting dates as UTC instants. The date picker defaults to local today using the existing clock hook; an explicitly chosen day stays chosen across refresh/date changes within that view. No diary day is derived from slicing an ISO timestamp.

Read/seed failures show safe errors instead of invented counters. Reactive reads recalculate from persisted records. Recommendation rules read only explicit Nutrition preferences, selected-day known totals and goals, never Habits or Training. Adult estimation is pure, opt-in and transient; only an explicit draft application followed by save changes goals.

The existing project does not configure a service worker. Already-loaded page offline navigation/reading is verified; offline cold startup, backup/import, real Safari/device behavior and large-history performance remain outside the verified scope. Test data is synthetic. Kaspersky injection is blocked only within isolated Playwright contexts; system protection remains enabled.

## Schema v3

Versions 1 and 2 remain intact. Version 3 adds planDays (`id`, `planId`, compound planId/order) and trainingMeta (`id`); extends exercise, plan and session indexes; and adds explicit training creation/update timestamps and revisions. No Habits, habitState, settings or Nutrition table is written by the upgrade. Dexie executes the upgrade atomically; failure leaves the old version and data intact. Tests use an actual populated v2 database and a deliberately failed migration.

Legacy plan day strings are preserved as named, initially empty rest days: the old schema contained no exercise scheduling detail, so users can edit them into training days rather than inventing old programming. Legacy session/set names are captured from the currently available legacy catalog/plan; unavailable names are explicitly marked. Old sessions with endedAt become completed, those without become paused. Old numeric kg values (including 0) remain numeric weighted sets because their original intent cannot be inferred. Missing exercise/set timestamps use an internal epoch sentinel and are not presented as measured workout dates. Old completed-session duration reflects its available start/end; missing historical pauses cannot be reconstructed. These rules preserve existing facts without claiming unrecorded history.

The public exercise catalog has stable builtin IDs and an idempotent catalogVersion marker. Seeding runs when entering Training and never creates private workout records. Existing same-ID data is not overwritten.

## Plans and snapshots

WorkoutPlan retains ordered day IDs, name, goal and archive flag. PlanDay holds an ordered array of planned exercise IDs, sets, rep range and notes, and is either training or rest. Templates are independent drafts copied before save; duplicated plans get new plan/day/exercise-row IDs. Deleting plans cascades only to their current planDays. Referenced custom exercises must be removed from plans before catalog deletion; history is rendered from snapshots.

Starting a session captures plan/day names and planned exercise names/targets/notes. Ad-hoc exercises are snapshotted when first logged. Each set also retains its exercise name. Editing or deleting a source plan/exercise cannot rewrite already started/completed session context.

## Session transitions and writes

A session is active, paused or completed. Activity intervals persist start/end instants and exclude pauses from effective duration. New sessions require no other unfinished session. Empty sessions can be abandoned; at least one completed set is required to finish. Completed sessions are read-only in the current UI.

Repository writes run read-write transactions over Training tables only. Numeric and text validation precede persistence. Revision checks reject stale edits, deletes and state transitions. Stable set IDs and a persisted 1500ms identical-set signature guard reject accidental duplicates; rapid plan copies have a similar guard. Failed control writes roll back their set/session changes. Multi-connection tests verify start/dedup serialization.

The UI accepts kg with up to three decimals, storing kg and integer grams. Weighted volume sums integer grams × integer repetitions then divides by 1000; bodyweight/loadless loads are null and excluded. There is no pounds conversion or guessed body mass. Volume is descriptive only. RPE and RIR are optional and mutually exclusive.

## Reading and dates

Training read queries are separated and schema-index tested. Read/seed failures show usable errors instead of fabricated empty success. Weekly counts use completion timestamps from local Monday midnight through now; display uses local dates but persistence uses UTC instants. Existing clock/focus refresh behavior is reused. No Habits data enters Training calculations.

Plan/history screens paginate or scroll where appropriate; current implementation loads local collections for aggregation and has not been performance-qualified for large histories. Browser tests cover the task's full acceptance flow in desktop and mobile viewports, both themes/copy modes, private request assertions and a Habits regression. System security tools are not disabled.
