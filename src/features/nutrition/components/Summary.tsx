import { nutrientLabels } from '../labels';
import type { MealEntry, NutritionGoals } from '../../../db/models';
import {
  aggregate,
  displayTotal,
  nutrients,
  progress,
} from '../calculators/nutrition';
export function NutritionSummary({
  entries,
  date,
  goals,
}: {
  entries: MealEntry[];
  date: string;
  goals: NutritionGoals;
}) {
  const totals = aggregate(entries, date);
  return (
    <div className="nutrition-summary" aria-label="所选日期营养总计">
      {nutrients.map((key) => {
        const item = totals[key];
        const target = goals[key];
        const amount = progress(item, target);
        const unit = key === 'kcal' ? 'kcal' : 'g';
        return (
          <section
            className="card nutrition-metric"
            key={key}
            aria-label={`${nutrientLabels[key]}总计`}
          >
            <span className="muted">{nutrientLabels[key]}</span>
            <strong>
              {displayTotal(item)} <small>{unit}</small>
            </strong>
            {target === null ? (
              <p className="muted">未设置目标</p>
            ) : (
              <>
                <p>
                  手动目标 {target} {unit}
                </p>
                {amount ? (
                  <>
                    <progress
                      max={100}
                      value={Math.min(amount.percent, 100)}
                      aria-label={`${nutrientLabels[key]}${amount.partial ? '已知小计' : '摄入'}目标进度`}
                    />
                    <p className="muted">
                      {amount.partial ? '仅已知部分 ' : ''}
                      {amount.percent.toFixed(1)}%
                      {amount.partial ? ' · 仍有未知项' : ''}
                    </p>
                  </>
                ) : (
                  <p className="muted">当前未知或目标无效，暂不计算进度</p>
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
