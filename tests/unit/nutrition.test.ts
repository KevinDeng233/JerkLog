import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JerkLogDB } from '../../src/db/database';
import {
  NutritionRepository,
  defaultGoals,
  emptyNutrition,
  defaultPreferences,
  type FoodDraft,
} from '../../src/features/nutrition/repository';
import {
  consumed,
  aggregate,
  progress,
  displayTotal,
  servingToGrams,
} from '../../src/features/nutrition/calculators/nutrition';
import {
  foodCatalog,
  filterFoods,
} from '../../src/features/nutrition/foods/catalog';
import { loadNutritionData } from '../../src/features/nutrition/read';
import { validDiaryDate } from '../../src/features/nutrition/date';
let database: JerkLogDB;
let repo: NutritionRepository;
let now: number;
const per100g = { kcal: 120, proteinG: 10, carbsG: 20, fatG: 5 };
const foodInput = (patch: Partial<FoodDraft> = {}): FoodDraft => ({
  id: crypto.randomUUID(),
  name: '合成测试食品',
  state: 'raw',
  per100g: { ...per100g },
  source: { kind: 'label', reference: '合成测试标签' },
  ...patch,
});
beforeEach(() => {
  database = new JerkLogDB(`nutrition-${crypto.randomUUID()}`);
  now = Date.parse('2026-11-21T02:00:00.000Z');
  repo = new NutritionRepository(database, () => new Date(now));
});
afterEach(async () => {
  await database.delete();
});
async function add(
  foodId: string,
  patch: Partial<Parameters<NutritionRepository['addMeal']>[0]> = {},
) {
  return repo.addMeal({
    id: crypto.randomUUID(),
    foodId,
    amount: 150,
    unit: 'grams',
    localDate: '2026-11-20',
    mealType: 'lunch',
    ...patch,
  });
}
describe('pure nutrition calculations', () => {
  it('scales label kcal and macros without overriding label energy', () => {
    expect(consumed(per100g, 150)).toEqual({
      kcal: 180,
      proteinG: 15,
      carbsG: 30,
      fatG: 7.5,
    });
    expect(consumed(per100g, 100).kcal).toBe(120);
    expect(consumed(per100g, 100).kcal).not.toBe(4 * 10 + 4 * 20 + 9 * 5);
  });
  it.each([0, -1, NaN, Infinity, 20000.001, 0.0000001])(
    'rejects invalid grams %s',
    (grams) => expect(() => consumed(per100g, grams)).toThrow(),
  );
  it('preserves unknown values and only converts servings with an explicit gram definition', () => {
    expect(consumed({ ...per100g, proteinG: null }, 150).proteinG).toBeNull();
    expect(servingToGrams(2, 75)).toBe(150);
    expect(servingToGrams(0.333, 33.3)).toBeCloseTo(11.0889);
    expect(() => servingToGrams(1, undefined)).toThrow('每份克数');
  });
  it('rejects non-finite arithmetic instead of displaying overflow', () => {
    expect(() => consumed({ ...per100g, kcal: 1e308 }, 20000)).toThrow();
  });
  it('validates calendar dates independently of UTC/local offset changes', () => {
    expect(validDiaryDate('2024-02-29')).toBe(true);
    expect(validDiaryDate('2026-02-29')).toBe(false);
    expect(validDiaryDate('2026-13-01')).toBe(false);
    expect(validDiaryDate('2026-11-20')).toBe(true);
    expect(validDiaryDate('0000-01-01')).toBe(false);
  });
});
describe('food library and sourced seed', () => {
  it('seeds six verified foods once across restarts/connections, keeping raw/cooked distinct', async () => {
    await repo.ensureCatalog();
    const second = new JerkLogDB(database.name);
    try {
      await Promise.all([
        repo.ensureCatalog(),
        new NutritionRepository(second).ensureCatalog(),
      ]);
      expect(await database.foods.count()).toBe(6);
      database.close();
      await database.open();
      await repo.ensureCatalog();
      expect(await database.foods.count()).toBe(6);
      const foods = await database.foods.toArray();
      expect(filterFoods(foods, '白米饭', 'cooked')).toHaveLength(1);
      expect(filterFoods(foods, '白米饭', 'raw')).toHaveLength(0);
      expect(
        foods.every(
          (food) =>
            food.source.kind === 'usda' &&
            food.source.fdcId &&
            food.source.license === 'CC0-1.0' &&
            food.source.revision === '2019-04-01',
        ),
      ).toBe(true);
    } finally {
      second.close();
    }
  });
  it('locks independently verified exact FDC rows and nutrient units into the shipped catalog', () => {
    expect(
      foodCatalog.find((food) => food.id === 'usda:168878')?.per100g,
    ).toEqual({ kcal: 130, proteinG: 2.69, carbsG: 28.17, fatG: 0.28 });
    expect(
      foodCatalog.find((food) => food.id === 'usda:172475')?.per100g.proteinG,
    ).toBe(17.27);
    expect(
      foodCatalog.every(
        (food) =>
          food.source.reference?.startsWith(
            'https://fdc.nal.usda.gov/food-details/',
          ) &&
          food.source.description &&
          food.source.ndbNumber,
      ),
    ).toBe(true);
  });
  it('creates/edits/archives/restores/deletes user foods and rejects changing builtins', async () => {
    let food = await repo.saveFood(foodInput());
    food = await repo.saveFood({ ...food, name: '合成测试新名称' });
    expect(filterFoods([food], '新名称')).toHaveLength(1);
    await repo.archiveFood(food, true);
    food = (await database.foods.get(food.id))!;
    expect(filterFoods([food], '')).toHaveLength(0);
    await repo.archiveFood(food, false);
    food = (await database.foods.get(food.id))!;
    await repo.deleteFood(food);
    expect(await database.foods.count()).toBe(0);
    await repo.ensureCatalog();
    await expect(
      repo.saveFood({ ...foodCatalog[0], name: '改写源数据' }),
    ).rejects.toThrow('内置');
    await expect(repo.deleteFood(foodCatalog[0])).rejects.toThrow('内置');
  });
  it.each([
    { name: ' ' },
    { per100g: { ...per100g, kcal: -1 } },
    { per100g: { ...per100g, kcal: 1001 } },
    { per100g: { ...per100g, proteinG: 101 } },
    { per100g: { ...per100g, kcal: NaN } },
    { per100g: { ...per100g, fatG: 0.0001 } },
    { servingGrams: 0 },
  ])('rejects invalid food input %o', async (patch) => {
    await expect(repo.saveFood(foodInput(patch))).rejects.toThrow();
    expect(await database.foods.count()).toBe(0);
  });
});
describe('meal persistence, immutable snapshots and calendar aggregation', () => {
  it('aggregates entry/meal/day by chosen diary date, not UTC creation date', async () => {
    const food = await repo.saveFood(foodInput());
    const lunch = await add(food.id);
    await add(food.id, { mealType: 'dinner', amount: 100 });
    await add(food.id, { localDate: '2026-11-21', amount: 50 });
    const entries = await database.mealEntries.toArray();
    expect(lunch.createdAt.startsWith('2026-11-21')).toBe(true);
    expect(lunch.localDate).toBe('2026-11-20');
    expect(aggregate(entries, '2026-11-20').kcal.known).toBe(300);
    expect(aggregate(entries, '2026-11-20', 'lunch').kcal.known).toBe(180);
    expect(aggregate(entries, '2026-11-21').kcal.known).toBe(60);
  });
  it('changes totals on quantity/date/meal edit and deletes without changing other days', async () => {
    const food = await repo.saveFood(foodInput());
    let meal = await add(food.id);
    meal = await repo.editMeal(meal, {
      grams: 100,
      localDate: '2026-11-21',
      mealType: 'dinner',
    });
    const entries = await database.mealEntries.toArray();
    expect(aggregate(entries, '2026-11-20').kcal.known).toBe(0);
    expect(aggregate(entries, '2026-11-21', 'dinner').kcal.known).toBe(120);
    await repo.deleteMeal(meal);
    expect(
      aggregate(await database.mealEntries.toArray(), '2026-11-21').kcal.known,
    ).toBe(0);
  });
  it('keeps historical name, source, state and nutrition through library edit/delete, including later quantity edits', async () => {
    let food = await repo.saveFood(foodInput({ servingGrams: 75 }));
    const meal = await add(food.id, { amount: 2, unit: 'servings' });
    const snapshot = structuredClone(meal.nutritionSnapshot);
    food = await repo.saveFood({
      ...food,
      name: '新版名称',
      state: 'cooked',
      per100g: { ...per100g, kcal: 500 },
      source: { kind: 'user', reference: '新的来源' },
    });
    await repo.deleteFood(food);
    const changed = await repo.editMeal(meal, {
      grams: 100,
      localDate: meal.localDate,
      mealType: 'lunch',
    });
    expect(changed.nutritionSnapshot).toEqual(snapshot);
    expect(aggregate([changed], changed.localDate).kcal.known).toBe(120);
    expect(await database.foods.get(food.id)).toBeUndefined();
  });
  it('persists diary, goals and preferences after reopening through a new connection', async () => {
    const food = await repo.saveFood(foodInput());
    await add(food.id);
    await repo.saveGoals({ ...emptyNutrition, kcal: 2000 }, 0);
    await repo.savePreferences({
      ...defaultPreferences,
      goal: 'balanced',
      diet: 'vegan',
    });
    const name = database.name;
    database.close();
    database = new JerkLogDB(name);
    const data = await loadNutritionData(database);
    expect(data.entries).toHaveLength(1);
    expect(data.goals.kcal).toBe(2000);
    expect(data.preferences.diet).toBe('vegan');
  });
  it('marks partial/entirely unknown totals and never invents a target percentage', async () => {
    const unknown = await repo.saveFood(
      foodInput({ per100g: { ...per100g, proteinG: null } }),
    );
    await add(unknown.id);
    let totals = aggregate(await database.mealEntries.toArray(), '2026-11-20');
    expect(totals.proteinG).toEqual({ known: 0, missing: 1, knownEntries: 0 });
    expect(displayTotal(totals.proteinG)).toContain('未知');
    expect(progress(totals.proteinG, 100)).toBeNull();
    const known = await repo.saveFood(foodInput());
    await add(known.id);
    totals = aggregate(await database.mealEntries.toArray(), '2026-11-20');
    expect(totals.proteinG).toEqual({ known: 15, missing: 1, knownEntries: 1 });
    expect(displayTotal(totals.proteinG)).toContain('不完整');
    expect(progress(totals.proteinG, 100)).toEqual({
      percent: 15,
      partial: true,
    });
    expect(progress(totals.kcal, null)).toBeNull();
  });
  it('sums without rounding individual entries', async () => {
    const food = await repo.saveFood(
      foodInput({ per100g: { kcal: 1, proteinG: 1, carbsG: 1, fatG: 1 } }),
    );
    await add(food.id, { amount: 0.1, mealType: 'breakfast' });
    await add(food.id, { amount: 0.1, mealType: 'lunch' });
    expect(
      aggregate(await database.mealEntries.toArray(), '2026-11-20').kcal.known,
    ).toBeCloseTo(0.002, 12);
  });
  it.each([0, -1, NaN, Infinity, 20000.001])(
    'rejects invalid persisted grams %s without state writes',
    async (amount) => {
      const food = await repo.saveFood(foodInput());
      await expect(add(food.id, { amount })).rejects.toThrow();
      expect(await database.mealEntries.count()).toBe(0);
      expect(await database.nutritionMeta.count()).toBe(0);
    },
  );
  it('rejects malformed dates, undefined servings, archived foods and stale edits', async () => {
    let food = await repo.saveFood(foodInput());
    await expect(add(food.id, { localDate: '2026-02-30' })).rejects.toThrow(
      '日期',
    );
    await expect(add(food.id, { unit: 'servings' })).rejects.toThrow('每份');
    const meal = await add(food.id);
    await repo.editMeal(meal, {
      grams: 100,
      localDate: meal.localDate,
      mealType: 'lunch',
    });
    await expect(repo.deleteMeal(meal)).rejects.toThrow('其他页面');
    await repo.archiveFood(food, true);
    food = (await database.foods.get(food.id))!;
    await expect(add(food.id, { amount: 50 })).rejects.toThrow('归档');
  });
  it('serializes rapid taps across connections, retains cooldown on refresh and permits later distinct entries', async () => {
    const food = await repo.saveFood(foodInput());
    const second = new JerkLogDB(database.name);
    try {
      const other = new NutritionRepository(second, () => new Date(now));
      const input = {
        id: crypto.randomUUID(),
        foodId: food.id,
        amount: 150,
        unit: 'grams' as const,
        localDate: '2026-11-20',
        mealType: 'lunch' as const,
      };
      const results = await Promise.allSettled([
        repo.addMeal(input),
        other.addMeal({ ...input, id: crypto.randomUUID() }),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      database.close();
      await database.open();
      await expect(add(food.id)).rejects.toThrow('刚刚');
      now += 1500;
      await add(food.id);
      expect(await database.mealEntries.count()).toBe(2);
    } finally {
      second.close();
    }
  });
  it('rolls back entry writes if storing duplicate protection fails, allowing a clean retry', async () => {
    const food = await repo.saveFood(foodInput());
    const fail = () => {
      throw new Error('synthetic storage failure');
    };
    database.nutritionMeta.hook('creating', fail);
    await expect(add(food.id)).rejects.toThrow();
    expect(await database.mealEntries.count()).toBe(0);
    database.nutritionMeta.hook('creating').unsubscribe(fail);
    await add(food.id);
    expect(await database.mealEntries.count()).toBe(1);
  });
});
describe('manual goals', () => {
  it('saves/edits/clears each optional goal without manufacturing zeros', async () => {
    expect((await loadNutritionData(database)).goals).toEqual(defaultGoals);
    let saved = await repo.saveGoals(
      { ...emptyNutrition, kcal: 2000, proteinG: 120 },
      0,
    );
    expect(saved.carbsG).toBeNull();
    saved = await repo.saveGoals(
      { ...emptyNutrition, carbsG: 250 },
      saved.revision,
    );
    expect(saved.kcal).toBeNull();
    saved = await repo.saveGoals(emptyNutrition, saved.revision);
    expect(saved.kcal).toBeNull();
    await expect(
      repo.saveGoals({ ...emptyNutrition, kcal: 0 }, saved.revision),
    ).rejects.toThrow();
  });
  it('rejects stale goal/preference updates without overwriting recent values', async () => {
    await repo.saveGoals({ ...emptyNutrition, kcal: 2000 }, 0);
    await expect(
      repo.saveGoals({ ...emptyNutrition, kcal: 1800 }, 0),
    ).rejects.toThrow('其他页面');
    const saved = await repo.savePreferences({
      ...defaultPreferences,
      goal: 'balanced',
    });
    await expect(
      repo.savePreferences({ ...defaultPreferences, goal: 'muscle' }),
    ).rejects.toThrow('其他页面');
    expect((await database.nutritionPreferences.get('default'))?.revision).toBe(
      saved.revision,
    );
  });
});
