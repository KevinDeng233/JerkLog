export interface HabitEntry {
  id: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}
export interface WorkoutPlan {
  id: string;
  name: string;
  days: string[];
  createdAt: string;
}
export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string;
  isCustom: boolean;
}
export interface WorkoutSession {
  id: string;
  planId?: string;
  startedAt: string;
  endedAt?: string;
  notes?: string;
}
export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  reps: number;
  weightKg: number;
  rir?: number;
  completed: boolean;
}
export interface Nutrition {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}
export interface Food {
  id: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source: string;
  state: 'raw' | 'cooked' | 'unspecified';
}
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface MealEntry {
  id: string;
  foodId: string;
  foodName: string;
  date: string;
  mealType: MealType;
  grams: number;
  nutritionSnapshot: Nutrition;
}
export interface NutritionGoals {
  id: 'default';
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}
export interface Settings {
  id: 'default';
  language: 'zh-CN';
  theme: 'dark' | 'light' | 'system';
  humorMode: boolean;
  goal?: number;
}
