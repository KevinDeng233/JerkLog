import Dexie, { type EntityTable } from 'dexie';
import type {
  HabitEntry,
  HabitState,
  WorkoutPlan,
  Exercise,
  WorkoutSession,
  WorkoutSet,
  Food,
  MealEntry,
  NutritionGoals,
  Settings,
} from './models';

// Append versions with .upgrade(transaction => ...) when changing persisted data.
// Never edit an already shipped schema or delete a database to migrate it.
export class JerkLogDB extends Dexie {
  habitState!: EntityTable<HabitState, 'id'>;
  habitEntries!: EntityTable<HabitEntry, 'id'>;
  workoutPlans!: EntityTable<WorkoutPlan, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  workoutSessions!: EntityTable<WorkoutSession, 'id'>;
  workoutSets!: EntityTable<WorkoutSet, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  mealEntries!: EntityTable<MealEntry, 'id'>;
  nutritionGoals!: EntityTable<NutritionGoals, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'JerkLog') {
    super(name);
    this.version(1).stores({
      habitEntries: 'id, occurredAt',
      workoutPlans: 'id, createdAt',
      exercises: 'id, name',
      workoutSessions: 'id, startedAt, planId',
      workoutSets: 'id, sessionId, exerciseId',
      foods: 'id, name',
      mealEntries: 'id, date, foodId',
      nutritionGoals: 'id',
      settings: 'id',
    });
    this.version(2).stores({
      habitEntries: 'id, occurredAt, createdAt',
      habitState: 'id',
    });
  }
}
export const db = new JerkLogDB();
export const defaultSettings: Settings = {
  id: 'default',
  language: 'zh-CN',
  theme: 'dark',
  humorMode: false,
};
