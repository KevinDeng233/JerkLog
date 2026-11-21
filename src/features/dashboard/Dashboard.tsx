import { Link } from 'react-router-dom';
import { PageHeading } from '../../components/Shared';
import { useHabits, useNow } from '../habits/useHabits';
import { Insights } from '../habits/Insights';
import { History } from '../habits/History';
export default function Dashboard() {
  const data = useHabits();
  const now = useNow();
  return (
    <>
      <PageHeading
        eyebrow="YOUR DAILY SPACE / 记录自己的节奏"
        title="一点记录，一点进步。"
      >
        {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'full' }).format(now)} ·
        每个数字都来自本地实际记录。
      </PageHeading>
      <section className="hero compact-hero">
        <div>
          <span className="tag">Habits · 只为自己记录</span>
          <h2>了解自己的节奏。</h2>
          <p>不比较、不评分。记录与回顾，由你决定。</p>
          <Link className="button primary" to="/habits">
            记录与日历
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="orbit-center">
            J<span>LOG YOUR OWN PACE</span>
          </span>
        </div>
      </section>
      {!data ? (
        <p role="status">正在读取本地记录…</p>
      ) : data.error ? (
        <div role="alert">
          <p>{data.error}</p>
          <button onClick={() => location.reload()}>重新读取</button>
        </div>
      ) : (
        <>
          <Insights entries={data.entries} now={now} />
          <section className="card dashboard-history">
            <div className="section-title">
              <h2>历史记录</h2>
              <Link className="button" to="/habits">
                管理记录
              </Link>
            </div>
            <History entries={data.entries} />
          </section>
        </>
      )}
      <div className="pending-modules">
        <Link to="/training">Training · 尚未开放业务功能</Link>
        <Link to="/nutrition">Nutrition · 尚未开放业务功能</Link>
      </div>
    </>
  );
}
