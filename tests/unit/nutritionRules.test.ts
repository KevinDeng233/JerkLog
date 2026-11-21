import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  estimateEnergy,
  type EstimateInput,
} from '../../src/features/nutrition/calculators/estimator';
import { aggregate } from '../../src/features/nutrition/calculators/nutrition';
import {
  defaultGoals,
  defaultPreferences,
} from '../../src/features/nutrition/repository';
import { mealIdeas } from '../../src/features/nutrition/recommendations/rules';
const input: EstimateInput = {
  ageYears: 30,
  weightKg: 70,
  heightCm: 175,
  equation: 'male',
  multiplier: 1.2,
  consent: true,
  pregnantOrBreastfeeding: false,
  unsuitable: false,
};
describe('optional adult estimate', () => {
  it('matches known simplified Mifflin-St Jeor examples and keeps display coarse', () => {
    const male = estimateEnergy(input);
    expect(male.ree).toBe(1648.75);
    expect(male.maintenance).toBeCloseTo(1978.5);
    expect(male.displayMaintenance).toBe(2000);
    expect(estimateEnergy({ ...input, equation: 'female' }).ree).toBe(1482.75);
  });
  it.each([
    { ageYears: 17 },
    { ageYears: NaN },
    { weightKg: 0 },
    { heightCm: Infinity },
    { consent: false },
    { pregnantOrBreastfeeding: true },
    { unsuitable: true },
    { multiplier: 0 },
    { equation: '' as 'male' },
  ])('blocks unsuitable/missing input %o', (patch) =>
    expect(() => estimateEnergy({ ...input, ...patch })).toThrow(),
  );
  it('allows adults at declared age bounds but never returns weight-loss targets', () => {
    expect(
      estimateEnergy({ ...input, ageYears: 18 }).maintenance,
    ).toBeGreaterThan(0);
    expect(
      estimateEnergy({ ...input, ageYears: 100 }).maintenance,
    ).toBeGreaterThan(0);
    expect(Object.keys(estimateEnergy(input))).not.toContain('weightLoss');
  });
});
describe('optional explainable meal ideas', () => {
  it('does not recommend until a goal is explicitly selected and does not infer dietary deficiency from empty logs', () => {
    expect(
      mealIdeas(
        defaultPreferences,
        defaultGoals,
        aggregate([], '2026-11-20'),
        0,
      ),
    ).toEqual([]);
    const ideas = mealIdeas(
      { ...defaultPreferences, goal: 'balanced' },
      defaultGoals,
      aggregate([], '2026-11-20'),
      0,
    );
    expect(ideas[0].reason).toContain('尚无饮食记录');
  });
  it('filters vegan/vegetarian choices and selected allergies, retaining safe alternatives rather than numerical promises', () => {
    const ideas = mealIdeas(
      {
        ...defaultPreferences,
        goal: 'muscle',
        diet: 'vegan',
        restrictions: ['soy', 'milk', 'egg', 'gluten', 'nuts', 'peanut'],
      },
      defaultGoals,
      aggregate([], '2026-11-20'),
      0,
    );
    expect(ideas[0].combination).toContain('扁豆');
    expect(JSON.stringify(ideas)).not.toMatch(/鸡胸|鸡蛋|豆腐|牛奶/);
  });
  it('abstains from combinations when extra restrictions cannot be checked', () => {
    const idea = mealIdeas(
      {
        ...defaultPreferences,
        goal: 'balanced',
        otherRestrictions: '合成测试：豆类不适用',
      },
      defaultGoals,
      aggregate([], '2026-11-20'),
      0,
    )[0];
    expect(idea.combination).toBe('');
    expect(idea.reason).toContain('暂不提供');
  });
  it('does not claim a protein gap for partial data', () => {
    const totals = aggregate([], '2026-11-20');
    totals.proteinG.missing = 1;
    const idea = mealIdeas(
      { ...defaultPreferences, goal: 'muscle' },
      { ...defaultGoals, proteinG: 120 },
      totals,
      1,
    )[0];
    expect(idea.reason).toContain('未知');
    expect(idea.reason).not.toContain('低于');
  });
  it('explains a difference only against an explicit target and complete known entries', () => {
    const totals = aggregate([], '2026-11-20');
    totals.proteinG = { known: 30, missing: 0, knownEntries: 1 };
    const idea = mealIdeas(
      { ...defaultPreferences, goal: 'muscle' },
      { ...defaultGoals, proteinG: 120 },
      totals,
      1,
    )[0];
    expect(idea.reason).toContain('手动设置');
    expect(idea.reason).toContain('不代表营养缺乏');
  });
  it('keeps calculator and recommendation modules independent of private Habits/Training sources', () => {
    for (const file of [
      'src/features/nutrition/recommendations/rules.ts',
      'src/features/nutrition/calculators/nutrition.ts',
      'src/features/nutrition/calculators/estimator.ts',
    ])
      expect(readFileSync(file, 'utf8')).not.toMatch(
        /habitEntries|habitState|workoutSessions|workoutSets|features\/habits/,
      );
  });
});
