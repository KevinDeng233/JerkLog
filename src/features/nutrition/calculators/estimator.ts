import { UserError } from '../../../lib/errors';
import { numeric } from './nutrition';
export const activityOptions = [
  { value: 1.2, label: '1.2 · 较低活动假设' },
  { value: 1.4, label: '1.4 · 一般活动假设' },
  { value: 1.6, label: '1.6 · 较多活动假设' },
  { value: 1.8, label: '1.8 · 高活动假设' },
];
export interface EstimateInput {
  ageYears: number;
  weightKg: number;
  heightCm: number;
  equation: 'male' | 'female';
  multiplier: number;
  consent: boolean;
  pregnantOrBreastfeeding: boolean;
  unsuitable: boolean;
}
export function estimateEnergy(input: EstimateInput) {
  if (!input.consent || input.pregnantOrBreastfeeding || input.unsuitable)
    throw new UserError(
      '当前条件不适用此估算器。你仍可正常记录饮食和手动设置目标。',
    );
  numeric(input.ageYears, 18, 100, '年龄', 0);
  numeric(input.weightKg, 30, 300, '体重', 1);
  numeric(input.heightCm, 120, 230, '身高', 1);
  if (
    !['male', 'female'].includes(input.equation) ||
    !activityOptions.some((option) => option.value === input.multiplier)
  )
    throw new UserError('请自主选择公式系数与活动假设，不会替你猜测。');
  const ree =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * input.ageYears +
    (input.equation === 'male' ? 5 : -161);
  return {
    ree,
    maintenance: ree * input.multiplier,
    displayRee: Math.round(ree / 50) * 50,
    displayMaintenance: Math.round((ree * input.multiplier) / 50) * 50,
  };
}
