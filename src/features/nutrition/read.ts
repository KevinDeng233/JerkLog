import { db, type JerkLogDB } from '../../db/database';
import { defaultGoals, defaultPreferences } from './repository';
export async function loadNutritionData(database: JerkLogDB = db) {
  const [foods, entries, goals, preferences] = await Promise.all([
    database.foods.orderBy('name').toArray(),
    database.mealEntries.orderBy('createdAt').reverse().toArray(),
    database.nutritionGoals.get('default'),
    database.nutritionPreferences.get('default'),
  ]);
  return {
    foods,
    entries,
    goals: goals ?? defaultGoals,
    preferences: preferences ?? defaultPreferences,
    error: '',
  };
}
export type NutritionData = Awaited<ReturnType<typeof loadNutritionData>>;
