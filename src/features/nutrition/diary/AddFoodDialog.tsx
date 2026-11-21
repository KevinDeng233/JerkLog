import { useEffect, useRef, useState } from 'react';
import type { Food, MealType } from '../../../db/models';
import { nutrition } from '../repository';
import { useAction } from '../../../lib/useAction';
import { filterFoods } from '../foods/catalog';
import { foodStates } from '../labels';
import { FoodEditor } from '../foods/FoodEditor';
import { Provenance } from '../foods/Provenance';
import { copy } from '../../../i18n/zh-CN';
import { consumed, servingToGrams } from '../calculators/nutrition';
export function AddFoodDialog({
  foods,
  date,
  onClose,
  onSaved,
}: {
  foods: Food[];
  date: string;
  onClose: () => void;
  onSaved: (date: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [id] = useState(() => crypto.randomUUID());
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [foodId, setFoodId] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<'grams' | 'servings'>('grams');
  const action = useAction();
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement;
    element.showModal();
    element
      .querySelector<HTMLInputElement>('input:not([type="hidden"])')
      ?.focus();
    return () => {
      element.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const selected = foods.find((food) => food.id === foodId && !food.archived);
  const choices = filterFoods(foods, query);
  const shown =
    selected && !choices.some((food) => food.id === selected.id)
      ? [selected, ...choices]
      : choices;
  let preview: string = '';
  if (selected && amount.trim()) {
    try {
      const grams =
        unit === 'grams'
          ? Number(amount)
          : servingToGrams(Number(amount), selected.servingGrams);
      const kcal = consumed(selected.per100g, grams).kcal;
      preview = `${Number(grams.toFixed(6))} g · ${kcal === null ? '热量未知' : `${kcal.toFixed(1)} kcal`}`;
    } catch {
      preview = '请填写有效数量。';
    }
  }
  return (
    <dialog
      ref={dialog}
      className="nutrition-dialog"
      aria-labelledby="add-food-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!action.busy) onClose();
      }}
    >
      <div className="section-title">
        <h2 id="add-food-title">添加食物</h2>
        <button
          type="button"
          aria-label="关闭添加食物"
          disabled={action.busy}
          onClick={onClose}
        >
          关闭
        </button>
      </div>
      {creating ? (
        <FoodEditor
          onCancel={() => setCreating(false)}
          onSaved={(food) => {
            setCreating(false);
            setFoodId(food.id);
            setQuery('');
            setAmount('');
            setUnit('grams');
          }}
        />
      ) : (
        <>
          <label>
            查找食品
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入名称或品牌"
            />
          </label>
          <button onClick={() => setCreating(true)}>在这里新建食品</button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              const localDate = String(values.get('date'));
              void action.run(async () => {
                await nutrition.addMeal({
                  id,
                  foodId,
                  amount: Number(amount),
                  unit,
                  localDate,
                  mealType: String(values.get('meal')) as MealType,
                });
                onSaved(localDate);
              }, '饮食记录已保存。');
            }}
          >
            <label>
              选择食品
              <select
                required
                value={foodId}
                onChange={(event) => {
                  setFoodId(event.target.value);
                  setAmount('');
                  setUnit('grams');
                }}
              >
                <option value="">请选择食品</option>
                {shown.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name} · {foodStates[food.state]}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <>
                <p className="muted">
                  {foodStates[selected.state]}
                  {selected.brand && ` · ${selected.brand}`}
                  ；不进行生熟重量转换。
                </p>
                <Provenance source={selected.source} />
              </>
            )}
            <div className="form-row">
              <label>
                食用数量
                <input
                  required
                  type="number"
                  min="0.001"
                  max={unit === 'grams' ? 20000 : 1000}
                  step="0.001"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              <label>
                数量单位
                <select
                  value={unit}
                  onChange={(event) =>
                    setUnit(event.target.value as 'grams' | 'servings')
                  }
                >
                  <option value="grams">克（g）</option>
                  {selected?.servingGrams !== undefined && (
                    <option value="servings">
                      份（每份 {selected.servingGrams} g）
                    </option>
                  )}
                </select>
              </label>
            </div>
            <p role="status">{preview}</p>
            <div className="form-row">
              <label>
                饮食日期
                <input name="date" type="date" required defaultValue={date} />
              </label>
              <label>
                餐次
                <select name="meal" defaultValue="lunch">
                  {Object.entries(copy.mealTypes).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="primary" disabled={action.busy || !selected}>
              保存饮食记录
            </button>
          </form>
        </>
      )}
      {action.feedback}
    </dialog>
  );
}
