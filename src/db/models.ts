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
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}
export interface FoodSource {
  kind: 'usda' | 'label' | 'user';
  reference?: string;
  revision?: string;
  dataset?: string;
  fdcId?: number;
  ndbNumber?: number;
  description?: string;
  verifiedAt?: string;
  license?: string;
}
export interface Food {
  id: string;
  name: string;
  brand?: string;
  state: 'raw' | 'cooked' | 'unspecified';
  per100g: Nutrition;
  source: FoodSource;
  servingGrams?: number;
  isBuiltIn: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
}
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface MealEntry {
  id: string;
  foodId?: string;
  localDate: string;
  mealType: MealType;
  grams: number;
  nutritionSnapshot: {
    foodName: string;
    brand?: string;
    state: Food['state'];
    per100g: Nutrition;
    source: FoodSource;
    servingGrams?: number;
  };
  createdAt: string;
  updatedAt: string;
  revision: number;
}
export interface NutritionGoals extends Nutrition {
  id: 'default';
  updatedAt: string;
  revision: number;
}
export type DietaryRestriction =
  | 'milk'
  | 'egg'
  | 'soy'
  | 'gluten'
  | 'peanut'
  | 'nuts'
  | 'fish'
  | 'shellfish';
export interface NutritionPreferences {
  id: 'default';
  goal: 'balanced' | 'muscle' | null;
  diet: 'omnivore' | 'vegetarian' | 'vegan';
  restrictions: DietaryRestriction[];
  otherRestrictions: string;
  dismissedDate?: string;
  updatedAt: string;
  revision: number;
}
export interface NutritionMeta {
  id: 'control';
  catalogVersion?: number;
  lastMealAt?: number;
  lastMealSignature?: string;
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
