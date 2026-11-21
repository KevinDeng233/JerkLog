import { useAction } from '../../lib/useAction';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { createPlan, saveWorkout } from '../../db/actions';
import { displayTime } from '../../lib/date';
import { PageHeading, Empty } from '../../components/Shared';

export default function Training() {
  const [started, setStarted] = useState(false);
  const [planName, setPlanName] = useState('');
  const plans = useLiveQuery(() => db.workoutPlans.toArray()) ?? [];
  const history = useLiveQuery(async () => {
    const [sets, exercises, sessions] = await Promise.all([
      db.workoutSets.toArray(),
      db.exercises.toArray(),
      db.workoutSessions.orderBy('startedAt').reverse().toArray(),
    ]);
    return sessions.map((session) => ({
      ...session,
      sets: sets
        .filter((set) => set.sessionId === session.id)
        .map((set) => ({
          ...set,
          name:
            exercises.find((exercise) => exercise.id === set.exerciseId)
              ?.name ?? '未命名动作',
        })),
    }));
  });
  const action = useAction();
  return (
    <>
      <PageHeading eyebrow="TRAINING / 每一组，都算数" title="专注下一组。">
        记录实际完成的训练。热身、休息，按自己的能力逐步调整。
      </PageHeading>
      <div className="two-columns">
        <section className="card">
          <h2>今天的训练</h2>
          <p className="muted">保存一组，即完成一次基础训练记录。</p>
          {!started ? (
            <button className="primary wide" onClick={() => setStarted(true)}>
              开始训练
            </button>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void action.run(async () => {
                  await saveWorkout({
                    name: String(data.get('exercise')),
                    reps: Number(data.get('reps')),
                    weightKg: Number(data.get('weight')),
                    planId: String(data.get('plan')) || undefined,
                  });
                  form.reset();
                }, '这一组已保存。');
              }}
            >
              <label>
                关联计划
                <select name="plan">
                  <option value="">自由训练</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                动作名称
                <input
                  name="exercise"
                  placeholder="例如：哑铃深蹲"
                  required
                  maxLength={120}
                />
              </label>
              <div className="form-row">
                <label>
                  次数
                  <input
                    name="reps"
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    defaultValue="10"
                    required
                  />
                </label>
                <label>
                  重量（kg）
                  <input
                    name="weight"
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    defaultValue="0"
                    required
                  />
                </label>
              </div>
              <p className="muted">自重动作可填写 0 kg。</p>
              <button className="primary" disabled={action.busy}>
                保存一组
              </button>
            </form>
          )}
          {action.feedback}
          <hr />
          <h3>我的计划</h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void action.run(async () => {
                await createPlan(planName);
                setPlanName('');
              }, '已创建基础计划。');
            }}
          >
            <label>
              计划名称
              <input
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                placeholder="例如：周末训练"
                required
                maxLength={120}
              />
            </label>
            <button disabled={action.busy}>创建计划</button>
          </form>
          {plans.length > 0 && (
            <ul className="tag-list">
              {plans.map((plan) => (
                <li key={plan.id}>{plan.name}</li>
              ))}
            </ul>
          )}
          <p className="muted">
            当前支持计划命名与关联；日程与计划模板将在后续阶段实现。
          </p>
        </section>
        <section className="card">
          <h2>训练记录</h2>
          {history === undefined ? (
            <p role="status">正在读取本地记录…</p>
          ) : history.length === 0 ? (
            <Empty>还没有训练。完成第一组后，会在这里留下记录。</Empty>
          ) : (
            <ul className="record-list">
              {history.map((session) => (
                <li className="stack" key={session.id}>
                  <time dateTime={session.startedAt} className="muted">
                    {displayTime(session.startedAt)}
                  </time>
                  {session.sets.map((set) => (
                    <div key={set.id} className="section-title">
                      <strong>{set.name}</strong>
                      <span>
                        {set.reps} 次 × {set.weightKg} kg
                      </span>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
