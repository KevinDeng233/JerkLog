import { useState } from 'react';
import type { NutritionGoals, Nutrition } from '../../../db/models';
import { useAction } from '../../../lib/useAction';
import { nutrition, emptyNutrition } from '../repository';
import { nutrients } from '../calculators/nutrition';
import { nutrientLabels } from '../labels';
import { Estimator } from './Estimator';
const strings = (goals: Nutrition) =>
  Object.fromEntries(
    nutrients.map((key) => [
      key,
      goals[key] === null ? '' : String(goals[key]),
    ]),
  ) as Record<keyof Nutrition, string>;
export function Goals({ goals }: { goals: NutritionGoals }) {
  const [draft, setDraft] = useState(goals);
  const [values, setValues] = useState(() => strings(goals));
  const [message, setMessage] = useState('');
  const action = useAction();
  return (
    <>
      <section className="card">
        <h2>手动营养目标</h2>
        <p className="muted">
          每项均可留空，未设目标不等于
          0，也不会产生缺口警告。这里只保存你主动选择的数字。
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              const parsed = Object.fromEntries(
                nutrients.map((key) => [
                  key,
                  values[key].trim() === '' ? null : Number(values[key]),
                ]),
              ) as unknown as Nutrition;
              const saved = await nutrition.saveGoals(parsed, draft.revision);
              setDraft(saved);
              setValues(strings(saved));
            }, '营养目标已保存。');
          }}
        >
          <div className="form-row">
            {nutrients.map((key) => (
              <label key={key}>
                每日{nutrientLabels[key]}目标（{key === 'kcal' ? 'kcal' : 'g'}）
                <input
                  type="number"
                  min="0.001"
                  max={key === 'kcal' ? 15000 : 2000}
                  step="0.001"
                  value={values[key]}
                  onChange={(event) =>
                    setValues({ ...values, [key]: event.target.value })
                  }
                  placeholder="留空表示不设置"
                />
              </label>
            ))}
          </div>
          <div className="button-row">
            <button className="primary" disabled={action.busy}>
              保存营养目标
            </button>
            <button
              type="button"
              disabled={action.busy}
              onClick={() => {
                if (confirm('确认清空全部营养目标？食品和饮食记录不会改变。'))
                  void action.run(async () => {
                    const saved = await nutrition.saveGoals(
                      emptyNutrition,
                      draft.revision,
                    );
                    setDraft(saved);
                    setValues(strings(saved));
                  }, '营养目标已清空。');
              }}
            >
              清空营养目标
            </button>
            <button
              type="button"
              disabled={action.busy}
              onClick={() => {
                setDraft(goals);
                setValues(strings(goals));
                setMessage('已载入最新保存的目标。');
              }}
            >
              载入最新目标
            </button>
          </div>
        </form>
        {message && <p role="status">{message}</p>}
        {action.feedback}
      </section>
      <Estimator
        onUse={(value) => {
          setValues({ ...values, kcal: String(value) });
          setMessage('估算已填入草稿，尚未保存。');
        }}
      />
    </>
  );
}
