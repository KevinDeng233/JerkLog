import { useState } from 'react';
import type {
  NutritionGoals,
  NutritionPreferences,
  MealEntry,
  DietaryRestriction,
} from '../../../db/models';
import { aggregate } from '../calculators/nutrition';
import { mealIdeas } from './rules';
import { nutrition } from '../repository';
import { useAction } from '../../../lib/useAction';
const restrictions: Record<DietaryRestriction, string> = {
  milk: '乳制品',
  egg: '鸡蛋',
  soy: '大豆',
  gluten: '麸质',
  peanut: '花生',
  nuts: '树坚果',
  fish: '鱼',
  shellfish: '贝类 / 甲壳类',
};
export function Recommendations({
  preferences,
  goals,
  entries,
  date,
}: {
  preferences: NutritionPreferences;
  goals: NutritionGoals;
  entries: MealEntry[];
  date: string;
}) {
  const [draft, setDraft] = useState(() => structuredClone(preferences));
  const action = useAction();
  const count = entries.filter((entry) => entry.localDate === date).length;
  const ideas = mealIdeas(preferences, goals, aggregate(entries, date), count);
  async function changeDismissal(dismissedDate?: string) {
    const saved = await nutrition.savePreferences({
      ...preferences,
      dismissedDate,
    });
    setDraft((current) => ({
      ...current,
      revision: saved.revision,
      updatedAt: saved.updatedAt,
      dismissedDate: saved.dismissedDate,
    }));
  }
  return (
    <section className="card recommendation-panel">
      <h2>可选的饮食想法</h2>
      <p className="muted">
        仅依据你保存的方向、忌口与已记录饮食。不是完整饮食评估、缺乏诊断或医疗建议，不与私人习惯关联。
      </p>
      <details>
        <summary>设置饮食方向与忌口</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              const saved = await nutrition.savePreferences(draft);
              setDraft(saved);
            }, '饮食偏好已保存。');
          }}
        >
          <div className="form-row">
            <label>
              建议方向
              <select
                value={draft.goal ?? ''}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    goal:
                      event.target.value === ''
                        ? null
                        : (event.target.value as NutritionPreferences['goal']),
                  })
                }
              >
                <option value="">关闭建议 / 未选择</option>
                <option value="balanced">均衡饮食</option>
                <option value="muscle">支持增肌的饮食选择</option>
              </select>
            </label>
            <label>
              饮食选择
              <select
                value={draft.diet}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    diet: event.target.value as NutritionPreferences['diet'],
                  })
                }
              >
                <option value="omnivore">荤素均可</option>
                <option value="vegetarian">蛋奶素</option>
                <option value="vegan">纯植物</option>
              </select>
            </label>
          </div>
          <fieldset className="restriction-list">
            <legend>过敏 / 忌口（用于示例过滤）</legend>
            {Object.entries(restrictions).map(([key, label]) => (
              <label className="nutrition-check" key={key}>
                <input
                  type="checkbox"
                  checked={draft.restrictions.includes(
                    key as DietaryRestriction,
                  )}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      restrictions: event.target.checked
                        ? [...draft.restrictions, key as DietaryRestriction]
                        : draft.restrictions.filter((item) => item !== key),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label>
            其他忌口（可选）
            <input
              maxLength={300}
              value={draft.otherRestrictions}
              onChange={(event) =>
                setDraft({ ...draft, otherRestrictions: event.target.value })
              }
              placeholder="有额外忌口时暂不提供组合，避免猜测"
            />
          </label>
          <div className="button-row">
            <button disabled={action.busy}>保存饮食偏好</button>
            <button
              type="button"
              onClick={() => setDraft(structuredClone(preferences))}
            >
              载入最新偏好
            </button>
          </div>
        </form>
      </details>
      {preferences.goal === null ? (
        <p>建议当前关闭。可选择自己的方向并保存，也可完全忽略。</p>
      ) : preferences.dismissedDate === date ? (
        <div>
          <p>这一天的建议已隐藏。</p>
          <button
            disabled={action.busy}
            onClick={() =>
              void action.run(() => changeDismissal(), '建议已恢复显示。')
            }
          >
            显示这一天的建议
          </button>
        </div>
      ) : (
        <>
          {ideas.map((idea) => (
            <article className="meal-idea" key={idea.id}>
              <h3>{idea.title}</h3>
              <p>{idea.reason}</p>
              {idea.combination && <p>{idea.combination}（不限定份量）</p>}
              {idea.alternatives.length > 0 && (
                <p>蛋白质食物可替换为：{idea.alternatives.join('、')}。</p>
              )}
            </article>
          ))}
          <p className="muted">
            组合不承诺精确热量或宏量达标。请核对产品标签、调味和交叉接触；示例过滤不能保证过敏安全。可忽略或自行调整。
          </p>
          <button
            disabled={action.busy}
            onClick={() =>
              void action.run(
                () => changeDismissal(date),
                '这一天的建议已隐藏。',
              )
            }
          >
            隐藏这一天的建议
          </button>
        </>
      )}
      {action.feedback}
    </section>
  );
}
