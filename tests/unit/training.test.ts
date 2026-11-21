import { loadTrainingData } from '../../src/features/training/read';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JerkLogDB } from '../../src/db/database';
import {
  TrainingRepository,
  makePlan,
  type SetInput,
} from '../../src/features/training/repository';
import {
  exerciseCatalog,
  filterExercises,
  planTemplates,
} from '../../src/features/training/catalog';
import {
  loggedVolume,
  activeSeconds,
  trainingSummary,
} from '../../src/features/training/metrics';
import type { WorkoutSession } from '../../src/db/models';
let database: JerkLogDB;
let repo: TrainingRepository;
let now: number;
beforeEach(async () => {
  database = new JerkLogDB(`training-${crypto.randomUUID()}`);
  now = Date.parse('2026-11-21T12:00:00.000Z');
  repo = new TrainingRepository(database, () => new Date(now));
  await repo.ensureCatalog();
});
afterEach(async () => {
  await database.delete();
});
function setInput(sessionId: string, patch: Partial<SetInput> = {}): SetInput {
  return {
    id: crypto.randomUUID(),
    sessionId,
    exerciseId: 'builtin:bench',
    mode: 'weighted',
    reps: 10,
    weightKg: 50,
    ...patch,
  };
}
async function freshSession(id: string) {
  return (await database.workoutSessions.get(id))!;
}
describe('exercise library', () => {
  it('seeds exactly once over repeated launches and concurrent connections', async () => {
    const second = new JerkLogDB(database.name);
    try {
      await Promise.all([
        repo.ensureCatalog(),
        new TrainingRepository(second).ensureCatalog(),
      ]);
      expect(await database.exercises.count()).toBe(exerciseCatalog.length);
      database.close();
      await database.open();
      await repo.ensureCatalog();
      expect(await database.exercises.count()).toBe(exerciseCatalog.length);
    } finally {
      second.close();
    }
  });
  it('creates, edits, searches and deletes a custom exercise; builtins are protected', async () => {
    const input = {
      id: crypto.randomUUID(),
      name: '测试抬举',
      equipment: '哑铃',
      muscleGroups: ['肩'],
      notes: '测试备注',
    };
    const created = await repo.saveExercise(input);
    const edited = await repo.saveExercise({ ...created, name: '测试抬举改' });
    expect(
      filterExercises(
        await database.exercises.toArray(),
        '抬举',
        '肩',
        '哑铃',
      ).map((item) => item.id),
    ).toEqual([created.id]);
    await repo.deleteExercise(edited);
    expect(await database.exercises.get(created.id)).toBeUndefined();
    await expect(repo.deleteExercise(exerciseCatalog[0])).rejects.toThrow(
      '内置',
    );
  });
  it('rejects missing names and repeated same-name/equipment submissions', async () => {
    const input = {
      id: crypto.randomUUID(),
      name: '测试动作',
      equipment: '其他',
      muscleGroups: ['全身'],
    };
    await repo.saveExercise(input);
    await expect(
      repo.saveExercise({ ...input, id: crypto.randomUUID() }),
    ).rejects.toThrow('已存在');
    await expect(
      repo.saveExercise({ ...input, id: crypto.randomUUID(), name: ' ' }),
    ).rejects.toThrow('动作名称');
  });
});
describe('plans and schedules', () => {
  it.each(planTemplates.map((item) => item.id))(
    'persists editable template %s without sharing ids',
    async (template) => {
      const draft = makePlan(template);
      const saved = await repo.savePlan(draft, true);
      const copy = await repo.duplicatePlan(saved.plan);
      const copiedDays = await database.planDays
        .where('planId')
        .equals(copy.id)
        .sortBy('order');
      expect(copiedDays).toHaveLength(saved.days.length);
      expect(copy.days.some((id) => saved.plan.days.includes(id))).toBe(false);
      copiedDays[0].name = '副本日程';
      await repo.savePlan({ plan: copy, days: copiedDays });
      expect((await database.planDays.get(saved.days[0].id))?.name).toBe(
        saved.days[0].name,
      );
    },
  );
  it('saves day/exercise order, renaming, rest days, archive/restore and deletion', async () => {
    let saved = await repo.savePlan(makePlan('four'), true);
    const first = saved.days[0];
    first.name = '胸部训练日';
    first.exercises.reverse();
    saved.days = [saved.days[1], first, ...saved.days.slice(2)];
    saved = await repo.savePlan(saved);
    expect(saved.plan.days[1]).toBe(first.id);
    expect(
      (await database.planDays.get(first.id))?.exercises[0].exerciseId,
    ).toBe('builtin:incline');
    await repo.archivePlan(saved.plan, true);
    const archived = (await database.workoutPlans.get(saved.plan.id))!;
    await expect(repo.start(archived.id, first.id)).rejects.toThrow('未归档');
    await repo.archivePlan(archived, false);
    await repo.deletePlan((await database.workoutPlans.get(saved.plan.id))!);
    expect(
      await database.planDays.where('planId').equals(saved.plan.id).count(),
    ).toBe(0);
  });
  it('rejects stale edits, invalid reps and missing training-day exercises', async () => {
    const saved = await repo.savePlan(makePlan('four'), true);
    await repo.savePlan(saved);
    await expect(repo.savePlan(saved)).rejects.toThrow('数据已变化');
    const draft = makePlan('four');
    draft.days[0].exercises[0].repsMax = 1;
    await expect(repo.savePlan(draft, true)).rejects.toThrow('次数上限');
    await expect(repo.savePlan(makePlan(), true)).rejects.toThrow(
      '训练日需添加动作',
    );
  });
  it('rolls back an incomplete plan write and prevents duplicate copies', async () => {
    const fail = () => {
      throw new Error('synthetic write failure');
    };
    database.planDays.hook('creating', fail);
    await expect(repo.savePlan(makePlan('four'), true)).rejects.toThrow();
    expect(await database.workoutPlans.count()).toBe(0);
    database.planDays.hook('creating').unsubscribe(fail);
    const saved = await repo.savePlan(makePlan('four'), true);
    await repo.duplicatePlan(saved.plan);
    await expect(repo.duplicatePlan(saved.plan)).rejects.toThrow('刚刚');
  });
  it('protects custom exercises still referenced by plans', async () => {
    const exercise = await repo.saveExercise({
      id: crypto.randomUUID(),
      name: '计划用动作',
      equipment: '其他',
      muscleGroups: ['全身'],
    });
    const draft = makePlan('four');
    draft.days[0].exercises[0].exerciseId = exercise.id;
    await repo.savePlan(draft, true);
    await expect(repo.deleteExercise(exercise)).rejects.toThrow('计划使用');
  });
});
describe('sessions, sets and snapshots', () => {
  it('runs the manual acceptance flow and retains history through edits/deletions', async () => {
    const saved = await repo.savePlan(makePlan('four'), true);
    const session = await repo.start(saved.plan.id, saved.days[0].id);
    const first = await repo.saveSet(setInput(session.id));
    now += 2000;
    await repo.saveSet(
      setInput(session.id, {
        exerciseId: 'builtin:incline',
        reps: 12,
        weightKg: 20,
      }),
    );
    await repo.saveSet({ ...first, revision: first.revision, reps: 8 });
    now += 60000;
    await repo.transition(await freshSession(session.id), 'completed');
    const updated = await repo.savePlan({
      ...saved,
      plan: { ...saved.plan, name: '已修改计划' },
    });
    await repo.archivePlan(updated.plan, true);
    await repo.deletePlan((await database.workoutPlans.get(saved.plan.id))!);
    database.close();
    await database.open();
    const history = await freshSession(session.id);
    expect(history.planName).toBe('四分化 · 胸背肩腿');
    expect(history.dayName).toBe('胸');
    expect(history.exercises.map((item) => item.name)).toEqual([
      '杠铃卧推',
      '上斜哑铃卧推',
    ]);
    expect(
      loggedVolume(
        await database.workoutSets
          .where('sessionId')
          .equals(session.id)
          .toArray(),
      ).kgReps,
    ).toBe(640);
    expect(trainingSummary([history], new Date(now)).week).toBe(1);
  });
  it('snapshots a custom exercise before later rename/delete', async () => {
    const exercise = await repo.saveExercise({
      id: crypto.randomUUID(),
      name: '原始动作',
      equipment: '其他',
      muscleGroups: ['全身'],
    });
    const session = await repo.start();
    await repo.saveSet(setInput(session.id, { exerciseId: exercise.id }));
    const edited = await repo.saveExercise({ ...exercise, name: '新版动作' });
    await repo.deleteExercise(edited);
    expect((await database.workoutSets.toArray())[0].exerciseName).toBe(
      '原始动作',
    );
    expect((await freshSession(session.id)).exercises[0].name).toBe('原始动作');
  });
  it('records pause/resume timestamps and excludes paused time from duration', async () => {
    const session = await repo.start();
    await repo.saveSet(setInput(session.id));
    now += 60000;
    const paused = await repo.transition(
      await freshSession(session.id),
      'paused',
    );
    now += 120000;
    expect(activeSeconds(paused, new Date(now))).toBe(60);
    const resumed = await repo.transition(paused, 'active');
    now += 30000;
    const finished = await repo.transition(resumed, 'completed');
    expect(activeSeconds(finished)).toBe(90);
    expect(finished.endedAt).toBe(new Date(now).toISOString());
    expect(await repo.transition(finished, 'completed')).toEqual(finished);
  });
  it('supports loadless/bodyweight null loads and exact decimal volume without inferred weight', async () => {
    const session = await repo.start();
    await repo.saveSet(
      setInput(session.id, { mode: 'bodyweight', weightKg: null, reps: 12 }),
    );
    await repo.saveSet(
      setInput(session.id, { mode: 'loadless', weightKg: null, reps: 15 }),
    );
    await repo.saveSet(
      setInput(session.id, { mode: 'weighted', weightKg: 2.125, reps: 3 }),
    );
    const sets = await database.workoutSets.toArray();
    expect(
      sets
        .filter((set) => set.mode !== 'weighted')
        .every((set) => set.weightKg === null && set.weightGrams === null),
    ).toBe(true);
    expect(loggedVolume(sets)).toEqual({
      kgReps: 6.375,
      weightedSets: 1,
      unweightedSets: 2,
    });
  });
  it('edits/deletes sets, validates paused/completed states and allows abandoning an empty session', async () => {
    const session = await repo.start();
    await expect(repo.transition(session, 'completed')).rejects.toThrow(
      '至少记录一组',
    );
    let set = await repo.saveSet(setInput(session.id));
    set = await repo.saveSet({ ...set, reps: 8, rpe: 7.5 });
    expect(set.reps).toBe(8);
    const paused = await repo.transition(
      await freshSession(session.id),
      'paused',
    );
    await expect(repo.deleteSet(set)).rejects.toThrow('恢复');
    await repo.transition(paused, 'active');
    await repo.deleteSet(set);
    expect(await database.workoutSets.count()).toBe(0);
    await repo.abandon(await freshSession(session.id));
    expect(await database.workoutSessions.count()).toBe(0);
  });
  it('serializes rapid session starts across connections and duplicate set submits', async () => {
    const second = new JerkLogDB(database.name);
    try {
      const other = new TrainingRepository(second, () => new Date(now));
      const starts = await Promise.allSettled([repo.start(), other.start()]);
      expect(starts.filter((item) => item.status === 'fulfilled')).toHaveLength(
        1,
      );
      const session = (await database.workoutSessions.toArray())[0];
      const input = setInput(session.id);
      await repo.saveSet(input);
      await expect(other.saveSet(input)).rejects.toThrow('重复提交');
      await expect(other.saveSet(setInput(session.id))).rejects.toThrow('刚刚');
      now += 1500;
      await repo.saveSet(setInput(session.id));
      expect(await database.workoutSets.count()).toBe(2);
    } finally {
      second.close();
    }
  });
  it('rolls back set/session updates if saving submission control fails, allowing retry', async () => {
    const session = await repo.start();
    const fail = () => {
      throw new Error('synthetic disk failure');
    };
    database.trainingMeta.hook('updating', fail);
    await expect(repo.saveSet(setInput(session.id))).rejects.toThrow();
    expect(await database.workoutSets.count()).toBe(0);
    expect((await freshSession(session.id)).revision).toBe(0);
    database.trainingMeta.hook('updating').unsubscribe(fail);
    await repo.saveSet(setInput(session.id));
    expect(await database.workoutSets.count()).toBe(1);
  });
  it.each([
    { reps: 0 },
    { reps: -1 },
    { reps: 1.2 },
    { reps: NaN },
    { weightKg: -1 },
    { weightKg: null },
    { weightKg: 0.0001 },
    { rpe: 11 },
    { rpe: 7.2 },
    { rir: 1.5 },
    { rpe: 7, rir: 2 },
    { mode: 'bodyweight' as const, weightKg: 50 },
  ])('rejects invalid set %o without partial writes', async (patch) => {
    const session = await repo.start();
    await expect(repo.saveSet(setInput(session.id, patch))).rejects.toThrow();
    expect(await database.workoutSets.count()).toBe(0);
  });
});
describe('weekly date boundaries', () => {
  const session = (
    id: string,
    endedAt: string,
    status: WorkoutSession['status'] = 'completed',
  ): WorkoutSession => ({
    id,
    startedAt: endedAt,
    endedAt,
    status,
    intervals: [],
    exercises: [],
    createdAt: endedAt,
    updatedAt: endedAt,
    revision: 0,
  });
  it('counts completion within the Monday local week, excludes future/uncompleted sessions', () => {
    const sessions = [
      session('before', '2026-11-15T23:59:59-05:00'),
      session('monday', '2026-11-16T00:00:00-05:00'),
      session('today', '2026-11-21T12:00:00-05:00'),
      session('future', '2026-11-22T00:00:00-05:00'),
      session('active', '2026-11-21T12:00:01-05:00', 'active'),
    ];
    expect(
      trainingSummary(sessions, new Date('2026-11-21T13:00:00-05:00')).week,
    ).toBe(2);
  });
  it('handles a DST and year boundary with calendar setters', () => {
    expect(
      trainingSummary(
        [
          session('a', '2026-03-08T23:59:59-04:00'),
          session('b', '2026-03-09T00:00:00-04:00'),
        ],
        new Date('2026-03-09T01:00:00-04:00'),
      ).week,
    ).toBe(1);
    expect(
      trainingSummary(
        [session('c', '2025-12-29T00:00:00-05:00')],
        new Date('2026-01-01T12:00:00-05:00'),
      ).week,
    ).toBe(1);
  });
});

it('reads the real Training screen queries using the shipped schema indexes', async () => {
  const saved = await repo.savePlan(makePlan('four'), true);
  const session = await repo.start(saved.plan.id, saved.days[0].id);
  await repo.saveSet(setInput(session.id));
  const data = await loadTrainingData(database);
  expect(data.error).toBe('');
  expect(data.days.length).toBe(saved.days.length);
  expect(data.sessions[0].id).toBe(session.id);
  expect(data.sets).toHaveLength(1);
  expect(data.exercises.length).toBe(exerciseCatalog.length);
});
