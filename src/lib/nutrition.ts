import type { Food, Nutrition } from '../db/models';

export function nonnegative(value: number, label: string, max = 1_000_000) {
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new Error(`${label}必须是 0 至 ${max} 的有限数值。`);
  }
}
export function nutritionFor(food: Food, grams: number): Nutrition {
  nonnegative(grams, '克数');
  if (grams === 0) throw new Error('克数必须大于 0。');
  return {
    kcal: (food.kcalPer100g * grams) / 100,
    proteinG: (food.proteinPer100g * grams) / 100,
    carbsG: (food.carbsPer100g * grams) / 100,
    fatG: (food.fatPer100g * grams) / 100,
  };
}
export function sumNutrition(items: Nutrition[]): Nutrition {
  return items.reduce(
    (a, b) => ({
      kcal: a.kcal + b.kcal,
      proteinG: a.proteinG + b.proteinG,
      carbsG: a.carbsG + b.carbsG,
      fatG: a.fatG + b.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
