import type { Transaction } from 'dexie';
export async function migrateTraining(tx: Transaction) {
  const fallback = '1970-01-01T00:00:00.000Z';
  const exercises = await tx.table('exercises').toArray();
  const names = new Map(
    exercises.map((exercise) => [exercise.id, exercise.name]),
  );
  await tx
    .table('exercises')
    .toCollection()
    .modify((exercise) => {
      exercise.createdAt ??= fallback;
      exercise.updatedAt ??= exercise.createdAt;
      exercise.revision ??= 0;
    });
  for (const plan of await tx.table('workoutPlans').toArray()) {
    const days = [];
    for (const [order, name] of (plan.days ?? []).entries()) {
      const id = `legacy:${plan.id}:${order}`;
      days.push(id);
      await tx.table('planDays').put({
        id,
        planId: plan.id,
        name,
        order,
        kind: 'rest',
        exercises: [],
        createdAt: plan.createdAt ?? fallback,
        updatedAt: plan.createdAt ?? fallback,
      });
    }
    await tx.table('workoutPlans').put({
      ...plan,
      days,
      archived: plan.archived ?? false,
      createdAt: plan.createdAt ?? fallback,
      updatedAt: plan.updatedAt ?? plan.createdAt ?? fallback,
      revision: plan.revision ?? 0,
    });
  }
  await tx
    .table('workoutSets')
    .toCollection()
    .modify((set) => {
      set.exerciseName ??=
        names.get(set.exerciseId) ?? '旧版动作（名称未保留）';
      set.mode ??= 'weighted';
      set.weightGrams ??=
        typeof set.weightKg === 'number'
          ? Math.round(set.weightKg * 1000)
          : null;
      set.weightKg ??= null;
      set.order ??= 0;
      set.createdAt ??= fallback;
      set.updatedAt ??= set.createdAt;
      set.revision ??= 0;
    });
  const plans = new Map(
    (await tx.table('workoutPlans').toArray()).map((plan) => [
      plan.id,
      plan.name,
    ]),
  );
  for (const session of await tx.table('workoutSessions').toArray()) {
    const sets = await tx
      .table('workoutSets')
      .where('sessionId')
      .equals(session.id)
      .toArray();
    const snapshots = Array.from(
      new Map(
        sets.map((set) => [
          set.exerciseId,
          {
            id: `legacy:${set.exerciseId}`,
            exerciseId: set.exerciseId,
            name: set.exerciseName,
            sets: 0,
            repsMin: 1,
            repsMax: 1,
          },
        ]),
      ).values(),
    );
    await tx.table('workoutSessions').put({
      ...session,
      status: session.status ?? (session.endedAt ? 'completed' : 'paused'),
      intervals:
        session.intervals ??
        (session.endedAt
          ? [{ startedAt: session.startedAt, endedAt: session.endedAt }]
          : []),
      exercises: session.exercises ?? snapshots,
      planName: session.planName ?? plans.get(session.planId),
      createdAt: session.createdAt ?? session.startedAt,
      updatedAt: session.updatedAt ?? session.endedAt ?? session.startedAt,
      revision: session.revision ?? 0,
    });
  }
  // Habits, habitState, settings and Nutrition stores are never written here.
}
