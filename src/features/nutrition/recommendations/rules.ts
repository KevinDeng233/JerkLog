import type {
  NutritionGoals,
  NutritionPreferences,
  DietaryRestriction,
} from '../../../db/models';
import type { NutritionTotals } from '../calculators/nutrition';
const proteins = [
  { name: '煮熟的鸡胸肉', diet: 'omnivore', allergens: [] },
  { name: '豆腐', diet: 'vegan', allergens: ['soy'] },
  { name: '煮熟的鸡蛋', diet: 'vegetarian', allergens: ['egg'] },
  { name: '煮熟的扁豆', diet: 'vegan', allergens: [] },
] as const;
export function mealIdeas(
  preferences: NutritionPreferences,
  goals: NutritionGoals,
  totals: NutritionTotals,
  entryCount: number,
) {
  if (preferences.goal === null) return [];
  if (preferences.otherRestrictions.trim())
    return [
      {
        id: 'extra-restrictions',
        title: '先按你的额外忌口选择',
        reason:
          '存在额外忌口，示例无法核对全部成分，暂不提供组合。你可以忽略建议，按自身条件自行选择。',
        combination: '',
        alternatives: [],
      },
    ];
  const allowed = proteins.filter(
    (item) =>
      (preferences.diet === 'omnivore' ||
        item.diet === 'vegan' ||
        (preferences.diet === 'vegetarian' && item.diet === 'vegetarian')) &&
      !item.allergens.some((allergen) =>
        preferences.restrictions.includes(allergen as DietaryRestriction),
      ),
  );
  const reason = !entryCount
    ? '这一天尚无饮食记录，以下仅是你主动选择的饮食方向示例。'
    : totals.proteinG.missing
      ? '部分记录的蛋白质未知，暂不判断与目标的差距。'
      : goals.proteinG !== null && totals.proteinG.known < goals.proteinG
        ? '已记录的蛋白质低于你手动设置的目标；这不代表全天饮食完整，也不代表营养缺乏。'
        : preferences.goal === 'muscle'
          ? '你选择了支持增肌方向，可在适合自己的饮食中安排蛋白质食物；不保证增肌结果。'
          : '你选择了均衡饮食方向，可考虑主食、蛋白质食物与蔬菜的组合。';
  return [
    {
      id: 'balanced-combination',
      title:
        preferences.goal === 'muscle'
          ? '可选的蛋白质食物组合'
          : '可选的均衡组合',
      reason,
      combination: `米饭 + ${allowed[0].name} + 蔬菜`,
      alternatives: allowed.slice(1).map((item) => item.name),
    },
  ];
}
