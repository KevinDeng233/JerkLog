import { Link } from 'react-router-dom';
import { PageHeading, Metrics } from '../../components/Shared';

export default function Dashboard() {
  const now = new Date();
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
        · Phase 0 · 应用基础架构。
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
            基础界面已就绪，记录功能待后续实现。
          </p>
          <Link className="button primary" to="/habits">
            查看习惯模块
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
            value: '—',
            unit: '次',
          },
          { label: '累计完成训练', value: '—', unit: '组' },
          {
            label: '今日摄入热量',
            value: '—',
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
          <span className="link-label">查看习惯模块</span>
        </Link>
        <Link className="card module-card" to="/training">
          <span className="module-icon">⌁</span>
          <p className="eyebrow">TRAINING</p>
          <h2>把每一组留下来</h2>
          <p className="muted">动作、次数与重量，清楚可查。</p>
          <span className="link-label">查看训练模块</span>
        </Link>
        <Link className="card module-card" to="/nutrition">
          <span className="module-icon">◒</span>
          <p className="eyebrow">NUTRITION</p>
          <h2>为今天补充能量</h2>
          <p className="muted">记录一餐，看见营养摄入。</p>
          <span className="link-label">查看饮食模块</span>
        </Link>
      </div>
      <p className="footer-note">
        当前为 Phase 0 基础界面；统计尚未接入，以 — 表示。仅在本地保存主题偏好。
      </p>
    </>
  );
}
