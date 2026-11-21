import type { Nutrient } from './calculators/nutrition';
export const nutrientLabels: Record<Nutrient, string> = {
  kcal: '热量',
  proteinG: '蛋白质',
  carbsG: '碳水',
  fatG: '脂肪',
};
export const foodStates = {
  raw: '生 / 未烹调',
  cooked: '熟',
  unspecified: '未注明',
};
