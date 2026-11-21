import { useState } from 'react';
import { Empty } from '../../../components/Shared';
import { displayTime } from '../../../lib/calendar';
import { activeSeconds, loggedVolume } from '../metrics';
import type { TrainingData } from '../useTraining';
export function TrainingHistory({ data }: { data: TrainingData }) {
  const [page, setPage] = useState(0);
  const completed = data.sessions
    .filter((item) => item.status === 'completed')
    .sort(
      (a, b) =>
        Date.parse(b.endedAt ?? b.startedAt) -
        Date.parse(a.endedAt ?? a.startedAt),
    );
  const last = Math.max(0, Math.ceil(completed.length / 10) - 1);
  const current = Math.min(page, last);
  return (
    <section className="card">
      <h2>训练历史</h2>
      <p className="muted">
        仅展示已完成训练。名称、日程及动作使用记录时的快照，修改或删除计划不会重写这里。
      </p>
      {!completed.length ? (
        <Empty>还没有已完成训练。记录至少一组并完成训练后会显示在这里。</Empty>
      ) : (
        <>
          {completed.slice(current * 10, current * 10 + 10).map((session) => {
            const sets = data.sets
              .filter((set) => set.sessionId === session.id)
              .sort((a, b) => a.order - b.order);
            const volume = loggedVolume(sets);
            return (
              <article className="history-session" key={session.id}>
                <div className="section-title">
                  <h3>
                    {session.planName ?? '自由训练'}
                    {session.dayName && ` / ${session.dayName}`}
                  </h3>
                  <time dateTime={session.startedAt}>
                    {displayTime(session.startedAt)}
                  </time>
                </div>
                <p>
                  {sets.length} 组 · {volume.kgReps} kg·次 · 有效{' '}
                  {Math.floor(activeSeconds(session) / 60)} 分钟
                </p>
                <p className="muted">
                  {volume.weightedSets} 个负重组计入容量；
                  {volume.unweightedSets} 个自重/无负重组未估算重量。
                </p>
                <details open>
                  <summary>查看训练明细</summary>
                  <ol>
                    {sets.map((set) => (
                      <li key={set.id}>
                        <strong>{set.exerciseName}</strong> · {set.reps} 次 ·{' '}
                        {set.mode === 'weighted'
                          ? `${set.weightKg} kg`
                          : set.mode === 'bodyweight'
                            ? '自重'
                            : '无负重'}
                        {set.rpe !== undefined && ` · RPE ${set.rpe}`}
                        {set.rir !== undefined && ` · RIR ${set.rir}`}
                        {set.notes && ` · ${set.notes}`}
                      </li>
                    ))}
                  </ol>
                  {session.notes && <p>训练备注：{session.notes}</p>}
                  {session.endedAt && (
                    <p className="muted">
                      完成于 {displayTime(session.endedAt)}
                    </p>
                  )}
                </details>
              </article>
            );
          })}
          <div className="section-title pagination">
            <button disabled={!current} onClick={() => setPage(current - 1)}>
              上一页
            </button>
            <span>
              第 {current + 1} / {last + 1} 页
            </span>
            <button
              disabled={current === last}
              onClick={() => setPage(current + 1)}
            >
              下一页
            </button>
          </div>
        </>
      )}
      <p className="muted">
        容量为负重组的 kg ×
        次数之和，是描述性指标，不是训练刺激、恢复能力或健康结论。
      </p>
    </section>
  );
}
