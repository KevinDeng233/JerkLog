import { db, type JerkLogDB } from '../../db/database';
import type {
  Exercise,
  WorkoutPlan,
  PlanDay,
  WorkoutSession,
  WorkoutSet,
} from '../../db/models';
import { UserError } from '../../lib/errors';
import { exerciseCatalog, planTemplates } from './catalog';
export type PlanBundle = { plan: WorkoutPlan; days: PlanDay[] };
export type SetInput = Pick<
  WorkoutSet,
  | 'id'
  | 'sessionId'
  | 'exerciseId'
  | 'mode'
  | 'reps'
  | 'weightKg'
  | 'rpe'
  | 'rir'
  | 'notes'
> & { revision?: number };
export function clean(
  value: string,
  label: string,
  max = 120,
  optional = false,
) {
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (!optional && !value.trim())
  )
    throw new UserError(`${label}需填写有效文本，最多 ${max} 字。`);
  return value.trim();
}
function number(
  value: number,
  label: string,
  min: number,
  max: number,
  integer = false,
) {
  if (
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isSafeInteger(value))
  )
    throw new UserError(
      `${label}必须是 ${min} 至 ${max} 的${integer ? '整数' : '有效数值'}。`,
    );
}
function checkRevision(
  current: { revision: number } | undefined,
  revision: number,
) {
  if (!current || current.revision !== revision)
    throw new UserError('数据已变化，请重新打开最新记录后操作。');
}
export function makePlan(templateId?: string): PlanBundle {
  const template = templateId
    ? planTemplates.find((item) => item.id === templateId)
    : undefined;
  if (templateId && !template) throw new UserError('模板不存在。');
  const stamp = new Date().toISOString();
  const planId = crypto.randomUUID();
  const days = (template?.days ?? [{ name: '训练日 1', moves: [] }]).map(
    (day, order): PlanDay => ({
      id: crypto.randomUUID(),
      planId,
      name: day.name,
      kind: day.moves.length || !template ? 'training' : 'rest',
      order,
      exercises: day.moves.map((move) => ({
        id: crypto.randomUUID(),
        exerciseId: `builtin:${move}`,
        sets: 3,
        repsMin: 8,
        repsMax: 12,
      })),
      createdAt: stamp,
      updatedAt: stamp,
    }),
  );
  return {
    plan: {
      id: planId,
      name: template?.name ?? '',
      days: days.map((day) => day.id),
      archived: false,
      createdAt: stamp,
      updatedAt: stamp,
      revision: 0,
    },
    days,
  };
}
export class TrainingRepository {
  constructor(
    private database: JerkLogDB = db,
    private clock: () => Date = () => new Date(),
  ) {}
  private write<T>(fn: () => Promise<T>) {
    const d = this.database;
    return d.transaction(
      'rw',
      [
        d.exercises,
        d.workoutPlans,
        d.planDays,
        d.workoutSessions,
        d.workoutSets,
        d.trainingMeta,
      ],
      fn,
    );
  }
  async ensureCatalog() {
    return this.write(async () => {
      const meta = (await this.database.trainingMeta.get('control')) ?? {
        id: 'control' as const,
      };
      if (meta.catalogVersion === 1) return;
      for (const exercise of exerciseCatalog)
        if (!(await this.database.exercises.get(exercise.id)))
          await this.database.exercises.add(exercise);
      await this.database.trainingMeta.put({ ...meta, catalogVersion: 1 });
    });
  }
  async saveExercise(
    input: Pick<
      Exercise,
      'id' | 'name' | 'equipment' | 'muscleGroups' | 'notes'
    > & { revision?: number },
  ) {
    return this.write(async () => {
      const current = await this.database.exercises.get(input.id);
      if (current) {
        if (!current.isCustom)
          throw new UserError('内置动作保留为参考，请创建自己的动作。');
        checkRevision(current, input.revision!);
      }
      const name = clean(input.name, '动作名称');
      const equipment = clean(input.equipment, '器械', 60);
      if (!Array.isArray(input.muscleGroups) || input.muscleGroups.length !== 1)
        throw new UserError('请选择一个主要肌群。');
      const muscleGroups = [clean(input.muscleGroups[0], '主要肌群', 60)];
      const duplicates = await this.database.exercises
        .filter(
          (item) =>
            item.id !== input.id &&
            item.name.toLocaleLowerCase() === name.toLocaleLowerCase() &&
            item.equipment.toLocaleLowerCase() ===
              equipment.toLocaleLowerCase(),
        )
        .count();
      if (duplicates)
        throw new UserError('同名同器械的动作已存在，请直接选择已有动作。');
      const stamp = this.clock().toISOString();
      const saved: Exercise = {
        id: input.id,
        name,
        equipment,
        muscleGroups,
        notes: clean(input.notes ?? '', '备注', 1000, true),
        isCustom: true,
        createdAt: current?.createdAt ?? stamp,
        updatedAt: stamp,
        revision: (current?.revision ?? -1) + 1,
      };
      await this.database.exercises.put(saved);
      return saved;
    });
  }
  async deleteExercise(expected: Exercise) {
    return this.write(async () => {
      const current = await this.database.exercises.get(expected.id);
      checkRevision(current, expected.revision);
      if (!current!.isCustom) throw new UserError('内置动作不能删除。');
      if (
        await this.database.planDays
          .filter((day) =>
            day.exercises.some((item) => item.exerciseId === expected.id),
          )
          .count()
      )
        throw new UserError('此动作仍被计划使用，请先从计划中移除。');
      await this.database.exercises.delete(expected.id);
    });
  }
  async savePlan(bundle: PlanBundle, isNew = false) {
    return this.write(async () => {
      const { plan, days } = bundle;
      const existing = await this.database.workoutPlans.get(plan.id);
      if (isNew && existing)
        throw new UserError('此计划已保存，请勿重复提交。');
      if (!isNew) checkRevision(existing, plan.revision);
      if (!Array.isArray(days) || days.length < 1 || days.length > 60)
        throw new UserError('计划需包含 1 至 60 个日程。');
      if (new Set(days.map((day) => day.id)).size !== days.length)
        throw new UserError('日程 ID 不可重复。');
      const stamp = this.clock().toISOString();
      const savedDays: PlanDay[] = [];
      for (const [order, day] of days.entries()) {
        const stored = await this.database.planDays.get(day.id);
        if (stored && stored.planId !== plan.id)
          throw new UserError('日程归属不匹配。');
        if (!['training', 'rest'].includes(day.kind))
          throw new UserError('日程类型无效。');
        if (
          !Array.isArray(day.exercises) ||
          day.exercises.length > 100 ||
          (day.kind === 'training' && day.exercises.length === 0) ||
          (day.kind === 'rest' && day.exercises.length > 0)
        )
          throw new UserError('训练日需添加动作，休息日应为空。');
        if (
          new Set(day.exercises.map((item) => item.id)).size !==
          day.exercises.length
        )
          throw new UserError('日程动作 ID 不可重复。');
        for (const item of day.exercises) {
          if (!(await this.database.exercises.get(item.exerciseId)))
            throw new UserError('计划中的动作已不存在，请重新选择。');
          number(item.sets, '计划组数', 1, 100, true);
          number(item.repsMin, '计划次数', 1, 10000, true);
          number(item.repsMax, '次数上限', item.repsMin, 10000, true);
          clean(item.notes ?? '', '动作备注', 1000, true);
        }
        savedDays.push({
          ...day,
          planId: plan.id,
          name: clean(day.name, '日程名称'),
          order,
          exercises: structuredClone(day.exercises),
          createdAt: stored?.createdAt ?? stamp,
          updatedAt: stamp,
        });
      }
      const saved: WorkoutPlan = {
        id: plan.id,
        name: clean(plan.name, '计划名称'),
        goal: clean(plan.goal ?? '', '计划目标', 300, true),
        days: savedDays.map((day) => day.id),
        archived: existing?.archived ?? false,
        createdAt: existing?.createdAt ?? stamp,
        updatedAt: stamp,
        revision: (existing?.revision ?? -1) + 1,
      };
      await this.database.planDays.where('planId').equals(plan.id).delete();
      await this.database.planDays.bulkAdd(savedDays);
      await this.database.workoutPlans.put(saved);
      return { plan: saved, days: savedDays };
    });
  }
  async archivePlan(expected: WorkoutPlan, archived: boolean) {
    return this.write(async () => {
      const plan = await this.database.workoutPlans.get(expected.id);
      checkRevision(plan, expected.revision);
      await this.database.workoutPlans.update(expected.id, {
        archived,
        updatedAt: this.clock().toISOString(),
        revision: plan!.revision + 1,
      });
    });
  }
  async deletePlan(expected: WorkoutPlan) {
    return this.write(async () => {
      checkRevision(
        await this.database.workoutPlans.get(expected.id),
        expected.revision,
      );
      await this.database.planDays.where('planId').equals(expected.id).delete();
      await this.database.workoutPlans.delete(expected.id);
    });
  }
  async duplicatePlan(expected: WorkoutPlan) {
    return this.write(async () => {
      const current = await this.database.workoutPlans.get(expected.id);
      checkRevision(current, expected.revision);
      const meta = (await this.database.trainingMeta.get('control')) ?? {
        id: 'control' as const,
      };
      const now = this.clock();
      if (
        meta.lastCopySource === expected.id &&
        meta.lastCopyAt !== undefined &&
        now.getTime() - meta.lastCopyAt >= 0 &&
        now.getTime() - meta.lastCopyAt < 1500
      )
        throw new UserError('刚刚已复制，请稍候。');
      const days = await this.database.planDays
        .where('planId')
        .equals(expected.id)
        .sortBy('order');
      const plan = {
        ...current!,
        id: crypto.randomUUID(),
        name: clean(current!.name.slice(0, 117) + ' 副本', '计划名称'),
        archived: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        revision: 0,
      };
      const copies = days.map((day) => ({
        ...day,
        id: crypto.randomUUID(),
        planId: plan.id,
        exercises: day.exercises.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
        })),
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      }));
      plan.days = copies.map((day) => day.id);
      await this.database.workoutPlans.add(plan);
      await this.database.planDays.bulkAdd(copies);
      await this.database.trainingMeta.put({
        ...meta,
        lastCopyAt: now.getTime(),
        lastCopySource: expected.id,
      });
      return plan;
    });
  }
  async start(planId?: string, dayId?: string) {
    return this.write(async () => {
      if (
        await this.database.workoutSessions
          .where('status')
          .anyOf('active', 'paused')
          .count()
      )
        throw new UserError('请先完成或放弃正在进行的训练。');
      const plan = planId
        ? await this.database.workoutPlans.get(planId)
        : undefined;
      const day = dayId ? await this.database.planDays.get(dayId) : undefined;
      if (
        (planId && !plan) ||
        plan?.archived ||
        (planId &&
          (!day || day.planId !== planId || day.kind !== 'training')) ||
        (!planId && dayId)
      )
        throw new UserError('请选择有效的未归档计划训练日。');
      const exercises = [];
      for (const item of day?.exercises ?? []) {
        const exercise = await this.database.exercises.get(item.exerciseId);
        if (!exercise) throw new UserError('动作不存在，请先编辑计划。');
        exercises.push({ ...item, name: exercise.name });
      }
      const stamp = this.clock().toISOString();
      const session: WorkoutSession = {
        id: crypto.randomUUID(),
        planId: plan?.id,
        planName: plan?.name,
        dayName: day?.name,
        startedAt: stamp,
        status: 'active',
        intervals: [{ startedAt: stamp }],
        exercises,
        createdAt: stamp,
        updatedAt: stamp,
        revision: 0,
      };
      await this.database.workoutSessions.add(session);
      return session;
    });
  }
  async transition(
    expected: WorkoutSession,
    next: 'paused' | 'active' | 'completed',
  ) {
    return this.write(async () => {
      const session = await this.database.workoutSessions.get(expected.id);
      if (session?.status === 'completed' && next === 'completed')
        return session;
      checkRevision(session, expected.revision);
      const current = session!;
      const stamp = this.clock().toISOString();
      if (
        current.status === 'completed' ||
        (next === 'paused' && current.status !== 'active') ||
        (next === 'active' && current.status !== 'paused')
      )
        throw new UserError('训练状态已变化，请刷新后操作。');
      if (Date.parse(stamp) < Date.parse(current.updatedAt))
        throw new UserError('系统时间早于最近操作，请检查时钟。');
      if (
        next === 'completed' &&
        !(await this.database.workoutSets
          .where('sessionId')
          .equals(current.id)
          .filter((set) => set.completed)
          .count())
      )
        throw new UserError('至少记录一组后再完成训练，或选择放弃训练。');
      if (
        next === 'active' &&
        (await this.database.workoutSessions
          .where('status')
          .equals('active')
          .filter((item) => item.id !== current.id)
          .count())
      )
        throw new UserError('已有其他训练正在进行。');
      const intervals = structuredClone(current.intervals);
      if (
        current.status === 'active' &&
        intervals.at(-1) &&
        !intervals.at(-1)!.endedAt
      )
        intervals.at(-1)!.endedAt = stamp;
      if (next === 'active') intervals.push({ startedAt: stamp });
      const saved = {
        ...current,
        status: next,
        intervals,
        endedAt: next === 'completed' ? stamp : undefined,
        updatedAt: stamp,
        revision: current.revision + 1,
      };
      await this.database.workoutSessions.put(saved);
      return saved;
    });
  }
  async abandon(expected: WorkoutSession) {
    return this.write(async () => {
      const current = await this.database.workoutSessions.get(expected.id);
      checkRevision(current, expected.revision);
      if (current!.status === 'completed')
        throw new UserError('已完成训练不能从此处放弃。');
      await this.database.workoutSets
        .where('sessionId')
        .equals(expected.id)
        .delete();
      await this.database.workoutSessions.delete(expected.id);
    });
  }
  async saveSet(input: SetInput) {
    return this.write(async () => {
      const session = await this.database.workoutSessions.get(input.sessionId);
      if (session?.status !== 'active')
        throw new UserError('请先开始或恢复训练。');
      const current = await this.database.workoutSets.get(input.id);
      if (current) {
        if (input.revision === undefined)
          throw new UserError('该组已保存，请勿重复提交。');
        checkRevision(current, input.revision);
        if (current.sessionId !== session.id)
          throw new UserError('训练组归属不匹配。');
      } else if (input.revision !== undefined)
        throw new UserError('该组已不存在，请刷新。');
      number(input.reps, '次数', 1, 10000, true);
      if (!['weighted', 'bodyweight', 'loadless'].includes(input.mode))
        throw new UserError('负重类型无效。');
      let grams: number | null = null;
      if (input.mode === 'weighted') {
        if (input.weightKg === null)
          throw new UserError('请填写负重，或选择自重/无负重。');
        number(input.weightKg, '负重', 0, 10000);
        grams = Math.round(input.weightKg * 1000);
        if (Math.abs(input.weightKg * 1000 - grams) > 0.000001)
          throw new UserError('负重最多保留三位小数。');
      } else if (input.weightKg !== null)
        throw new UserError('自重或无负重组不填写数字负重。');
      if (input.rpe !== undefined) {
        number(input.rpe, 'RPE', 1, 10);
        if (!Number.isInteger(input.rpe * 2))
          throw new UserError('RPE 使用 0.5 步长。');
      }
      if (input.rir !== undefined) number(input.rir, 'RIR', 0, 10, true);
      if (input.rpe !== undefined && input.rir !== undefined)
        throw new UserError('RPE 与 RIR 请选择一种。');
      const notes = clean(input.notes ?? '', '组备注', 1000, true);
      const snapshot = session.exercises.find(
        (item) => item.exerciseId === input.exerciseId,
      );
      const exercise = await this.database.exercises.get(input.exerciseId);
      if (!snapshot && !exercise)
        throw new UserError('动作不存在，请重新选择。');
      const now = this.clock();
      const stamp = now.toISOString();
      const signature = JSON.stringify([
        session.id,
        input.exerciseId,
        input.reps,
        input.mode,
        grams,
        input.rpe,
        input.rir,
        notes,
      ]);
      const meta = (await this.database.trainingMeta.get('control')) ?? {
        id: 'control' as const,
      };
      if (
        !current &&
        meta.lastSetSignature === signature &&
        meta.lastSetAt !== undefined &&
        now.getTime() - meta.lastSetAt >= 0 &&
        now.getTime() - meta.lastSetAt < 1500
      )
        throw new UserError('刚刚已记录相同一组，请稍候。');
      const previous = await this.database.workoutSets
        .where('sessionId')
        .equals(session.id)
        .sortBy('order');
      const saved: WorkoutSet = {
        id: input.id,
        sessionId: session.id,
        exerciseId: input.exerciseId,
        exerciseName: snapshot?.name ?? exercise!.name,
        order: current?.order ?? (previous.at(-1)?.order ?? -1) + 1,
        mode: input.mode,
        reps: input.reps,
        weightKg: grams === null ? null : grams / 1000,
        weightGrams: grams,
        rpe: input.rpe,
        rir: input.rir,
        notes,
        completed: true,
        createdAt: current?.createdAt ?? stamp,
        updatedAt: stamp,
        revision: (current?.revision ?? -1) + 1,
      };
      await this.database.workoutSets.put(saved);
      if (!snapshot)
        session.exercises.push({
          id: crypto.randomUUID(),
          exerciseId: input.exerciseId,
          name: exercise!.name,
          sets: 0,
          repsMin: 1,
          repsMax: 1,
        });
      await this.database.workoutSessions.put({
        ...session,
        updatedAt: stamp,
        revision: session.revision + 1,
      });
      if (!current)
        await this.database.trainingMeta.put({
          ...meta,
          lastSetSignature: signature,
          lastSetAt: now.getTime(),
        });
      return saved;
    });
  }
  async deleteSet(expected: WorkoutSet) {
    return this.write(async () => {
      const session = await this.database.workoutSessions.get(
        expected.sessionId,
      );
      if (session?.status !== 'active')
        throw new UserError('请先恢复训练再编辑训练组。');
      checkRevision(
        await this.database.workoutSets.get(expected.id),
        expected.revision,
      );
      await this.database.workoutSets.delete(expected.id);
    });
  }
  async saveNotes(expected: WorkoutSession, notes: string) {
    return this.write(async () => {
      checkRevision(
        await this.database.workoutSessions.get(expected.id),
        expected.revision,
      );
      await this.database.workoutSessions.update(expected.id, {
        notes: clean(notes, '训练备注', 2000, true),
        updatedAt: this.clock().toISOString(),
        revision: expected.revision + 1,
      });
    });
  }
}
export const training = new TrainingRepository();
