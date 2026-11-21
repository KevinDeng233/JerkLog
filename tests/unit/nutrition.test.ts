import { describe, expect, it } from 'vitest';
import { nutritionFor, sumNutrition } from '../../src/lib/nutrition';
import type { Food } from '../../src/db/models';
const food: Food = {
  id: 'test',
  name: '测试食品',
  source: '合成测试数据',
  state: 'unspecified',
  kcalPer100g: 121,
  proteinPer100g: 5,
  carbsPer100g: 10,
  fatPer100g: 6,
};
describe('label-based nutrition', () => {
  it('calculates 100g without overriding label kcal with macro calories', () => {
    expect(nutritionFor(food, 100)).toEqual({
      kcal: 121,
      proteinG: 5,
      carbsG: 10,
      fatG: 6,
    });
  });
  it('scales 150g and sums unrounded snapshots', () => {
    const value = nutritionFor(food, 150);
    expect(value).toEqual({ kcal: 181.5, proteinG: 7.5, carbsG: 15, fatG: 9 });
    expect(sumNutrition([value, nutritionFor(food, 100)]).kcal).toBe(302.5);
  });
  it.each([0, -1, NaN, Infinity, 1_000_001])(
    'rejects invalid grams: %s',
    (grams) => expect(() => nutritionFor(food, grams)).toThrow(),
  );
  it('empty totals are zero', () =>
    expect(sumNutrition([])).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    }));
});
