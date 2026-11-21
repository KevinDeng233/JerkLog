import { db, type JerkLogDB } from '../../db/database';
import type { HabitEntry, HabitState } from '../../db/models';
import { UserError } from '../../lib/errors';
export const QUICK_COOLDOWN_MS = 1500;
function same(a: HabitEntry | undefined, b: HabitEntry | undefined) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function instant(value: string, now: Date) {
  const date = new Date(value);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() < 1 ||
    date > now ||
    date.toISOString() !== value
  )
    throw new UserError('记录时间无效或晚于现在。');
  return date.toISOString();
}
export class HabitRepository {
  constructor(
    private database: JerkLogDB = db,
    private clock: () => Date = () => new Date(),
  ) {}
  async add(occurredAt?: string) {
    return this.database.transaction(
      'rw',
      this.database.habitEntries,
      this.database.habitState,
      async () => {
        const now = this.clock();
        const state = (await this.database.habitState.get('control')) ?? {
          id: 'control' as const,
        };
        if (occurredAt === undefined && state.lastQuickAt !== undefined) {
          const elapsed = now.getTime() - state.lastQuickAt;
          if (elapsed >= 0 && elapsed < QUICK_COOLDOWN_MS)
            throw new UserError('刚刚已记录，请稍候再试。');
        }
        const iso = now.toISOString();
        const entry: HabitEntry = {
          id: crypto.randomUUID(),
          occurredAt: instant(occurredAt ?? iso, now),
          createdAt: iso,
          updatedAt: iso,
        };
        if (
          occurredAt !== undefined &&
          (await this.database.habitEntries
            .where('createdAt')
            .between(
              new Date(now.getTime() - QUICK_COOLDOWN_MS).toISOString(),
              iso,
              false,
              true,
            )
            .filter((existing) => existing.occurredAt === entry.occurredAt)
            .count())
        ) {
          throw new UserError('刚刚已保存相同时间，请勿重复提交。');
        }
        await this.database.habitEntries.add(entry);
        await this.database.habitState.put({
          ...state,
          undo: { after: entry },
          ...(occurredAt === undefined ? { lastQuickAt: now.getTime() } : {}),
        });
        return entry;
      },
    );
  }
  async edit(expected: HabitEntry, value: string) {
    return this.change(expected, {
      ...expected,
      occurredAt: instant(value, this.clock()),
      updatedAt: this.clock().toISOString(),
    });
  }
  async remove(expected: HabitEntry) {
    return this.change(expected, undefined);
  }
  private async change(expected: HabitEntry, after: HabitEntry | undefined) {
    await this.database.transaction(
      'rw',
      this.database.habitEntries,
      this.database.habitState,
      async () => {
        const before = await this.database.habitEntries.get(expected.id);
        if (!same(before, expected))
          throw new UserError('记录已在其他页面更改，请重新选择后再操作。');
        const state = (await this.database.habitState.get('control')) ?? {
          id: 'control' as const,
        };
        if (after) await this.database.habitEntries.put(after);
        else await this.database.habitEntries.delete(expected.id);
        await this.database.habitState.put({
          ...state,
          undo: { before, after },
        });
      },
    );
  }
  async undo(expected: NonNullable<HabitState['undo']>) {
    await this.database.transaction(
      'rw',
      this.database.habitEntries,
      this.database.habitState,
      async () => {
        const state = await this.database.habitState.get('control');
        if (
          !state?.undo ||
          JSON.stringify(state.undo) !== JSON.stringify(expected)
        )
          throw new UserError('最近操作已变化，请查看更新后重试。');
        const operation = state.undo;
        const entryId = (operation.after ?? operation.before)!.id;
        const current = await this.database.habitEntries.get(entryId);
        if (!same(current, operation.after))
          throw new UserError('这条记录已更改，无法安全撤销。');
        if (operation.before)
          await this.database.habitEntries.put(operation.before);
        else await this.database.habitEntries.delete(entryId);
        await this.database.habitState.put({ ...state, undo: undefined });
      },
    );
  }
}
export const habits = new HabitRepository();
