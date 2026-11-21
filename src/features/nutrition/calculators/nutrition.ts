import type { Food, MealEntry, MealType, Nutrition } from '../../../db/models';
import { UserError } from '../../../lib/errors';
export const nutrients = ['kcal', 'proteinG', 'carbsG', 'fatG'] as const;
export type Nutrient = (typeof nutrients)[number];
export function numeric(
  value: number,
  min: number,
  max: number,
  label: string,
  precision = 3,
) {
  if (
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    Math.abs(value * 10 ** precision - Math.round(value * 10 ** precision)) >
      0.000001
  )
    throw new UserError(
      `${label}需为 ${min} 至 ${max} 的有限数值，最多 ${precision} 位小数。`,
    );
}
export function validateNutrition(values: Nutrition) {
  for (const key of nutrients) {
    const value = values[key];
    if (value !== null)
      numeric(
        value,
        0,
        key === 'kcal' ? 1000 : 100,
        key === 'kcal' ? '每100g热量' : '每100g营养素',
      );
  }
}
export function consumed(per100g: Nutrition, grams: number): Nutrition {
  numeric(grams, 0.001, 20000, '食用克数', 6);
  for (const key of nutrients)
    if (
      per100g[key] !== null &&
      (!Number.isFinite(per100g[key]) || per100g[key]! < 0)
    )
      throw new UserError('快照含无效营养值。');
  const result = {
    kcal: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
  } as Nutrition;
  for (const key of nutrients) {
    const value = per100g[key];
    if (value !== null) {
      const amount = (value * grams) / 100;
      if (!Number.isFinite(amount))
        throw new UserError('营养计算超出有效数值范围。');
      result[key] = amount;
    }
  }
  return result;
}
export function servingToGrams(
  amount: number,
  servingGrams: Food['servingGrams'],
) {
  if (servingGrams === undefined)
    throw new UserError('此食品没有明确定义每份克数，请按克录入。');
  numeric(amount, 0.001, 1000, '份数');
  numeric(servingGrams, 0.001, 20000, '每份克数');
  const grams = amount * servingGrams;
  numeric(grams, 0.001, 20000, '换算克数', 6);
  return Math.round(grams * 1e6) / 1e6;
}
export interface NutrientTotal {
  known: number;
  missing: number;
  knownEntries: number;
}
export type NutritionTotals = Record<Nutrient, NutrientTotal>;
export function aggregate(
  entries: MealEntry[],
  localDate: string,
  mealType?: MealType,
): NutritionTotals {
  const totals = Object.fromEntries(
    nutrients.map((key) => [key, { known: 0, missing: 0, knownEntries: 0 }]),
  ) as NutritionTotals;
  for (const entry of entries.filter(
    (item) =>
      item.localDate === localDate && (!mealType || item.mealType === mealType),
  )) {
    for (const key of nutrients) {
      const value = entry.nutritionSnapshot.per100g[key];
      if (
        value === null ||
        !Number.isFinite(value) ||
        value < 0 ||
        !Number.isFinite(entry.grams) ||
        entry.grams <= 0
      )
        totals[key].missing++;
      else {
        const amount = (value * entry.grams) / 100;
        if (
          !Number.isFinite(amount) ||
          !Number.isFinite(totals[key].known + amount)
        )
          totals[key].missing++;
        else {
          totals[key].known += amount;
          totals[key].knownEntries++;
        }
      }
    }
  }
  return totals;
}
export function progress(total: NutrientTotal, target: number | null) {
  if (total.missing > 0 && total.knownEntries === 0) return null;
  if (target === null || !Number.isFinite(target) || target <= 0) return null;
  return { percent: (total.known / target) * 100, partial: total.missing > 0 };
}
export function displayTotal(value: NutrientTotal) {
  if (value.missing && value.knownEntries === 0) return '未知（无已知数值）';
  return `${value.missing ? '已知小计 ' : ''}${value.known.toFixed(1)}${value.missing ? '（不完整）' : ''}`;
}
