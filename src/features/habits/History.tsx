import { useState } from 'react';
import type { HabitEntry } from '../../db/models';
import { displayTime } from '../../lib/calendar';
import { Empty } from '../../components/Shared';
export function History({
  entries,
  onEdit,
  onDelete,
  busy = false,
}: {
  entries: HabitEntry[];
  onEdit?: (entry: HabitEntry) => void;
  onDelete?: (entry: HabitEntry) => void;
  busy?: boolean;
}) {
  const [page, setPage] = useState(0);
  const max = Math.max(0, Math.ceil(entries.length / 20) - 1);
  const current = Math.min(page, max);
  if (!entries.length) return <Empty>暂无记录。按自己的节奏开始。</Empty>;
  return (
    <>
      <ul className="record-list">
        {entries.slice(current * 20, current * 20 + 20).map((entry) => (
          <li key={entry.id}>
            <time dateTime={entry.occurredAt}>
              {displayTime(entry.occurredAt)}
            </time>
            <div className="button-row">
              {onEdit && (
                <button disabled={busy} onClick={() => onEdit(entry)}>
                  编辑
                </button>
              )}
              {onDelete && (
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => onDelete(entry)}
                >
                  删除
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="section-title pagination">
        <button disabled={current === 0} onClick={() => setPage(current - 1)}>
          上一页
        </button>
        <span>
          第 {current + 1} / {max + 1} 页 · 共 {entries.length} 条
        </span>
        <button disabled={current === max} onClick={() => setPage(current + 1)}>
          下一页
        </button>
      </div>
    </>
  );
}
