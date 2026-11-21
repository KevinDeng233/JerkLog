import { useState } from 'react';
import type { Exercise, WorkoutSession, WorkoutSet } from '../../../db/models';
import { useAction } from '../../../lib/useAction';
import { training } from '../repository';
export function SetEditor({
  session,
  exercises,
  initial,
  onDone,
}: {
  session: WorkoutSession;
  exercises: Exercise[];
  initial?: WorkoutSet;
  onDone: (saved: boolean) => void;
}) {
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const choices = Array.from(
    new Map(
      [
        ...session.exercises.map((item) => ({
          id: item.exerciseId,
          name: item.name,
        })),
        ...exercises,
      ].map((item) => [item.id, item]),
    ).values(),
  );
  const [exerciseId, setExercise] = useState(
    initial?.exerciseId ??
      session.exercises[0]?.exerciseId ??
      exercises[0]?.id ??
      '',
  );
  const [mode, setMode] = useState<WorkoutSet['mode']>(
    initial?.mode ?? 'weighted',
  );
  const action = useAction();
  return (
    <section className="inset">
      <h3>{initial ? '编辑训练组' : '记录一组'}</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const effort = String(data.get('effort'));
          const value = String(data.get('value') ?? '');
          void action.run(async () => {
            await training.saveSet({
              id,
              sessionId: session.id,
              exerciseId,
              revision: initial?.revision,
              mode,
              reps: Number(data.get('reps')),
              weightKg: mode === 'weighted' ? Number(data.get('weight')) : null,
              rpe: effort === 'rpe' && value !== '' ? Number(value) : undefined,
              rir: effort === 'rir' && value !== '' ? Number(value) : undefined,
              notes: String(data.get('notes')),
            });
            onDone(true);
          }, '训练组已保存。');
        }}
      >
        <label>
          本组动作
          <select
            required
            value={exerciseId}
            onChange={(event) => setExercise(event.target.value)}
            disabled={!!initial}
          >
            {choices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          负重类型
          <select
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as WorkoutSet['mode'])
            }
          >
            <option value="weighted">负重（填写 kg）</option>
            <option value="bodyweight">自重（不估算体重）</option>
            <option value="loadless">无负重（不填写重量）</option>
          </select>
        </label>
        <div className="form-row">
          <label>
            本组次数
            <input
              name="reps"
              type="number"
              required
              min="1"
              max="10000"
              step="1"
              defaultValue={initial?.reps ?? 10}
            />
          </label>
          <label>
            本组重量（kg）
            <input
              name="weight"
              type="number"
              required={mode === 'weighted'}
              disabled={mode !== 'weighted'}
              min="0"
              max="10000"
              step="0.001"
              defaultValue={initial?.weightKg ?? ''}
              placeholder={mode === 'weighted' ? '例如 40' : '不填数字负重'}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            强度记录
            <select
              name="effort"
              defaultValue={
                initial?.rpe !== undefined
                  ? 'rpe'
                  : initial?.rir !== undefined
                    ? 'rir'
                    : 'none'
              }
            >
              <option value="none">不记录</option>
              <option value="rpe">RPE · 主观用力程度</option>
              <option value="rir">RIR · 估计剩余次数</option>
            </select>
          </label>
          <label>
            强度数值（可选）
            <input
              name="value"
              type="number"
              min="0"
              max="10"
              step="0.5"
              defaultValue={initial?.rpe ?? initial?.rir ?? ''}
            />
          </label>
        </div>
        <p className="muted">
          RPE 为 1–10（步长 0.5）；RIR 为 0–10
          整数，二者可不填。它们是自主记录，不是自动训练处方。
        </p>
        <label>
          本组备注
          <textarea
            name="notes"
            maxLength={1000}
            defaultValue={initial?.notes}
          />
        </label>
        <div className="button-row">
          <button
            className="primary"
            disabled={action.busy || session.status !== 'active'}
          >
            {initial ? '保存组修改' : '保存训练组'}
          </button>
          {initial && (
            <button
              type="button"
              disabled={action.busy}
              onClick={() => onDone(false)}
            >
              取消组编辑
            </button>
          )}
        </div>
      </form>
      {action.feedback}
    </section>
  );
}
