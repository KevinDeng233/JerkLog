import { useState } from 'react';
import { Empty } from '../../../components/Shared';
import { useAction } from '../../../lib/useAction';
import { training, makePlan, type PlanBundle } from '../repository';
import { planTemplates } from '../catalog';
import type { TrainingData } from '../useTraining';
import { PlanEditor } from './PlanEditor';
export function Plans({
  data,
  onStart,
}: {
  data: TrainingData;
  onStart: (planId: string, dayId: string) => void;
}) {
  const [editing, setEditing] = useState<{
    bundle: PlanBundle;
    isNew: boolean;
  }>();
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const pending = data.sessions.some((item) => item.status !== 'completed');
  function begin(template?: string) {
    setSaved(false);
    setEditing({ bundle: makePlan(template), isNew: true });
  }
  return (
    <>
      <section className="card">
        <div className="section-title">
          <h2>我的计划</h2>
          <button className="primary" onClick={() => begin()}>
            新建计划
          </button>
        </div>
        <p className="muted">
          模板是可调整的例子，不是统一处方。训练前热身，安排休息，按能力逐步递进。
        </p>
        <div className="button-row">
          {planTemplates.map((template) => (
            <button key={template.id} onClick={() => begin(template.id)}>
              使用{template.name}模板
            </button>
          ))}
        </div>
      </section>
      {saved && <p role="status">计划已保存。</p>}
      {editing && (
        <PlanEditor
          key={editing.bundle.plan.id}
          initial={editing.bundle}
          isNew={editing.isNew}
          exercises={data.exercises}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            setSaved(true);
          }}
        />
      )}
      {!data.plans.length ? (
        <Empty>还没有计划。可从模板开始，也可创建自己的日程。</Empty>
      ) : (
        <div className="plan-list">
          {data.plans.map((plan) => (
            <section className="card" key={plan.id}>
              <div className="section-title">
                <h2>{plan.name}</h2>
                <span className="tag">
                  {plan.archived ? '已归档' : '可训练'}
                </span>
              </div>
              {plan.goal && <p>{plan.goal}</p>}
              <ol className="schedule-list">
                {data.days
                  .filter((day) => day.planId === plan.id)
                  .sort((a, b) => a.order - b.order)
                  .map((day) => (
                    <li key={day.id}>
                      <div className="section-title">
                        <strong>
                          {day.name} ·{' '}
                          {day.kind === 'rest' ? '休息日' : '训练日'}
                        </strong>
                        {day.kind === 'training' && (
                          <button
                            disabled={plan.archived || pending}
                            onClick={() => onStart(plan.id, day.id)}
                          >
                            开始此训练日
                          </button>
                        )}
                      </div>
                      {day.kind === 'training' && (
                        <ul>
                          {day.exercises.map((move) => (
                            <li key={move.id}>
                              {data.exercises.find(
                                (item) => item.id === move.exerciseId,
                              )?.name ?? '动作已移除'}{' '}
                              · {move.sets} 组 × {move.repsMin}–{move.repsMax}{' '}
                              次{move.notes && ` · ${move.notes}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
              </ol>
              <div className="button-row">
                <button
                  onClick={() => {
                    setSaved(false);
                    setEditing({
                      bundle: {
                        plan,
                        days: data.days
                          .filter((day) => day.planId === plan.id)
                          .sort((a, b) => a.order - b.order),
                      },
                      isNew: false,
                    });
                  }}
                >
                  编辑计划
                </button>
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () => training.duplicatePlan(plan),
                      '计划已独立复制。',
                    )
                  }
                >
                  复制计划
                </button>
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () => training.archivePlan(plan, !plan.archived),
                      plan.archived ? '已恢复计划。' : '计划已归档。',
                    )
                  }
                >
                  {plan.archived ? '恢复计划' : '归档计划'}
                </button>
                <button
                  className="danger"
                  disabled={action.busy}
                  onClick={() => {
                    if (confirm('确认删除此计划及日程？历史训练的快照会保留。'))
                      void action.run(async () => {
                        await training.deletePlan(plan);
                        if (editing?.bundle.plan.id === plan.id)
                          setEditing(undefined);
                      }, '计划已删除，历史保留。');
                  }}
                >
                  删除计划
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
      {action.feedback}
    </>
  );
}
