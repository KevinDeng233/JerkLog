import { useState } from 'react';
import { useAction } from '../../../lib/useAction';
import {
  estimateEnergy,
  activityOptions,
  type EstimateInput,
} from '../calculators/estimator';
export function Estimator({ onUse }: { onUse: (value: number) => void }) {
  const [age, setAge] = useState('');
  const [consent, setConsent] = useState(false);
  const [pregnant, setPregnant] = useState(false);
  const [unsuitable, setUnsuitable] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof estimateEnergy>>();
  const action = useAction();
  return (
    <details className="card estimator">
      <summary>可选：成年人的能量需求估算</summary>
      <p>
        不提供参数也可正常记录和手动设目标。Mifflin–St Jeor
        简化式使用男女不同系数，不能代表所有人的实际情况；可完全不使用。
      </p>
      <p className="muted">
        原研究样本为 19–78
        岁健康成人；超出该年龄样本或个人情况不同会增加不确定性。下列范围只作输入校验，不代表健康标准。仅估算维持需要，不生成减重处方。
      </p>
      <form
        onChange={() => setResult(undefined)}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void action.run(async () => {
            setResult(
              estimateEnergy({
                ageYears: Number(data.get('age')),
                weightKg: Number(data.get('weight')),
                heightCm: Number(data.get('height')),
                equation: String(
                  data.get('equation'),
                ) as EstimateInput['equation'],
                multiplier: Number(data.get('activity')),
                consent,
                pregnantOrBreastfeeding: pregnant,
                unsuitable,
              }),
            );
          }, '估算已完成；没有修改已保存目标。');
        }}
      >
        <label className="nutrition-check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          我已成年，并自愿使用该估算公式
        </label>
        <label className="nutrition-check">
          <input
            type="checkbox"
            checked={pregnant}
            onChange={(event) => setPregnant(event.target.checked)}
          />
          处于孕期或哺乳期（本估算器不适用）
        </label>
        <label className="nutrition-check">
          <input
            type="checkbox"
            checked={unsuitable}
            onChange={(event) => setUnsuitable(event.target.checked)}
          />
          我的健康情况不适用此公式 / 不确定是否适用
        </label>
        {(!consent ||
          pregnant ||
          unsuitable ||
          (age !== '' && Number(age) < 18)) && (
          <p role="status">
            此估算器当前不可用。你仍可记录食物、手动设置目标或不设目标。
          </p>
        )}
        <div className="form-row">
          <label>
            年龄（岁）
            <input
              value={age}
              onChange={(event) => setAge(event.target.value)}
              name="age"
              type="number"
              required
              min="18"
              max="100"
              step="1"
            />
          </label>
          <label>
            体重（kg）
            <input
              name="weight"
              type="number"
              required
              min="30"
              max="300"
              step="0.1"
            />
          </label>
          <label>
            身高（cm）
            <input
              name="height"
              type="number"
              required
              min="120"
              max="230"
              step="0.1"
            />
          </label>
          <label>
            公式系数
            <select name="equation" required defaultValue="">
              <option value="">自行选择，不猜测</option>
              <option value="male">男性系数（+5）</option>
              <option value="female">女性系数（−161）</option>
            </select>
          </label>
        </div>
        <label>
          活动倍数（粗略假设）
          <select name="activity" required defaultValue="">
            <option value="">请选择假设</option>
            {activityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          REE = 10×kg + 6.25×cm − 5×岁 + 所选系数；维持估算 = REE ×
          明示活动倍数。倍数不是测量值，无法据此精确测量
          TDEE。参数只留在当前表单，不保存到数据库。
        </p>
        <button
          disabled={
            action.busy ||
            !consent ||
            pregnant ||
            unsuitable ||
            (age !== '' && Number(age) < 18)
          }
        >
          计算估算值
        </button>
      </form>
      {result && (
        <div className="notice" role="status">
          <strong>
            估算值：静息能量约 {result.displayRee} kcal/日；维持能量约{' '}
            {result.displayMaintenance} kcal/日
          </strong>
          <p>显示到约 50 kcal，仅供自主管理参考，不构成医疗建议。</p>
          <button onClick={() => onUse(result.displayMaintenance)}>
            填入热量目标草稿
          </button>
          <p>填入后仍需点击“保存营养目标”才会持久保存。</p>
        </div>
      )}
      {action.feedback}
      <a
        href="https://pubmed.ncbi.nlm.nih.gov/2305711/"
        target="_blank"
        rel="noreferrer"
      >
        Mifflin–St Jeor 原始研究（1990）
      </a>
    </details>
  );
}
