import { Empty, PageHeading } from './Shared';
export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  action,
  empty,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  empty: string;
}) {
  return (
    <>
      <PageHeading eyebrow={eyebrow} title={title}>
        {description}
      </PageHeading>
      <section className="card">
        <div className="section-title">
          <h2>记录空间</h2>
          <span className="tag">Phase 0 · 基础界面</span>
        </div>
        <Empty>{empty}本阶段不创建、读取或展示个人业务记录。</Empty>
        <p id="phase-scope" className="muted">
          此操作为界面占位；记录功能将在 Phase 1 实现。
        </p>
        <button className="primary" disabled aria-describedby="phase-scope">
          {action}
        </button>
      </section>
    </>
  );
}
