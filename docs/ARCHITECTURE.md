# Architecture / Phase 1A

The five-route shell, CSS tokens, mobile navigation and schema v1 are inherited from Phase 0. Training and Nutrition files remain unchanged placeholders. Habits now owns repository writes, live-query reading, history pagination, calendar and insights components. Dashboard shares read-only insights/history; all totals come from actual records.

## Persistence and concurrency

Schema v2 extends v1 with the habitEntries.createdAt index and a habitState store. The control row holds the last quick-record timestamp and one undo command containing before/after record snapshots. No records are seeded or cleared. Tests open a genuine v1 database and verify its migration. Future migrations must append versions and test preservation; old schema code cannot downgrade a v2 database.

All writes include habitEntries and habitState in one read-write transaction, so a failed undo-journal write also rolls back the record. Quick adds are serialized across database connections and persist their 1500ms guard. Backfill dedup compares the exact event timestamp among entries created in that interval. Manual entries with different occurrence times remain independent.

Edit/delete compare the displayed record with the current stored version. Undo compares both the expected journal and current record before restoring or removing it. The journal survives page navigation/reload and only the latest create/edit/delete is reversible. Undo consumes the command, with no redo. Deleting a record therefore retains its before-snapshot locally until undo or a subsequent write replaces that command.

## Dates and presentation

Events are canonical UTC ISO timestamps; local day keys are computed at display time. Week boundaries start Monday; 7/30-day windows include today and the preceding 6/29 local dates, excluding future events. Date setters handle DST and year/month rollover. Input validation round-trips local fields to reject normalized invalid dates and nonexistent DST times; repeated hours have earlier/later selection. Unchanged edits preserve the original timestamp precision.

A timer and focus/visibility events refresh date-sensitive displays. History shows 20 records per page. Trend has an accessible table and calendar buttons include date/count text and selected/current-day states. Empty/loading/read-failure states are distinct. All records are currently loaded for local aggregation; large-history performance has not been qualified.

## Shared infrastructure

UserError contains only fixed, reviewed validation messages; safeMessage hides other exception text. useAction provides synchronous in-flight locking, busy state, success/error feedback and dismissible Toasts. Theme/humor preferences use transactional updates. These primitives, date utilities, schema migration patterns and CI can support later modules without sharing habit-derived health calculations.

Unit tests cover real fake-indexeddb transactions and migration, concurrent connections, stale writes/undo, failures and local-calendar edges. Existing Phase 0 tests remain as regressions with schema/UI expectations updated for the new behavior. Browser tests cover real Chrome desktop/mobile interactions, private-data request guards, failure injection and live midnight/month rollover. CI runs the required four quality checks with read-only permissions, without deployment.
