import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { JerkLogDB, defaultSettings } from '../../src/db/database';
import { TrainingRepository } from '../../src/features/training/repository';
const stores = {
  habitEntries: 'id, occurredAt, createdAt',
  habitState: 'id',
  workoutPlans: 'id, createdAt',
  exercises: 'id, name',
  workoutSessions: 'id, startedAt, planId',
  workoutSets: 'id, sessionId, exerciseId',
  foods: 'id, name',
  mealEntries: 'id, date, foodId',
  nutritionGoals: 'id',
  settings: 'id',
};
it('upgrades v2 training data while exactly preserving Habits, undo state, settings and Nutrition', async () => {
  const name = `migration-${crypto.randomUUID()}`;
  const old = new Dexie(name);
  old.version(2).stores(stores);
  const stamp = '2026-11-20T12:00:00.000Z';
  const habit = {
    id: 'habit-fixture',
    occurredAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
  const control = {
    id: 'control',
    lastQuickAt: 123456,
    undo: { after: habit },
  };
  const settings = {
    ...defaultSettings,
    theme: 'light',
    humorMode: true,
    goal: 3,
  };
  const food = { id: 'food-fixture', name: '仅用于迁移测试的既有数据' };
  await old.table('habitEntries').add(habit);
  await old.table('habitState').add(control);
  await old.table('settings').add(settings);
  await old.table('foods').add(food);
  await old.table('exercises').add({
    id: 'old-exercise',
    name: '旧动作',
    muscleGroups: ['胸'],
    equipment: '哑铃',
    isCustom: true,
  });
  await old.table('workoutPlans').add({
    id: 'old-plan',
    name: '旧计划',
    days: ['自定日'],
    createdAt: stamp,
  });
  await old.table('workoutSessions').add({
    id: 'old-session',
    planId: 'old-plan',
    startedAt: stamp,
    endedAt: stamp,
  });
  await old.table('workoutSets').add({
    id: 'old-set',
    sessionId: 'old-session',
    exerciseId: 'old-exercise',
    reps: 10,
    weightKg: 20.5,
    completed: true,
  });
  old.close();
  const upgraded = new JerkLogDB(name);
  try {
    await upgraded.open();
    expect(upgraded.verno).toBe(3);
    expect(await upgraded.habitEntries.toArray()).toEqual([habit]);
    expect(await upgraded.habitState.get('control')).toEqual(control);
    expect(await upgraded.settings.get('default')).toEqual(settings);
    expect(await upgraded.foods.get('food-fixture')).toEqual(food);
    const set = (await upgraded.workoutSets.get('old-set'))!;
    expect(set.weightKg).toBe(20.5);
    expect(set.weightGrams).toBe(20500);
    expect(set.exerciseName).toBe('旧动作');
    expect((await upgraded.workoutSessions.get('old-session'))?.planName).toBe(
      '旧计划',
    );
    expect((await upgraded.planDays.toArray())[0].name).toBe('自定日');
    const repo = new TrainingRepository(upgraded);
    await repo.ensureCatalog();
    await repo.ensureCatalog();
    expect(await upgraded.habitEntries.toArray()).toEqual([habit]);
    expect(await upgraded.habitState.get('control')).toEqual(control);
    expect(await upgraded.settings.get('default')).toEqual(settings);
  } finally {
    await upgraded.delete();
  }
});
it('failed migration rolls back without resetting the v2 database or Habits', async () => {
  const name = `failed-upgrade-${crypto.randomUUID()}`;
  const old = new Dexie(name);
  old.version(2).stores(stores);
  const habit = { id: 'keep', occurredAt: '2020-01-01T00:00:00.000Z' };
  await old.table('habitEntries').add(habit);
  await old.table('workoutPlans').add({
    id: 'plan',
    name: '旧计划',
    days: ['一天'],
    createdAt: '2020-01-01T00:00:00.000Z',
  });
  old.close();
  const upgraded = new JerkLogDB(name);
  upgraded.planDays.hook('creating', () => {
    throw new Error('synthetic migration failure');
  });
  await expect(upgraded.open()).rejects.toThrow();
  upgraded.close();
  const check = new Dexie(name);
  try {
    await check.open();
    expect(check.verno).toBe(2);
    expect(await check.table('habitEntries').get('keep')).toEqual(habit);
    expect((await check.table('workoutPlans').get('plan')).days).toEqual([
      '一天',
    ]);
  } finally {
    await check.delete();
  }
});
