import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JerkLogDB, defaultSettings } from '../../src/db/database';
import {
  addHabit,
  editHabit,
  createPlan,
  saveWorkout,
  createFood,
  addMeal,
} from '../../src/db/actions';
import { localDate } from '../../src/lib/date';

let database: JerkLogDB;
beforeEach(() => {
  database = new JerkLogDB(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});
const foodInput = {
  name: '测试酸奶',
  source: '合成测试标签',
  state: 'unspecified' as const,
  kcalPer100g: 80,
  proteinPer100g: 4,
  carbsPer100g: 10,
  fatPer100g: 2,
};
describe('IndexedDB data workflows', () => {
  it('preserves distinct rapid-click records, backfill, edit, delete and undo', async () => {
    const entries = await Promise.all(
      Array.from({ length: 10 }, () => addHabit(undefined, database)),
    );
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(10);
    const backfill = await addHabit('2020-01-01T00:00:00Z', database);
    await editHabit(backfill.id, '2020-01-02T00:00:00Z', database);
    const saved = await database.habitEntries.get(backfill.id);
    expect(saved?.occurredAt).toBe('2020-01-02T00:00:00.000Z');
    await database.habitEntries.delete(backfill.id);
    await database.habitEntries.add(saved!);
    expect(await database.habitEntries.count()).toBe(11);
  });
  it('rejects invalid/future habit dates without a write', async () => {
    await expect(addHabit('invalid', database)).rejects.toThrow();
    await expect(addHabit('2999-01-01T00:00:00Z', database)).rejects.toThrow();
    expect(await database.habitEntries.count()).toBe(0);
  });
  it('writes and reads all three domains after closing and reopening database', async () => {
    await addHabit(undefined, database);
    const plan = await createPlan('我的计划', database);
    await saveWorkout(
      { name: '深蹲', reps: 10, weightKg: 0, planId: plan.id },
      database,
    );
    const food = await createFood(foodInput, database);
    await addMeal(
      { foodId: food.id, date: localDate(), grams: 150, mealType: 'lunch' },
      database,
    );
    await database.settings.put({ ...defaultSettings, humorMode: true });
    database.close();
    await database.open();
    expect(database.verno).toBe(1);
    expect(await database.habitEntries.count()).toBe(1);
    expect(await database.workoutSets.count()).toBe(1);
    expect(
      (await database.mealEntries.toArray())[0].nutritionSnapshot.kcal,
    ).toBe(120);
    expect((await database.settings.get('default'))?.humorMode).toBe(true);
  });
  it.each([
    { reps: 0, weightKg: 0 },
    { reps: 1.5, weightKg: 10 },
    { reps: 10, weightKg: -1 },
    { reps: NaN, weightKg: 0 },
  ])('rejects invalid workout %o without partial records', async (input) => {
    await expect(
      saveWorkout({ name: '深蹲', ...input }, database),
    ).rejects.toThrow();
    expect(await database.workoutSessions.count()).toBe(0);
    expect(await database.exercises.count()).toBe(0);
  });
  it('rolls back exercise and session if writing set fails', async () => {
    database.workoutSets.hook('creating', () => {
      throw new Error('simulated write failure');
    });
    await expect(
      saveWorkout({ name: '深蹲', reps: 10, weightKg: 20 }, database),
    ).rejects.toThrow();
    expect(await database.workoutSessions.count()).toBe(0);
    expect(await database.exercises.count()).toBe(0);
  });
  it('retains meal snapshot and name after source food changes', async () => {
    const food = await createFood(foodInput, database);
    await addMeal(
      { foodId: food.id, date: localDate(), grams: 150, mealType: 'lunch' },
      database,
    );
    await database.foods.update(food.id, { kcalPer100g: 200, name: '新名称' });
    const meal = (await database.mealEntries.toArray())[0];
    expect(meal.foodName).toBe(foodInput.name);
    expect(meal.nutritionSnapshot.kcal).toBe(120);
  });
  it('rejects bad food, zero grams, missing foods and invalid calendar dates', async () => {
    await expect(
      createFood({ ...foodInput, proteinPer100g: -1 }, database),
    ).rejects.toThrow();
    const food = await createFood(foodInput, database);
    for (const input of [
      { foodId: food.id, grams: 0, date: localDate() },
      { foodId: 'missing', grams: 100, date: localDate() },
      { foodId: food.id, grams: 100, date: '2026-02-30' },
    ]) {
      await expect(
        addMeal({ ...input, mealType: 'lunch' }, database),
      ).rejects.toThrow();
    }
    expect(await database.mealEntries.count()).toBe(0);
  });
  it('changing a plan does not mutate a saved set', async () => {
    const plan = await createPlan('旧计划', database);
    await saveWorkout(
      { name: '深蹲', reps: 10, weightKg: 20, planId: plan.id },
      database,
    );
    const original = await database.workoutSets.toArray();
    await database.workoutPlans.update(plan.id, {
      name: '新计划',
      days: ['周一'],
    });
    expect(await database.workoutSets.toArray()).toEqual(original);
  });
});
