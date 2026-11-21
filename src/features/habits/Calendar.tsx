import { useState } from 'react';
import type { HabitEntry } from '../../db/models';
import { dateKey, monthDays, shiftMonth, summarize } from '../../lib/calendar';
import { History } from './History';
export function Calendar({
  entries,
  now,
  onEdit,
  onDelete,
  busy,
}: {
  entries: HabitEntry[];
  now: Date;
  onEdit: (entry: HabitEntry) => void;
  onDelete: (entry: HabitEntry) => void;
  busy: boolean;
}) {
  const [chosenMonth, setMonth] = useState('');
  const [selected, setSelected] = useState('');
  const month = chosenMonth || dateKey(now).slice(0, 7);
  const days = monthDays(month);
  const day = selected || dateKey(now);
  const stats = summarize(entries, now);
  function change(next: string) {
    setMonth(next);
    setSelected(next + '-01');
  }
  return (
    <section className="card calendar-card">
      <div className="section-title">
        <h2>日历热力图</h2>
        <div className="button-row">
          <button
            aria-label="上个月"
            onClick={() => change(shiftMonth(month, -1))}
          >
            上一月
          </button>
          <strong aria-live="polite">{month}</strong>
          <button
            aria-label="下个月"
            onClick={() => change(shiftMonth(month, 1))}
          >
            下一月
          </button>
        </div>
      </div>
      <p className="muted">本地日期 · 每格直接显示次数，颜色深浅只表示数量。</p>
      <div className="calendar-grid">
        {['一', '二', '三', '四', '五', '六', '日'].map((label) => (
          <span className="weekday" key={label}>
            {label}
          </span>
        ))}
        {Array.from({ length: days[0].weekday }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((cell) => {
          const count = stats.daily[cell.key] ?? 0;
          return (
            <button
              key={cell.key}
              className={`calendar-day heat-${Math.min(count, 3)}`}
              aria-pressed={cell.key === day}
              aria-current={cell.key === dateKey(now) ? 'date' : undefined}
              aria-label={`${cell.key}，${count} 次`}
              onClick={() => setSelected(cell.key)}
            >
              <span>{cell.day}</span>
              <small>{count} 次</small>
            </button>
          );
        })}
      </div>
      <h3 className="day-title">{day} 的记录</h3>
      <History
        key={day}
        entries={entries.filter(
          (entry) => dateKey(new Date(entry.occurredAt)) === day,
        )}
        onEdit={onEdit}
        onDelete={onDelete}
        busy={busy}
      />
    </section>
  );
}
