import { useState } from 'react';
import type { Food } from '../../../db/models';
import { Empty } from '../../../components/Shared';
import { useAction } from '../../../lib/useAction';
import { nutrition } from '../repository';
import { filterFoods } from './catalog';
import { Provenance } from './Provenance';
import { FoodEditor } from './FoodEditor';
import { nutrients } from '../calculators/nutrition';
import { nutrientLabels, foodStates } from '../labels';
export function Library({ foods }: { foods: Food[] }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [archived, setArchived] = useState(false);
  const [editor, setEditor] = useState<{ food?: Food; key: string }>();
  const [message, setMessage] = useState('');
  const action = useAction();
  const filtered = filterFoods(foods, query, state, archived);
  return (
    <section className="card">
      <div className="section-title">
        <h2>食品库</h2>
        <button
          className="primary"
          onClick={() => setEditor({ key: crypto.randomUUID() })}
        >
          新建食品
        </button>
      </div>
      <p className="muted">
        内置数据已核验来源，不代表所有品牌或烹调方法。生重与熟重不得隐式换算。
      </p>
      {editor && (
        <div className="inset">
          <FoodEditor
            key={editor.key}
            initial={editor.food}
            onCancel={() => setEditor(undefined)}
            onSaved={() => {
              setEditor(undefined);
              setMessage('食品已保存。');
            }}
          />
        </div>
      )}
      {message && <p role="status">{message}</p>}
      <div className="form-row">
        <label>
          搜索食品
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名称、品牌或英文描述"
          />
        </label>
        <label>
          筛选生熟状态
          <select
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            <option value="">全部状态</option>
            {Object.entries(foodStates).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="nutrition-check">
        <input
          type="checkbox"
          checked={archived}
          onChange={(event) => setArchived(event.target.checked)}
        />
        显示已归档食品
      </label>
      {!filtered.length ? (
        <Empty>没有匹配食品，可修改搜索或创建自己的食品。</Empty>
      ) : (
        <ul className="record-list food-list">
          {filtered.map((food) => (
            <li className="stack" key={food.id}>
              <div className="section-title">
                <h3>
                  {food.name}
                  {food.brand && ` · ${food.brand}`}
                </h3>
                <span className="tag">
                  {foodStates[food.state]}
                  {food.archived ? ' · 已归档' : ''}
                </span>
              </div>
              <p className="muted">
                每 100g：
                {nutrients
                  .map(
                    (key) =>
                      `${nutrientLabels[key]} ${food.per100g[key] === null ? '未知' : food.per100g[key]}${key === 'kcal' ? ' kcal' : ' g'}`,
                  )
                  .join(' · ')}
              </p>
              {food.servingGrams !== undefined && (
                <p>每份 {food.servingGrams} g</p>
              )}
              <Provenance source={food.source} />
              {!food.isBuiltIn && (
                <div className="button-row">
                  <button
                    disabled={action.busy}
                    onClick={() => setEditor({ food, key: food.id })}
                  >
                    编辑食品
                  </button>
                  <button
                    disabled={action.busy}
                    onClick={() => {
                      if (
                        !food.archived &&
                        !confirm('确认归档此食品？历史饮食记录不受影响。')
                      )
                        return;
                      void action.run(
                        () => nutrition.archiveFood(food, !food.archived),
                        food.archived ? '食品已恢复。' : '食品已归档。',
                      );
                    }}
                  >
                    {food.archived ? '恢复食品' : '归档食品'}
                  </button>
                  <button
                    className="danger"
                    disabled={action.busy}
                    onClick={() => {
                      if (confirm('确认删除此自建食品？历史记录保留原始快照。'))
                        void action.run(
                          () => nutrition.deleteFood(food),
                          '食品已删除，历史仍保留。',
                        );
                    }}
                  >
                    删除食品
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {action.feedback}
    </section>
  );
}
