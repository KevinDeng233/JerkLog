# JerkLog — Phase 1B: Training Lab (Codex Task)

## Mission

Continue development of the existing **JerkLog** repository. Build a usable, local-first **Training Lab** for workout planning and workout logging. **This task is limited to Phase 1B.** Do not implement Nutrition business logic or rewrite the existing Habits module.

Read `JERKLOG_CODEX_PLAN.md`, `README.md`, the current source code and tests before changing anything. If the plan differs from the actual merged code, state the discrepancy and preserve working behavior. Work from the latest `main` on a new feature branch such as `feat/training-lab-phase-1b`. Verify the current git state; do not assume earlier work is merged merely because a branch exists.

## 1. Required features

### A. Exercise library

- Seed a small offline exercise catalog: barbell bench press, incline dumbbell press, squat, Romanian deadlift, deadlift, lat pulldown, row, overhead press, lateral raise, leg press, biceps curl, triceps pushdown, etc.
- Each exercise has an ID, localized display name, primary muscle group, equipment category, and optional notes.
- Support searching/filtering and user-created exercises. Avoid relying on external APIs or remote images.
- Do not duplicate seed entries across repeated app launches or migrations.

### B. Workout plans

- Create, view, edit, duplicate, archive and delete workout plans.
- Plans include a name, optional goal, and schedule days. Each day can be a training day or rest day, and training days contain an ordered exercise list with planned sets, reps or rep range, and optional notes.
- Include editable templates for full-body, upper/lower, push-pull-legs, and 4-day chest/back/shoulders/legs; these are examples, not universal prescriptions.
- Allow changing day names, order and exercises; avoid tying scheduling to fixed weekdays only.
- Before destructive deletion of a plan, show confirmation. Historical completed workouts must remain available when a plan is deleted.

### C. Workout session log

- Start a session from a plan day or start an ad-hoc session.
- Log individual sets with repetitions, load (kg), optional RPE or RIR, and notes. Support editing/deleting sets.
- Pause/resume and finish a session; use explicit timestamps rather than assuming a duration from the UI state.
- Show the latest session history with date, exercises, sets, and total logged volume (sum of load × reps for eligible sets). Explain that volume is a simple descriptive metric, not an all-purpose measure of training stimulus.
- Support both bodyweight or loadless sets and conventional weighted sets without inventing a numeric load.
- Protect against accidental duplicate writes from rapid clicks and duplicate submits.

### D. Training dashboard

- Show this week's completed sessions, most recent session, and recent workout history, calculated from IndexedDB.
- Provide an empty state, error state, responsive mobile/desktop layout, and both serious and humorous copy modes without shame-based messages.
- Preserve the established theme, navigation, UI components, and localization patterns.

## 2. Data and architecture

- Continue using **React + TypeScript + Vite + Dexie/IndexedDB** and existing established project conventions. Prefer extending existing utilities/components instead of introducing redundant frameworks.
- Extend the IndexedDB schema via a **forward-only, non-destructive Dexie migration**. Never delete or reset existing Habits data.
- Suggested entities (adapt to existing schema conventions): `exercises`, `workoutPlans`, `planDays`, `workoutSessions`, `workoutSets`.
- Include stable unique IDs, schema versioning, created/updated timestamps, appropriate indexes, and data validation.
- Persist a snapshot of exercise names and plan context needed to render historical sessions after exercise or plan edits/deletions; do not silently rewrite history.
- For scheduling and date displays, handle local calendar dates, timezones, and midnight boundaries deliberately; store UTC instants where appropriate.
- Log load with a consistent internal unit (kg) and document any user-facing conversions. Do not use floating point equality for business-critical checks.
- Ensure CRUD errors surface as usable messages and never swallow IndexedDB failures silently.
- Keep Training data independent of Habits data. No automatic correlation between masturbation records and exercise performance, recovery, caloric intake, or health status.
- No cloud sync, telemetry, ads, analytics SDKs, account system, or network upload of private records.

## 3. UI / UX

- Implement a working Training page with **Plans**, **Exercises**, **Current Session**, and **History** views (tabs or routes in the project's existing style).
- Follow the project's current dark/light themes and responsive shell.
- Ensure mobile touch targets, keyboard navigation, labels, visible focus, confirmation for destructive actions, and readable contrast.
- Avoid placeholder-only interfaces for the required features; all persisted screens must be wired to real IndexedDB data.
- Do not use copyrighted images without rights or remote image dependencies.

## 4. Out of scope for Phase 1B

- Nutrition food diary, calorie targets and personalized meal recommendations.
- AI coaching, automatic progressive overload prescriptions, injury/medical diagnosis, cloud sync, social leaderboards, and wearables integrations.
- Major dependency upgrades unrelated to this task, sweeping UI redesigns or refactoring of stable Habits logic.

## 5. Tests and acceptance criteria

Write meaningful unit/integration tests for:

- Plan/template CRUD and exercise ordering.
- Exercise creation, filtering, and duplicate seed prevention.
- Session start, set edit/delete, finish, persistence after reload, and history render after plan/exercise modification.
- Weekly-session counts, date boundaries and volume calculations.
- Input validation for negative loads, invalid repetitions, missing names, optional bodyweight sets, duplicate submissions.
- Dexie migration from existing schema, **demonstrably preserving existing Habits entries and settings**.

Run the repository's existing verification scripts and report **actual** results:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If available, run relevant E2E smoke tests for desktop and mobile layouts. Do not disable Kaspersky or system security controls to force a browser test to pass. Explicitly report untested real-device Safari/PWA behavior and any AV-related environment issue instead of claiming it passed.

### Manual acceptance path

1. Create a custom exercise and an editable 4-day plan.
2. Configure day 1 with bench press and incline dumbbell press.
3. Start day 1, log multiple sets and weights, edit one set, finish session.
4. Reload: verify plan and session persisted.
5. Check history, weekly count and volume calculations.
6. Edit or archive the plan: history remains readable.
7. Verify the existing Habits recording and statistics are unchanged.

## 6. Delivery / Git discipline

- Branch from the up-to-date `main` and create a **Draft PR** targeting `main` when finished.
- Do not directly push commits to `main`; do not merge PRs, deploy, create a Release or begin Phase 1C without explicit permission.
- Show a concise summary of changed files, implementation, schema migration strategy, actual commands/results, known limitations, and the PR link if created.
- If blocked, explain the blocker and deliver the smallest safe, tested subset; don't claim unfinished features are done.

**Stop after Phase 1B and await review.**
