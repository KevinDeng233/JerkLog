export interface HabitEntry {
  id: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}
export interface WorkoutPlan {
  id: string;
  name: string;
  goal?: string;
  days: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
}
export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string;
  isCustom: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}
export interface PlannedExercise {
  id: string;
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  notes?: string;
}
export interface PlanDay {
  id: string;
  planId: string;
  name: string;
  kind: 'training' | 'rest';
  order: number;
  exercises: PlannedExercise[];
  createdAt: string;
  updatedAt: string;
}
export interface SessionExercise extends PlannedExercise {
  name: string;
}
export interface WorkoutSession {
  id: string;
  planId?: string;
  planName?: string;
  dayName?: string;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'paused' | 'completed';
  intervals: { startedAt: string; endedAt?: string }[];
  exercises: SessionExercise[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}
export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  reps: number;
  mode: 'weighted' | 'bodyweight' | 'loadless';
  weightKg: number | null;
  weightGrams: number | null;
  rpe?: number;
  rir?: number;
  notes?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
}
export interface TrainingMeta {
  id: 'control';
  lastCopyAt?: number;
  lastCopySource?: string;
  catalogVersion?: number;
  lastSetAt?: number;
  lastSetSignature?: string;
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

export interface HabitState {
  id: 'control';
  lastQuickAt?: number;
  undo?: { before?: HabitEntry; after?: HabitEntry };
}
