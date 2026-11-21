import { useState } from 'react';
import type { Exercise, PlanDay, PlannedExercise } from '../../../db/models';
import { useAction } from '../../../lib/useAction';
import { training, type PlanBundle } from '../repository';
function moved<T>(items: T[], index: number, offset: number): T[] {
  const next = [...items];
  const target = index + offset;
  if (target < 0 || target >= next.length) return items;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
export function PlanEditor({
  initial,
  isNew,
  exercises,
  onClose,
  onSaved,
}: {
  initial: PlanBundle;
  isNew: boolean;
  exercises: Exercise[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(initial));
  const action = useAction();
  function days(value: PlanDay[]) {
    setDraft({ ...draft, days: value });
  }
  function patchDay(index: number, patch: Partial<PlanDay>) {
    days(
      draft.days.map((day, i) => (i === index ? { ...day, ...patch } : day)),
    );
  }
  function patchMove(
    dayIndex: number,
    index: number,
    patch: Partial<PlannedExercise>,
  ) {
    patchDay(dayIndex, {
      exercises: draft.days[dayIndex].exercises.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }
  return (
    <section className="card plan-editor">
      <h2>{isNew ? '创建训练计划' : '编辑训练计划'}</h2>
      <p className="muted">
        日程按顺序循环，可自由命名和安排休息；不绑定固定星期。保存后对已开始的训练不追溯修改。
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(async () => {
            await training.savePlan(draft, isNew);
            onSaved();
          }, '计划已保存。');
        }}
      >
        <div className="form-row">
          <label>
            计划名称
            <input
              required
              maxLength={120}
              value={draft.plan.name}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  plan: { ...draft.plan, name: event.target.value },
                })
              }
            />
          </label>
          <label>
            计划目标（可选）
            <input
              maxLength={300}
              value={draft.plan.goal ?? ''}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  plan: { ...draft.plan, goal: event.target.value },
                })
              }
            />
          </label>
        </div>
        {draft.days.map((day, index) => (
          <fieldset key={day.id} className="day-editor">
            <legend>日程 {index + 1}</legend>
            <div className="form-row">
              <label>
                日程名称
                <input
                  required
                  maxLength={120}
                  value={day.name}
                  onChange={(event) =>
                    patchDay(index, { name: event.target.value })
                  }
                />
              </label>
              <label>
                日程类型
                <select
                  value={day.kind}
                  onChange={(event) =>
                    patchDay(index, {
                      kind: event.target.value as PlanDay['kind'],
                      exercises:
                        event.target.value === 'rest' ? [] : day.exercises,
                    })
                  }
                >
                  <option value="training">训练日</option>
                  <option value="rest">休息日</option>
                </select>
              </label>
            </div>
            <div className="button-row">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => days(moved(draft.days, index, -1))}
              >
                日程上移
              </button>
              <button
                type="button"
                disabled={index === draft.days.length - 1}
                onClick={() => days(moved(draft.days, index, 1))}
              >
                日程下移
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => days(draft.days.filter((_, i) => i !== index))}
              >
                移除此日程
              </button>
            </div>
            {day.kind === 'rest' ? (
              <p className="muted">
                休息日不安排动作。切换为休息日会移除该日草稿中的动作。
              </p>
            ) : (
              <>
                {day.exercises.map((move, moveIndex) => (
                  <div className="planned-move" key={move.id}>
                    <label>
                      训练动作
                      <select
                        required
                        value={move.exerciseId}
                        onChange={(event) =>
                          patchMove(index, moveIndex, {
                            exerciseId: event.target.value,
                          })
                        }
                      >
                        <option value="">选择动作</option>
                        {exercises.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="form-row three-fields">
                      <label>
                        计划组数
                        <input
                          type="number"
                          required
                          min="1"
                          max="100"
                          step="1"
                          value={move.sets}
                          onChange={(event) =>
                            patchMove(index, moveIndex, {
                              sets: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        次数下限
                        <input
                          type="number"
                          required
                          min="1"
                          max="10000"
                          step="1"
                          value={move.repsMin}
                          onChange={(event) =>
                            patchMove(index, moveIndex, {
                              repsMin: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        次数上限
                        <input
                          type="number"
                          required
                          min={move.repsMin}
                          max="10000"
                          step="1"
                          value={move.repsMax}
                          onChange={(event) =>
                            patchMove(index, moveIndex, {
                              repsMax: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <label>
                      计划动作备注
                      <input
                        maxLength={1000}
                        value={move.notes ?? ''}
                        onChange={(event) =>
                          patchMove(index, moveIndex, {
                            notes: event.target.value,
                          })
                        }
                      />
                    </label>
                    <div className="button-row">
                      <button
                        type="button"
                        disabled={moveIndex === 0}
                        onClick={() =>
                          patchDay(index, {
                            exercises: moved(day.exercises, moveIndex, -1),
                          })
                        }
                      >
                        动作上移
                      </button>
                      <button
                        type="button"
                        disabled={moveIndex === day.exercises.length - 1}
                        onClick={() =>
                          patchDay(index, {
                            exercises: moved(day.exercises, moveIndex, 1),
                          })
                        }
                      >
                        动作下移
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          patchDay(index, {
                            exercises: day.exercises.filter(
                              (_, i) => i !== moveIndex,
                            ),
                          })
                        }
                      >
                        移除动作
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    patchDay(index, {
                      exercises: [
                        ...day.exercises,
                        {
                          id: crypto.randomUUID(),
                          exerciseId: exercises[0]?.id ?? '',
                          sets: 3,
                          repsMin: 8,
                          repsMax: 12,
                        },
                      ],
                    })
                  }
                >
                  添加日程动作
                </button>
              </>
            )}
          </fieldset>
        ))}
        <div className="button-row">
          <button
            type="button"
            onClick={() =>
              days([
                ...draft.days,
                {
                  id: crypto.randomUUID(),
                  planId: draft.plan.id,
                  name: `日程 ${draft.days.length + 1}`,
                  kind: 'training',
                  order: draft.days.length,
                  exercises: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ])
            }
          >
            添加日程
          </button>
          <button className="primary" disabled={action.busy}>
            保存计划
          </button>
          <button type="button" onClick={onClose}>
            关闭编辑器
          </button>
        </div>
      </form>
      {action.feedback}
    </section>
  );
}
