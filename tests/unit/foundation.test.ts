import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JerkLogDB, defaultSettings } from '../../src/db/database';
import { saveTheme } from '../../src/db/preferences';
import { resolveTheme } from '../../src/lib/theme';
let database: JerkLogDB;
beforeEach(() => {
  database = new JerkLogDB(`foundation-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});
describe('Phase 0 database foundation', () => {
  it('opens schema v1 with empty domain stores and no seeded personal data', async () => {
    await database.open();
    expect(database.verno).toBe(1);
    expect(database.tables.map((table) => table.name).sort()).toEqual(
      [
        'habitEntries',
        'workoutPlans',
        'exercises',
        'workoutSessions',
        'workoutSets',
        'foods',
        'mealEntries',
        'nutritionGoals',
        'settings',
      ].sort(),
    );
    for (const table of database.tables) expect(await table.count()).toBe(0);
  });
  it('retains theme after closing and reopening IndexedDB', async () => {
    await saveTheme('light', database);
    database.close();
    await database.open();
    expect(await database.settings.get('default')).toEqual({
      ...defaultSettings,
      theme: 'light',
    });
  });
  it('preserves extension settings and existing domain records when changing theme', async () => {
    await database.settings.put({
      ...defaultSettings,
      humorMode: true,
      goal: 2,
    });
    const entry = {
      id: 'synthetic',
      occurredAt: '2020-01-01T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    };
    await database.habitEntries.add(entry);
    await saveTheme('system', database);
    expect(await database.settings.get('default')).toEqual({
      ...defaultSettings,
      humorMode: true,
      goal: 2,
      theme: 'system',
    });
    expect(await database.habitEntries.get(entry.id)).toEqual(entry);
  });
  it('rejects invalid runtime themes without modifying settings', async () => {
    await saveTheme('dark', database);
    // Simulates unchecked input at a JavaScript boundary.
    await expect(saveTheme('bad' as 'dark', database)).rejects.toThrow(
      '请选择有效主题',
    );
    expect((await database.settings.get('default'))?.theme).toBe('dark');
  });
  it('rolls back failed preference writes', async () => {
    await saveTheme('dark', database);
    database.settings.hook('updating', () => {
      throw new Error('synthetic storage failure');
    });
    await expect(saveTheme('light', database)).rejects.toThrow();
    expect((await database.settings.get('default'))?.theme).toBe('dark');
  });
});
describe('theme resolution', () => {
  it.each([
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ] as const)(
    'resolves %s with system dark=%s to %s',
    (mode, systemDark, expected) => {
      expect(resolveTheme(mode, systemDark)).toBe(expected);
    },
  );
});
