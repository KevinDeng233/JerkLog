import { useState } from 'react';
import type { Food } from '../../../db/models';
import { useAction } from '../../../lib/useAction';
import { nutrition, emptyNutrition } from '../repository';
import { nutrients } from '../calculators/nutrition';
import { nutrientLabels } from '../labels';
export function FoodEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Food;
  onSaved: (food: Food) => void;
  onCancel: () => void;
}) {
  const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const action = useAction();
  return (
    <section className="food-editor">
      <h3>{initial ? '编辑自建食品' : '新建食品'}</h3>
      <p className="muted">
        每 100g 含量；留空表示未知，不等于
        0。标签热量独立保留，不用宏量营养素反推覆盖。
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const value = (name: string) => String(data.get(name) ?? '').trim();
          void action.run(async () => {
            const per100g = { ...emptyNutrition };
            for (const key of nutrients)
              per100g[key] = value(key) === '' ? null : Number(value(key));
            const saved = await nutrition.saveFood({
              id,
              revision: initial?.revision,
              name: value('name'),
              brand: value('brand'),
              state: value('state') as Food['state'],
              per100g,
              source: {
                kind: value('sourceKind') as 'user' | 'label',
                reference: value('source'),
                revision: value('sourceRevision'),
              },
              servingGrams:
                value('serving') === '' ? undefined : Number(value('serving')),
            });
            onSaved(saved);
          }, '食品已保存。');
        }}
      >
        <label>
          食品名称
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={initial?.name}
          />
        </label>
        <label>
          品牌（可选）
          <input name="brand" maxLength={120} defaultValue={initial?.brand} />
        </label>
        <div className="form-row">
          <label>
            生熟状态
            <select name="state" defaultValue={initial?.state ?? 'unspecified'}>
              <option value="raw">生 / 未烹调</option>
              <option value="cooked">熟</option>
              <option value="unspecified">未注明</option>
            </select>
          </label>
          <label>
            每份克数（可选）
            <input
              name="serving"
              type="number"
              min="0.001"
              max="20000"
              step="0.001"
              defaultValue={initial?.servingGrams}
            />
          </label>
        </div>
        <div className="form-row">
          {nutrients.map((key) => (
            <label key={key}>
              {nutrientLabels[key]} / 100g（{key === 'kcal' ? 'kcal' : 'g'}）
              <input
                name={key}
                type="number"
                min="0"
                max={key === 'kcal' ? 1000 : 100}
                step="0.001"
                defaultValue={initial?.per100g[key] ?? ''}
              />
            </label>
          ))}
        </div>
        <label>
          数据类型
          <select
            name="sourceKind"
            defaultValue={initial?.source.kind === 'label' ? 'label' : 'user'}
          >
            <option value="label">食品标签（用户转录）</option>
            <option value="user">用户输入（未独立核验）</option>
          </select>
        </label>
        <label>
          来源说明
          <input
            name="source"
            required
            maxLength={500}
            defaultValue={initial?.source.reference}
            placeholder="例如：某品牌包装，每100g营养标签"
          />
        </label>
        <label>
          来源版本 / 日期（可选）
          <input
            name="sourceRevision"
            maxLength={80}
            defaultValue={initial?.source.revision}
          />
        </label>
        <div className="button-row">
          <button className="primary" disabled={action.busy}>
            保存食品
          </button>
          <button type="button" disabled={action.busy} onClick={onCancel}>
            取消食品编辑
          </button>
        </div>
      </form>
      {action.feedback}
    </section>
  );
}
