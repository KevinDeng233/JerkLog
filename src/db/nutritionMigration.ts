import type { Transaction } from 'dexie';
const keys = ['kcal', 'proteinG', 'carbsG', 'fatG'] as const;
function known(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
export async function migrateNutrition(tx: Transaction) {
  const fallback = '1970-01-01T00:00:00.000Z';
  await tx
    .table('foods')
    .toCollection()
    .modify((food) => {
      if (!food.per100g)
        food.per100g = {
          kcal: known(food.kcalPer100g),
          proteinG: known(food.proteinPer100g),
          carbsG: known(food.carbsPer100g),
          fatG: known(food.fatPer100g),
        };
      if (typeof food.source === 'string' || !food.source) {
        food.legacySource = food.source;
        food.source = {
          kind: 'user',
          reference:
            typeof food.source === 'string' ? food.source : '旧版来源未注明',
        };
      }
      food.state ??= 'unspecified';
      food.isBuiltIn ??= false;
      food.archived ??= false;
      food.createdAt ??= fallback;
      food.updatedAt ??= food.createdAt;
      food.revision ??= 0;
    });
  await tx
    .table('mealEntries')
    .toCollection()
    .modify((entry) => {
      const old = entry.nutritionSnapshot ?? {};
      if (!old.per100g) {
        const per100g = Object.fromEntries(
          keys.map((key) => {
            const value = known(old[key]);
            return [
              key,
              value !== null && Number.isFinite(entry.grams) && entry.grams > 0
                ? known((value * 100) / entry.grams)
                : null,
            ];
          }),
        );
        entry.legacySnapshot = old;
        entry.nutritionSnapshot = {
          foodName: entry.foodName ?? '旧记录（食品名未保存）',
          state: 'unspecified',
          per100g,
          source: {
            kind: 'user',
            reference: '旧版已摄入快照换算；原始生熟状态与来源未保留',
          },
        };
      }
      entry.localDate ??= entry.date ?? '未注明日期';
      entry.createdAt ??= fallback;
      entry.updatedAt ??= entry.createdAt;
      entry.revision ??= 0;
    });
  await tx
    .table('nutritionGoals')
    .toCollection()
    .modify((goals) => {
      for (const key of keys) goals[key] ??= null;
      goals.updatedAt ??= fallback;
      goals.revision ??= 0;
    });
  // No writes to Habits, Training or Settings; no store deletion or reset.
}
