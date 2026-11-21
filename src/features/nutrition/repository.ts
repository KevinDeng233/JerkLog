import { db, type JerkLogDB } from '../../db/database';
import type {
  Food,
  MealEntry,
  MealType,
  Nutrition,
  NutritionGoals,
  NutritionPreferences,
} from '../../db/models';
import { UserError } from '../../lib/errors';
import { foodCatalog } from './foods/catalog';
import {
  numeric,
  validateNutrition,
  nutrients,
  servingToGrams,
} from './calculators/nutrition';
import { requireDiaryDate } from './date';
export const emptyNutrition: Nutrition = {
  kcal: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
};
export const defaultGoals: NutritionGoals = {
  id: 'default',
  ...emptyNutrition,
  updatedAt: '1970-01-01T00:00:00.000Z',
  revision: 0,
};
export const defaultPreferences: NutritionPreferences = {
  id: 'default',
  goal: null,
  diet: 'omnivore',
  restrictions: [],
  otherRestrictions: '',
  updatedAt: '1970-01-01T00:00:00.000Z',
  revision: 0,
};
function text(value: string, label: string, max = 120, optional = false) {
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (!optional && !value.trim())
  )
    throw new UserError(`${label}需填写有效文本，最多 ${max} 字。`);
  return value.trim();
}
function revision(
  current: { revision: number } | undefined,
  expected: number | undefined,
) {
  if (!current || current.revision !== expected)
    throw new UserError('数据已在其他页面更改，请重新打开后操作。');
}
export type FoodDraft = Pick<
  Food,
  'id' | 'name' | 'brand' | 'state' | 'per100g' | 'source' | 'servingGrams'
> & { revision?: number };
export class NutritionRepository {
  constructor(
    private database: JerkLogDB = db,
    private clock: () => Date = () => new Date(),
  ) {}
  private write<T>(fn: () => Promise<T>) {
    const d = this.database;
    return d.transaction(
      'rw',
      [
        d.foods,
        d.mealEntries,
        d.nutritionGoals,
        d.nutritionMeta,
        d.nutritionPreferences,
      ],
      fn,
    );
  }
  async ensureCatalog() {
    return this.write(async () => {
      const meta = (await this.database.nutritionMeta.get('control')) ?? {
        id: 'control' as const,
      };
      if (meta.catalogVersion === 1) return;
      for (const food of foodCatalog)
        if (!(await this.database.foods.get(food.id)))
          await this.database.foods.add(food);
      await this.database.nutritionMeta.put({ ...meta, catalogVersion: 1 });
    });
  }
  async saveFood(input: FoodDraft) {
    return this.write(async () => {
      const current = await this.database.foods.get(input.id);
      if (current) {
        if (current.isBuiltIn)
          throw new UserError('内置数据不可改写，请创建自定义食品。');
        revision(current, input.revision);
      }
      if (!['raw', 'cooked', 'unspecified'].includes(input.state))
        throw new UserError('请选择生熟状态。');
      validateNutrition(input.per100g);
      if (!['label', 'user'].includes(input.source.kind))
        throw new UserError(
          '自建食品来源请选择标签或用户输入，不能冒充 USDA。',
        );
      if (input.servingGrams !== undefined)
        numeric(input.servingGrams, 0.001, 20000, '每份克数');
      const stamp = this.clock().toISOString();
      const saved: Food = {
        id: input.id,
        name: text(input.name, '食品名称'),
        brand: text(input.brand ?? '', '品牌', 120, true),
        state: input.state,
        per100g: { ...input.per100g },
        source: {
          kind: input.source.kind,
          reference: text(input.source.reference ?? '', '来源说明', 500),
          revision: text(input.source.revision ?? '', '来源版本', 80, true),
        },
        servingGrams: input.servingGrams,
        isBuiltIn: false,
        archived: current?.archived ?? false,
        createdAt: current?.createdAt ?? stamp,
        updatedAt: stamp,
        revision: (current?.revision ?? -1) + 1,
      };
      await this.database.foods.put(saved);
      return saved;
    });
  }
  async archiveFood(expected: Food, archived: boolean) {
    return this.write(async () => {
      const food = await this.database.foods.get(expected.id);
      revision(food, expected.revision);
      if (food!.isBuiltIn) throw new UserError('内置目录不可修改。');
      await this.database.foods.update(expected.id, {
        archived,
        updatedAt: this.clock().toISOString(),
        revision: food!.revision + 1,
      });
    });
  }
  async deleteFood(expected: Food) {
    return this.write(async () => {
      const food = await this.database.foods.get(expected.id);
      revision(food, expected.revision);
      if (food!.isBuiltIn) throw new UserError('内置目录不可删除。');
      await this.database.foods.delete(expected.id);
    });
  }
  async addMeal(input: {
    id: string;
    foodId: string;
    amount: number;
    unit: 'grams' | 'servings';
    localDate: string;
    mealType: MealType;
  }) {
    requireDiaryDate(input.localDate);
    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(input.mealType))
      throw new UserError('餐次无效。');
    if (!['grams', 'servings'].includes(input.unit))
      throw new UserError('请选择克数或已定义的份量。');
    return this.write(async () => {
      if (await this.database.mealEntries.get(input.id))
        throw new UserError('此记录已保存，请勿重复提交。');
      const food = await this.database.foods.get(input.foodId);
      if (!food || food.archived)
        throw new UserError('食品不存在或已归档，请重新选择。');
      const grams =
        input.unit === 'servings'
          ? servingToGrams(input.amount, food.servingGrams)
          : input.amount;
      numeric(grams, 0.001, 20000, '食用克数', 6);
      const now = this.clock();
      const signature = JSON.stringify([
        food.id,
        grams,
        input.localDate,
        input.mealType,
      ]);
      const meta = (await this.database.nutritionMeta.get('control')) ?? {
        id: 'control' as const,
      };
      if (
        meta.lastMealSignature === signature &&
        meta.lastMealAt !== undefined &&
        now.getTime() - meta.lastMealAt >= 0 &&
        now.getTime() - meta.lastMealAt < 1500
      )
        throw new UserError('刚刚已保存相同饮食记录，请稍候。');
      const stamp = now.toISOString();
      const entry: MealEntry = {
        id: input.id,
        foodId: food.id,
        localDate: input.localDate,
        mealType: input.mealType,
        grams,
        nutritionSnapshot: {
          foodName: food.name,
          brand: food.brand,
          state: food.state,
          per100g: { ...food.per100g },
          source: { ...food.source },
          servingGrams: food.servingGrams,
        },
        createdAt: stamp,
        updatedAt: stamp,
        revision: 0,
      };
      await this.database.mealEntries.add(entry);
      await this.database.nutritionMeta.put({
        ...meta,
        lastMealAt: now.getTime(),
        lastMealSignature: signature,
      });
      return entry;
    });
  }
  async editMeal(
    expected: MealEntry,
    patch: { grams: number; localDate: string; mealType: MealType },
  ) {
    requireDiaryDate(patch.localDate);
    numeric(patch.grams, 0.001, 20000, '食用克数', 6);
    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(patch.mealType))
      throw new UserError('餐次无效。');
    return this.write(async () => {
      const entry = await this.database.mealEntries.get(expected.id);
      revision(entry, expected.revision);
      const saved = {
        ...entry!,
        grams: patch.grams,
        localDate: patch.localDate,
        mealType: patch.mealType,
        updatedAt: this.clock().toISOString(),
        revision: entry!.revision + 1,
      };
      await this.database.mealEntries.put(saved);
      return saved;
    });
  }
  async deleteMeal(expected: MealEntry) {
    return this.write(async () => {
      revision(
        await this.database.mealEntries.get(expected.id),
        expected.revision,
      );
      await this.database.mealEntries.delete(expected.id);
    });
  }
  async saveGoals(values: Nutrition, expectedRevision: number) {
    for (const key of nutrients)
      if (values[key] !== null)
        numeric(
          values[key]!,
          0.001,
          key === 'kcal' ? 15000 : 2000,
          '每日手动目标',
        );
    return this.write(async () => {
      const goals =
        (await this.database.nutritionGoals.get('default')) ?? defaultGoals;
      revision(goals, expectedRevision);
      const saved: NutritionGoals = {
        id: 'default',
        ...values,
        updatedAt: this.clock().toISOString(),
        revision: goals.revision + 1,
      };
      await this.database.nutritionGoals.put(saved);
      return saved;
    });
  }
  async savePreferences(input: NutritionPreferences) {
    if (
      ![null, 'balanced', 'muscle'].includes(input.goal) ||
      !['omnivore', 'vegetarian', 'vegan'].includes(input.diet) ||
      !Array.isArray(input.restrictions) ||
      input.restrictions.some(
        (value) =>
          ![
            'milk',
            'egg',
            'soy',
            'gluten',
            'peanut',
            'nuts',
            'fish',
            'shellfish',
          ].includes(value),
      )
    )
      throw new UserError('请选择有效的饮食偏好。');
    const otherRestrictions = text(
      input.otherRestrictions,
      '额外忌口',
      300,
      true,
    );
    if (input.dismissedDate) requireDiaryDate(input.dismissedDate);
    return this.write(async () => {
      const current =
        (await this.database.nutritionPreferences.get('default')) ??
        defaultPreferences;
      revision(current, input.revision);
      const saved = {
        ...input,
        id: 'default' as const,
        restrictions: Array.from(new Set(input.restrictions)),
        otherRestrictions,
        updatedAt: this.clock().toISOString(),
        revision: current.revision + 1,
      };
      await this.database.nutritionPreferences.put(saved);
      return saved;
    });
  }
}
export const nutrition = new NutritionRepository();
