import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { habitStats, localDate } from '../../lib/date';
import { sumNutrition } from '../../lib/nutrition';
import { useLocalNow } from '../../lib/useLocalNow';
import { PageHeading, Metrics } from '../../components/Shared';

export default function Dashboard() {
  const now = useLocalNow();
  const date = localDate(now);
  const habits = useLiveQuery(() => db.habitEntries.toArray()) ?? [];
  const sets = useLiveQuery(() => db.workoutSets.toArray()) ?? [];
  const meals =
    useLiveQuery(
      () => db.mealEntries.where('date').equals(date).toArray(),
      [date],
    ) ?? [];
  const totals = sumNutrition(meals.map((meal) => meal.nutritionSnapshot));
  return (
    <>
      <PageHeading
        eyebrow="YOUR DAILY SPACE / 记录自己的节奏"
        title="一点记录，一点进步。"
      >
        {new Intl.DateTimeFormat('zh-CN', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }).format(now)}{' '}
        · 从今天的一件小事开始。
      </PageHeading>
      <section className="hero">
        <div>
          <span className="tag">本地优先 · 为自己记录</span>
          <h2>
            习惯有节奏。
            <br />
            训练有记录。
            <br />
            <span>身体有能量。</span>
          </h2>
          <p>
            三个独立模块，一处私人空间。
            <br />
            不必比较，照顾好自己的每一天。
          </p>
          <Link className="button primary" to="/habits">
            开始记录
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <span className="orbit-center">
            J<span>LOG YOUR OWN PACE</span>
          </span>
        </div>
      </section>
      <Metrics
        items={[
          {
            label: '今日习惯记录',
            value: habitStats(habits, now).today,
            unit: '次',
          },
          { label: '累计完成训练', value: sets.length, unit: '组' },
          {
            label: '今日摄入热量',
            value: totals.kcal.toFixed(1),
            unit: 'kcal',
          },
        ]}
      />
      <div className="module-grid">
        <Link className="card module-card" to="/habits">
          <span className="module-icon">◷</span>
          <p className="eyebrow">HABITS</p>
          <h2>了解自己的节奏</h2>
          <p className="muted">自主记录与回顾，不贴标签。</p>
          <span className="link-label">记录一次</span>
        </Link>
        <Link className="card module-card" to="/training">
          <span className="module-icon">⌁</span>
          <p className="eyebrow">TRAINING</p>
          <h2>把每一组留下来</h2>
          <p className="muted">动作、次数与重量，清楚可查。</p>
          <span className="link-label">开始训练</span>
        </Link>
        <Link className="card module-card" to="/nutrition">
          <span className="module-icon">◒</span>
          <p className="eyebrow">NUTRITION</p>
          <h2>为今天补充能量</h2>
          <p className="muted">记录一餐，看见营养摄入。</p>
          <span className="link-label">添加食物</span>
        </Link>
      </div>
      <p className="footer-note">
        你的数据只属于你，记录仅保存在当前浏览器。三个模块之间不作健康因果推断。
      </p>
    </>
  );
}
