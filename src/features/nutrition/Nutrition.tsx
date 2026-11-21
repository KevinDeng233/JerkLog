import { useAction } from '../../lib/useAction';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { Food, MealType } from '../../db/models';
import { addMeal, createFood } from '../../db/actions';
import { localDate } from '../../lib/date';
import { sumNutrition } from '../../lib/nutrition';
import { useLocalNow } from '../../lib/useLocalNow';
import { copy } from '../../i18n/zh-CN';
import { PageHeading, Empty, Metrics } from '../../components/Shared';

export default function NutritionPage() {
  const now = useLocalNow();
  const today = localDate(now);
  const [chosenDate, setChosenDate] = useState('');
  const date = chosenDate || today;
  const [showFood, setShowFood] = useState(false);
  const foods = useLiveQuery(() => db.foods.toArray()) ?? [];
  const meals = useLiveQuery(
    () => db.mealEntries.where('date').equals(date).toArray(),
    [date],
  );
  const totals = sumNutrition(
    (meals ?? []).map((meal) => meal.nutritionSnapshot),
  );
  const action = useAction();
  return (
    <>
      <PageHeading
        eyebrow="NUTRITION / 给身体补充能量"
        title="吃得明白，记录简单。"
      >
        按食品标签与食用克数计算，保留每次录入时的营养快照。
      </PageHeading>
      <label className="date-picker">
        查看日期
        <input
          aria-label="查看日期"
          type="date"
          value={date}
          max={today}
          required
          onChange={(event) => setChosenDate(event.target.value)}
        />
      </label>
      <Metrics
        items={[
          { label: '热量', value: totals.kcal.toFixed(1), unit: 'kcal' },
          { label: '蛋白质', value: totals.proteinG.toFixed(1), unit: 'g' },
          { label: '碳水', value: totals.carbsG.toFixed(1), unit: 'g' },
          { label: '脂肪', value: totals.fatG.toFixed(1), unit: 'g' },
        ]}
      />
      <div className="two-columns">
        <section className="card">
          <div className="section-title">
            <h2>添加食物</h2>
            <button onClick={() => setShowFood(!showFood)}>
              {showFood ? '收起' : '新建食品'}
            </button>
          </div>
          {foods.length === 0 && !showFood && (
            <Empty>先点击「新建食品」，填写包装上的营养信息。</Empty>
          )}
          {showFood && (
            <form
              className="inset"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void action.run(async () => {
                  await createFood({
                    name: String(data.get('name')),
                    source: String(data.get('source')),
                    state: String(data.get('state')) as Food['state'],
                    kcalPer100g: Number(data.get('kcal')),
                    proteinPer100g: Number(data.get('protein')),
                    carbsPer100g: Number(data.get('carbs')),
                    fatPer100g: Number(data.get('fat')),
                  });
                  form.reset();
                  setShowFood(false);
                }, '食品已保存，可以录入食用克数。');
              }}
            >
              <h3>创建食品 · 每 100g</h3>
              <label>
                食品名称
                <input
                  name="name"
                  required
                  maxLength={120}
                  placeholder="例如：原味酸奶"
                />
              </label>
              <div className="form-row">
                <label>
                  热量（kcal）
                  <input
                    name="kcal"
                    type="number"
                    min="0"
                    max="10000"
                    step="any"
                    required
                  />
                </label>
                <label>
                  蛋白质（g）
                  <input
                    name="protein"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    required
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  碳水（g）
                  <input
                    name="carbs"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    required
                  />
                </label>
                <label>
                  脂肪（g）
                  <input
                    name="fat"
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    required
                  />
                </label>
              </div>
              <label>
                数据来源
                <input
                  name="source"
                  placeholder="例如：产品包装标签"
                  required
                  maxLength={300}
                />
              </label>
              <label>
                生熟状态
                <select name="state">
                  <option value="unspecified">未注明</option>
                  <option value="raw">生</option>
                  <option value="cooked">熟</option>
                </select>
              </label>
              <button disabled={action.busy}>保存食品</button>
            </form>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void action.run(
                () =>
                  addMeal({
                    foodId: String(data.get('food')),
                    grams: Number(data.get('grams')),
                    date,
                    mealType: String(data.get('mealType')) as MealType,
                  }),
                '饮食记录已保存。',
              );
            }}
          >
            <label>
              选择食品
              <select name="food" required disabled={foods.length === 0}>
                <option value="">请选择</option>
                {foods.map((food) => (
                  <option key={food.id} value={food.id}>
                    {food.name} · {copy.foodStates[food.state]} · {food.source}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                食用克数（g）
                <input
                  name="grams"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  defaultValue="100"
                  required
                />
              </label>
              <label>
                餐次
                <select name="mealType">
                  {Object.entries(copy.mealTypes).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="primary wide"
              disabled={action.busy || foods.length === 0}
            >
              添加食物
            </button>
          </form>
          {action.feedback}
        </section>
        <section className="card">
          <h2>{date === today ? '今日饮食' : `${date} 饮食`}</h2>
          {meals === undefined ? (
            <p role="status">正在读取本地记录…</p>
          ) : meals.length === 0 ? (
            <Empty>这一天还没有饮食记录。无需追求完美，从一餐开始。</Empty>
          ) : (
            <ul className="record-list">
              {meals.map((meal) => (
                <li className="stack" key={meal.id}>
                  <div className="section-title">
                    <strong>{meal.foodName}</strong>
                    <span className="tag">{copy.mealTypes[meal.mealType]}</span>
                  </div>
                  <span className="muted">
                    {meal.grams} g · {meal.nutritionSnapshot.kcal.toFixed(1)}{' '}
                    kcal
                  </span>
                  <span className="muted">
                    蛋白质 {meal.nutritionSnapshot.proteinG.toFixed(1)} g / 碳水{' '}
                    {meal.nutritionSnapshot.carbsG.toFixed(1)} g / 脂肪{' '}
                    {meal.nutritionSnapshot.fatG.toFixed(1)} g
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
