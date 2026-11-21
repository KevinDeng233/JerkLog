import type { WorkoutSession, WorkoutSet } from '../../db/models';
export function loggedVolume(sets: WorkoutSet[]) {
  const eligible = sets.filter(
    (set) =>
      set.completed && set.mode === 'weighted' && set.weightGrams !== null,
  );
  return {
    kgReps:
      eligible.reduce((sum, set) => sum + set.weightGrams! * set.reps, 0) /
      1000,
    weightedSets: eligible.length,
    unweightedSets: sets.filter(
      (set) => set.completed && set.mode !== 'weighted',
    ).length,
  };
}
export function activeSeconds(session: WorkoutSession, now = new Date()) {
  return Math.floor(
    session.intervals.reduce(
      (sum, part) =>
        sum +
        Math.max(
          0,
          Date.parse(part.endedAt ?? session.endedAt ?? now.toISOString()) -
            Date.parse(part.startedAt),
        ),
      0,
    ) / 1000,
  );
}
export function trainingSummary(sessions: WorkoutSession[], now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const completed = sessions
    .filter((session) => session.status === 'completed')
    .sort(
      (a, b) =>
        Date.parse(b.endedAt ?? b.startedAt) -
        Date.parse(a.endedAt ?? a.startedAt),
    );
  return {
    week: completed.filter((session) => {
      const time = Date.parse(session.endedAt ?? session.startedAt);
      return time >= start.getTime() && time <= now.getTime();
    }).length,
    latest: [...sessions].sort(
      (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
    )[0],
    completed,
  };
}
