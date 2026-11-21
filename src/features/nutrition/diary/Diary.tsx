import { useState } from 'react';
import type { MealEntry, MealType } from '../../../db/models';
import { copy } from '../../../i18n/zh-CN';
import { Empty } from '../../../components/Shared';
import { useAction } from '../../../lib/useAction';
import { nutrition } from '../repository';
import { aggregate, displayTotal, nutrients } from '../calculators/nutrition';
import { nutrientLabels } from '../labels';
import { foodStates } from '../labels';
import { Provenance } from '../foods/Provenance';
import { validDiaryDate } from '../date';
function MealRow({
  entry,
  onEdit,
  onDelete,
  busy,
}: {
  entry: MealEntry;
  onEdit: (entry: MealEntry) => void;
  onDelete: (entry: MealEntry) => void;
  busy: boolean;
}) {
  const totals = aggregate([entry], entry.localDate);
  return (
    <li className="stack meal-row">
      <div className="section-title">
        <strong>{entry.nutritionSnapshot.foodName}</strong>
        <span className="tag">{foodStates[entry.nutritionSnapshot.state]}</span>
      </div>
      <span>
        {Number(entry.grams.toFixed(6))} g · {entry.localDate}
      </span>
      <p>
        {nutrients
          .map(
            (key) =>
              `${nutrientLabels[key]} ${displayTotal(totals[key])} ${key === 'kcal' ? 'kcal' : 'g'}`,
          )
          .join(' · ')}
      </p>
      <details>
        <summary>查看记录时的来源快照</summary>
        <Provenance source={entry.nutritionSnapshot.source} />
        {entry.nutritionSnapshot.brand && (
          <p>品牌：{entry.nutritionSnapshot.brand}</p>
        )}
      </details>
      <div className="button-row">
        <button disabled={busy} onClick={() => onEdit(entry)}>
          编辑饮食记录
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={() => onDelete(entry)}
        >
          删除饮食记录
        </button>
      </div>
    </li>
  );
}
export function Diary({
  entries,
  date,
  onDate,
}: {
  entries: MealEntry[];
  date: string;
  onDate: (date: string) => void;
}) {
  const [editing, setEditing] = useState<MealEntry>();
  const action = useAction();
  const invalid = entries.filter((entry) => !validDiaryDate(entry.localDate));
  function remove(entry: MealEntry) {
    if (confirm('确认删除这条饮食记录？此操作不可撤销。'))
      void action.run(async () => {
        await nutrition.deleteMeal(entry);
        if (editing?.id === entry.id) setEditing(undefined);
      }, '饮食记录已删除。');
  }
  return (
    <>
      <h2>饮食日记 · {date}</h2>
      <p className="muted">
        选择日期查看以往记录。修改食品库不会改写这里的历史快照。
      </p>
      {editing && (
        <section className="card meal-editor">
          <h3>编辑饮食记录 · {editing.nutritionSnapshot.foodName}</h3>
          <p className="muted">
            仅修改数量、日期和餐次；继续使用记录时的营养值。
          </p>
          <form
            key={editing.id}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const localDate = String(data.get('date'));
              void action.run(async () => {
                await nutrition.editMeal(editing!, {
                  grams: Number(data.get('grams')),
                  localDate,
                  mealType: String(data.get('meal')) as MealType,
                });
                setEditing(undefined);
                onDate(localDate);
              }, '饮食记录已更新。');
            }}
          >
            <label>
              修改克数（g）
              <input
                name="grams"
                type="number"
                required
                min="0.001"
                max="20000"
                step="0.000001"
                defaultValue={editing.grams}
              />
            </label>
            <div className="form-row">
              <label>
                修改日期
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={editing.localDate}
                />
              </label>
              <label>
                修改餐次
                <select name="meal" defaultValue={editing.mealType}>
                  {Object.entries(copy.mealTypes).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="button-row">
              <button className="primary" disabled={action.busy}>
                保存饮食修改
              </button>
              <button type="button" onClick={() => setEditing(undefined)}>
                取消饮食编辑
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="meal-groups">
        {Object.entries(copy.mealTypes).map(([key, label]) => {
          const rows = entries.filter(
            (entry) => entry.localDate === date && entry.mealType === key,
          );
          const total = aggregate(entries, date, key as MealType);
          return (
            <section
              className="card meal-group"
              aria-label={`${label}记录`}
              key={key}
            >
              <div className="section-title">
                <h3>{label}</h3>
                <span>{rows.length} 条</span>
              </div>
              <p className="muted">热量 {displayTotal(total.kcal)} kcal</p>
              {!rows.length ? (
                <Empty>尚无{label}记录。</Empty>
              ) : (
                <ul className="record-list">
                  {rows.map((entry) => (
                    <MealRow
                      key={entry.id}
                      entry={entry}
                      onEdit={setEditing}
                      onDelete={remove}
                      busy={action.busy}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {invalid.length > 0 && (
        <section className="card">
          <h3>需修复日期的旧记录</h3>
          <p>以下记录仍然保留，请编辑成有效日期后纳入每日统计。</p>
          <ul className="record-list">
            {invalid.map((entry) => (
              <MealRow
                key={entry.id}
                entry={entry}
                onEdit={setEditing}
                onDelete={remove}
                busy={action.busy}
              />
            ))}
          </ul>
        </section>
      )}
      {action.feedback}
    </>
  );
}
