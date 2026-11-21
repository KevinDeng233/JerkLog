import Dexie from 'dexie';
import { expect, it } from 'vitest';
import { JerkLogDB, defaultSettings } from '../../src/db/database';
import { NutritionRepository } from '../../src/features/nutrition/repository';
import { aggregate } from '../../src/features/nutrition/calculators/nutrition';
const stores = {
  habitEntries: 'id,occurredAt,createdAt',
  habitState: 'id',
  exercises: 'id,name,equipment,*muscleGroups',
  workoutPlans: 'id,createdAt,updatedAt',
  planDays: 'id,planId,[planId+order]',
  workoutSessions: 'id,startedAt,endedAt,planId,status',
  workoutSets: 'id,sessionId,exerciseId,[sessionId+order]',
  trainingMeta: 'id',
  foods: 'id,name',
  mealEntries: 'id,date,foodId',
  nutritionGoals: 'id',
  settings: 'id',
};
const stamp = '2026-11-20T12:00:00.000Z';
const existing = {
  habitEntries: [
    { id: 'habit', occurredAt: stamp, createdAt: stamp, updatedAt: stamp },
  ],
  habitState: [
    {
      id: 'control',
      lastQuickAt: 100,
      undo: {
        after: {
          id: 'habit',
          occurredAt: stamp,
          createdAt: stamp,
          updatedAt: stamp,
        },
      },
    },
  ],
  settings: [{ ...defaultSettings, theme: 'light', humorMode: true, goal: 3 }],
  exercises: [
    {
      id: 'exercise',
      name: '既有测试动作',
      muscleGroups: ['胸'],
      equipment: '杠铃',
      isCustom: true,
      createdAt: stamp,
      updatedAt: stamp,
      revision: 1,
    },
  ],
  workoutPlans: [
    {
      id: 'plan',
      name: '既有测试计划',
      days: ['day'],
      archived: false,
      createdAt: stamp,
      updatedAt: stamp,
      revision: 2,
    },
  ],
  planDays: [
    {
      id: 'day',
      planId: 'plan',
      name: '日程',
      kind: 'training',
      order: 0,
      exercises: [
        {
          id: 'planned',
          exerciseId: 'exercise',
          sets: 3,
          repsMin: 8,
          repsMax: 12,
        },
      ],
      createdAt: stamp,
      updatedAt: stamp,
    },
  ],
  workoutSessions: [
    {
      id: 'session',
      planId: 'plan',
      planName: '既有名称快照',
      dayName: '日程',
      startedAt: stamp,
      endedAt: stamp,
      status: 'completed',
      intervals: [{ startedAt: stamp, endedAt: stamp }],
      exercises: [
        {
          id: 'planned',
          exerciseId: 'exercise',
          name: '原动作名',
          sets: 3,
          repsMin: 8,
          repsMax: 12,
        },
      ],
      createdAt: stamp,
      updatedAt: stamp,
      revision: 4,
    },
  ],
  workoutSets: [
    {
      id: 'set',
      sessionId: 'session',
      exerciseId: 'exercise',
      exerciseName: '原动作名',
      order: 0,
      reps: 10,
      mode: 'weighted',
      weightKg: 50,
      weightGrams: 50000,
      completed: true,
      createdAt: stamp,
      updatedAt: stamp,
      revision: 1,
    },
  ],
  trainingMeta: [
    {
      id: 'control',
      catalogVersion: 1,
      lastSetAt: 1234,
      lastSetSignature: 'synthetic-test-signature',
    },
  ],
};
async function legacy(name: string) {
  const database = new Dexie(name);
  database.version(3).stores(stores);
  for (const [name, rows] of Object.entries(existing))
    await database.table(name).bulkAdd(rows);
  await database.table('foods').add({
    id: 'food',
    name: '旧库已经改名',
    kcalPer100g: 500,
    proteinPer100g: 50,
    carbsPer100g: 40,
    fatPer100g: 10,
    source: '旧标签',
    state: 'cooked',
  });
  await database.table('mealEntries').add({
    id: 'meal',
    foodId: 'food',
    foodName: '历史原名',
    date: '2026-11-20',
    mealType: 'lunch',
    grams: 150,
    nutritionSnapshot: { kcal: 180, proteinG: 15, carbsG: 30, fatG: 7.5 },
  });
  await database.table('nutritionGoals').add({ id: 'default', kcal: 2000 });
  return database;
}
it('migrates actual populated v3 without altering Habits/Training/settings and preserves old Nutrition facts', async () => {
  const name = `nutrition-upgrade-${crypto.randomUUID()}`;
  const old = await legacy(name);
  old.close();
  const database = new JerkLogDB(name);
  try {
    await database.open();
    expect(database.verno).toBe(4);
    for (const [name, rows] of Object.entries(existing))
      expect(await database.table(name).toArray()).toEqual(rows);
    const food = (await database.foods.get('food'))!;
    expect(food.per100g.kcal).toBe(500);
    expect(food.source.reference).toBe('旧标签');
    const meal = (await database.mealEntries.get('meal'))!;
    expect(meal.localDate).toBe('2026-11-20');
    expect(meal.nutritionSnapshot.foodName).toBe('历史原名');
    expect(meal.nutritionSnapshot.per100g).toEqual({
      kcal: 120,
      proteinG: 10,
      carbsG: 20,
      fatG: 5,
    });
    expect(aggregate([meal], meal.localDate).kcal.known).toBe(180);
    expect((await database.nutritionGoals.get('default'))?.proteinG).toBeNull();
    await new NutritionRepository(database).ensureCatalog();
    for (const [name, rows] of Object.entries(existing))
      expect(await database.table(name).toArray()).toEqual(rows);
  } finally {
    await database.delete();
  }
});
it('rolls back a failed v3→v4 migration without deletion or reset', async () => {
  const name = `nutrition-failed-upgrade-${crypto.randomUUID()}`;
  const old = await legacy(name);
  const food = await old.table('foods').get('food');
  const meal = await old.table('mealEntries').get('meal');
  old.close();
  const database = new JerkLogDB(name);
  database.foods.hook('updating', () => {
    throw new Error('synthetic migration failure');
  });
  await expect(database.open()).rejects.toThrow();
  database.close();
  const check = new Dexie(name);
  try {
    await check.open();
    expect(check.verno).toBe(3);
    expect(await check.table('foods').get('food')).toEqual(food);
    expect(await check.table('mealEntries').get('meal')).toEqual(meal);
    for (const [name, rows] of Object.entries(existing))
      expect(await check.table(name).toArray()).toEqual(rows);
  } finally {
    await check.delete();
  }
});
