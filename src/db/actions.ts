import { db, type JerkLogDB } from './database';
import type { Food, HabitEntry, MealType } from './models';
import { localDate, validDate } from '../lib/date';
import { nonnegative, nutritionFor } from '../lib/nutrition';

const id = () => crypto.randomUUID();
export function text(value: string, label: string, max = 120) {
  const result = value.trim();
  if (!result || result.length > max)
    throw new Error(`${label}需填写 1–${max} 个字符。`);
  return result;
}
export async function addHabit(
  occurredAt = new Date().toISOString(),
  database = db,
) {
  const date = new Date(occurredAt);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) {
    throw new Error('请选择有效且不晚于现在的记录时间。');
  }
  const now = new Date().toISOString();
  const entry: HabitEntry = {
    id: id(),
    occurredAt: date.toISOString(),
    createdAt: now,
    updatedAt: now,
  };
  await database.habitEntries.add(entry);
  return entry;
}
export async function editHabit(
  entryId: string,
  occurredAt: string,
  database = db,
) {
  const date = new Date(occurredAt);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now())
    throw new Error('记录时间无效或晚于现在。');
  const changed = await database.habitEntries.update(entryId, {
    occurredAt: date.toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (!changed) throw new Error('记录已不存在，请刷新列表。');
}
export async function createPlan(name: string, database = db) {
  const plan = {
    id: id(),
    name: text(name, '计划名称'),
    days: [] as string[],
    createdAt: new Date().toISOString(),
  };
  await database.workoutPlans.add(plan);
  return plan;
}
export async function saveWorkout(
  input: { name: string; reps: number; weightKg: number; planId?: string },
  database = db,
) {
  const name = text(input.name, '动作名称');
  if (!Number.isSafeInteger(input.reps) || input.reps < 1 || input.reps > 10000)
    throw new Error('次数必须是 1–10000 的整数。');
  nonnegative(input.weightKg, '重量', 10000);
  const exerciseId = id();
  const sessionId = id();
  const now = new Date().toISOString();
  await database.transaction(
    'rw',
    [
      database.exercises,
      database.workoutSessions,
      database.workoutSets,
      database.workoutPlans,
    ],
    async () => {
      if (input.planId && !(await database.workoutPlans.get(input.planId)))
        throw new Error('所选计划不存在。');
      await database.exercises.add({
        id: exerciseId,
        name,
        muscleGroups: [],
        equipment: '未注明',
        isCustom: true,
      });
      await database.workoutSessions.add({
        id: sessionId,
        planId: input.planId || undefined,
        startedAt: now,
        endedAt: now,
      });
      await database.workoutSets.add({
        id: id(),
        sessionId,
        exerciseId,
        reps: input.reps,
        weightKg: input.weightKg,
        completed: true,
      });
    },
  );
}
export async function createFood(input: Omit<Food, 'id'>, database = db) {
  const food: Food = {
    ...input,
    id: id(),
    name: text(input.name, '食品名称'),
    source: text(input.source, '数据来源', 300),
  };
  nonnegative(food.kcalPer100g, '热量', 10000);
  for (const value of [food.proteinPer100g, food.carbsPer100g, food.fatPer100g])
    nonnegative(value, '每 100g 营养素', 100);
  if (!['raw', 'cooked', 'unspecified'].includes(food.state))
    throw new Error('请选择食品生熟状态。');
  await database.foods.add(food);
  return food;
}
export async function addMeal(
  input: { foodId: string; grams: number; date: string; mealType: MealType },
  database: JerkLogDB = db,
) {
  if (!validDate(input.date) || input.date > localDate())
    throw new Error('请选择有效且不晚于今天的日期。');
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(input.mealType))
    throw new Error('餐次无效。');
  await database.transaction(
    'rw',
    database.foods,
    database.mealEntries,
    async () => {
      const food = await database.foods.get(input.foodId);
      if (!food) throw new Error('请先选择食品。');
      await database.mealEntries.add({
        ...input,
        id: id(),
        foodName: food.name,
        nutritionSnapshot: nutritionFor(food, input.grams),
      });
    },
  );
}
