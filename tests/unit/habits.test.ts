import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JerkLogDB, defaultSettings } from '../../src/db/database';
import {
  HabitRepository,
  QUICK_COOLDOWN_MS,
} from '../../src/features/habits/repository';
import { UserError, safeMessage } from '../../src/lib/errors';
let database: JerkLogDB;
let repo: HabitRepository;
let now: number;
beforeEach(() => {
  database = new JerkLogDB(`habits-${crypto.randomUUID()}`);
  now = Date.parse('2026-11-21T12:00:00.000Z');
  repo = new HabitRepository(database, () => new Date(now));
});
afterEach(async () => {
  await database.delete();
});
async function undo() {
  const state = await database.habitState.get('control');
  await repo.undo(state!.undo!);
}
describe('Habits CRUD and persistent undo', () => {
  it('creates, reads and undoes an event with stable id and ISO timestamps', async () => {
    const event = await repo.add();
    expect(await database.habitEntries.get(event.id)).toEqual(event);
    expect(event.occurredAt).toBe(new Date(now).toISOString());
    expect(event.createdAt).toBe(event.updatedAt);
    await undo();
    expect(await database.habitEntries.count()).toBe(0);
    expect((await database.habitState.get('control'))?.undo).toBeUndefined();
  });
  it('backfills and edits event time without changing createdAt or id, then undoes edit', async () => {
    const event = await repo.add('2020-01-01T00:00:00.000Z');
    now += 10000;
    await repo.edit(event, '2020-01-02T00:00:00.000Z');
    const changed = await database.habitEntries.get(event.id);
    expect(changed).toEqual({
      ...event,
      occurredAt: '2020-01-02T00:00:00.000Z',
      updatedAt: new Date(now).toISOString(),
    });
    await undo();
    expect(await database.habitEntries.get(event.id)).toEqual(event);
  });
  it('deletes and restores exact entry, including across database reopen', async () => {
    const event = await repo.add();
    await repo.remove(event);
    expect(await database.habitEntries.count()).toBe(0);
    database.close();
    await database.open();
    repo = new HabitRepository(database, () => new Date(now));
    await undo();
    expect(await database.habitEntries.get(event.id)).toEqual(event);
  });
  it('persists records after reopening through another connection', async () => {
    const event = await repo.add();
    const name = database.name;
    database.close();
    database = new JerkLogDB(name);
    await database.open();
    expect(await database.habitEntries.get(event.id)).toEqual(event);
  });
  it.each(['bad', '2999-01-01T00:00:00.000Z', '2026-02-30T00:00:00.000Z'])(
    'rejects invalid or future input %s with no write',
    async (value) => {
      await expect(repo.add(value)).rejects.toThrow(UserError);
      expect(await database.habitEntries.count()).toBe(0);
      expect(await database.habitState.count()).toBe(0);
    },
  );
  it('rejects stale edit and delete rather than overwriting a concurrent edit', async () => {
    const event = await repo.add();
    await repo.edit(event, '2020-01-01T00:00:00.000Z');
    await expect(repo.edit(event, '2020-02-01T00:00:00.000Z')).rejects.toThrow(
      '其他页面',
    );
    await expect(repo.remove(event)).rejects.toThrow('其他页面');
  });
  it('rejects stale undo when another operation replaced the journal', async () => {
    await repo.add();
    const old = (await database.habitState.get('control'))!.undo!;
    now += 2000;
    await repo.add();
    await expect(repo.undo(old)).rejects.toThrow('最近操作');
    expect(await database.habitEntries.count()).toBe(2);
  });
  it('does not undo an entry changed outside the repository', async () => {
    const event = await repo.add();
    await database.habitEntries.update(event.id, {
      occurredAt: '2020-01-01T00:00:00.000Z',
    });
    await expect(undo()).rejects.toThrow('无法安全撤销');
    expect(await database.habitEntries.count()).toBe(1);
  });
  it('rolls back both event and control state when journal write fails', async () => {
    database.habitState.hook('creating', () => {
      throw new Error('sensitive simulated error');
    });
    await expect(repo.add()).rejects.toThrow();
    expect(await database.habitEntries.count()).toBe(0);
    expect(await database.habitState.count()).toBe(0);
  });
  it('rolls back delete if saving undo fails', async () => {
    const event = await repo.add();
    database.habitState.hook('updating', () => {
      throw new Error('storage unavailable');
    });
    await expect(repo.remove(event)).rejects.toThrow();
    expect(await database.habitEntries.get(event.id)).toEqual(event);
  });
  it('migrates a real v1 database without losing records or settings', async () => {
    const name = `legacy-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      habitEntries: 'id, occurredAt',
      workoutPlans: 'id, createdAt',
      exercises: 'id, name',
      workoutSessions: 'id, startedAt, planId',
      workoutSets: 'id, sessionId, exerciseId',
      foods: 'id, name',
      mealEntries: 'id, date, foodId',
      nutritionGoals: 'id',
      settings: 'id',
    });
    const entry = {
      id: 'legacy',
      occurredAt: '2020-01-01T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    };
    await legacy.table('habitEntries').add(entry);
    await legacy.table('settings').put({ ...defaultSettings, humorMode: true });
    legacy.close();
    const upgraded = new JerkLogDB(name);
    try {
      await upgraded.open();
      expect(upgraded.verno).toBe(4);
      expect(await upgraded.habitEntries.get('legacy')).toEqual(entry);
      expect((await upgraded.settings.get('default'))?.humorMode).toBe(true);
      expect(
        await upgraded.habitEntries
          .where('createdAt')
          .equals(entry.createdAt)
          .count(),
      ).toBe(1);
    } finally {
      await upgraded.delete();
    }
  });
});
describe('accidental duplicate protection', () => {
  it('serializes concurrent clicks across two database connections', async () => {
    const second = new JerkLogDB(database.name);
    const other = new HabitRepository(second, () => new Date(now));
    try {
      const results = await Promise.allSettled([
        repo.add(),
        other.add(),
        repo.add(),
        other.add(),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(await database.habitEntries.count()).toBe(1);
    } finally {
      second.close();
    }
  });
  it('retains cooldown after reopen and permits another event after the interval', async () => {
    await repo.add();
    database.close();
    await database.open();
    await expect(repo.add()).rejects.toThrow('刚刚');
    now += QUICK_COOLDOWN_MS;
    await repo.add();
    expect(await database.habitEntries.count()).toBe(2);
  });
  it('guards double submissions of identical backfill times without rejecting distinct events', async () => {
    const time = '2020-01-01T00:00:00.000Z';
    const results = await Promise.allSettled([repo.add(time), repo.add(time)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await repo.add('2020-01-01T00:00:01.000Z');
    expect(await database.habitEntries.count()).toBe(2);
  });
  it('allows retry after a failed transaction', async () => {
    const fail = () => {
      throw new Error('synthetic failure');
    };
    database.habitEntries.hook('creating', fail);
    await expect(repo.add()).rejects.toThrow();
    database.habitEntries.hook('creating').unsubscribe(fail);
    await repo.add();
    expect(await database.habitEntries.count()).toBe(1);
  });
});
it('redacts unknown storage errors while allowing fixed validation feedback', () => {
  expect(safeMessage(new Error('PRIVATE DATA'))).not.toContain('PRIVATE DATA');
  expect(safeMessage(new UserError('请选择时间。'))).toBe('请选择时间。');
  expect(safeMessage(null)).toContain('本地数据操作失败');
});
