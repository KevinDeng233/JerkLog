import { db, type JerkLogDB } from '../../db/database';
export async function loadTrainingData(database: JerkLogDB = db) {
  const [exercises, plans, days, sessions, sets] = await Promise.all([
    database.exercises.orderBy('name').toArray(),
    database.workoutPlans.orderBy('updatedAt').reverse().toArray(),
    database.planDays.toArray(),
    database.workoutSessions.orderBy('startedAt').reverse().toArray(),
    database.workoutSets.toArray(),
  ]);
  return { exercises, plans, days, sessions, sets, error: '' };
}
