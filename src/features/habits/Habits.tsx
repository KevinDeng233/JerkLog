import { useAction } from '../../lib/useAction';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from '../../db/database';
import type { HabitEntry } from '../../db/models';
import { addHabit, editHabit } from '../../db/actions';
import { habitStats, localDateTime, displayTime } from '../../lib/date';
import { useLocalNow } from '../../lib/useLocalNow';
import { copy } from '../../i18n/zh-CN';
import { PageHeading, Empty, Metrics } from '../../components/Shared';

export default function Habits() {
  const entries = useLiveQuery(() =>
    db.habitEntries.orderBy('occurredAt').reverse().toArray(),
  );
  const settings =
    useLiveQuery(() => db.settings.get('default')) ?? defaultSettings;
  const [time, setTime] = useState(() => localDateTime());
  const [editing, setEditing] = useState<string>();
  const [deleted, setDeleted] = useState<HabitEntry>();
  const action = useAction();
  const now = useLocalNow();
  const stats = habitStats(entries ?? [], now);

  return (
    <>
      <PageHeading eyebrow="HABITS / 自主记录" title="留一点时间，了解自己。">
        由你决定如何记录，不设统一频率标准。
      </PageHeading>
      <Metrics
        items={[
          { label: '今日', value: stats.today, unit: '次' },
          { label: '本周 · 周一起', value: stats.week, unit: '次' },
          { label: '近 30 天', value: stats.month, unit: '次' },
        ]}
      />
      <div className="two-columns">
        <section className="card">
          <h2>当下，记一笔</h2>
          <p className="muted">只记录时间，不做健康判断。</p>
          <button
            className="primary wide"
            disabled={action.busy}
            onClick={() => void action.run(() => addHabit(), '已保存到本机。')}
          >
            {settings.humorMode
              ? copy.habitAction.humor
              : copy.habitAction.professional}
          </button>
          <hr />
          <h3>{editing ? '编辑记录时间' : '补录一次'}</h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void action.run(async () => {
                const iso = new Date(time).toISOString();
                if (editing) await editHabit(editing, iso);
                else await addHabit(iso);
                setEditing(undefined);
              }, '记录时间已保存。');
            }}
          >
            <label>
              记录时间
              <input
                type="datetime-local"
                value={time}
                max={localDateTime(now)}
                required
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
            <div className="button-row">
              <button disabled={action.busy}>保存时间</button>
              {editing && (
                <button type="button" onClick={() => setEditing(undefined)}>
                  取消编辑
                </button>
              )}
            </div>
          </form>
          {action.feedback}
          {deleted && (
            <div className="notice" role="status">
              已删除一条记录。
              <button
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await db.habitEntries.add(deleted);
                    setDeleted(undefined);
                  }, '已恢复记录。')
                }
              >
                撤销删除
              </button>
            </div>
          )}
        </section>
        <section className="card">
          <div className="section-title">
            <h2>最近记录</h2>
            <span className="muted">共 {entries?.length ?? 0} 条</span>
          </div>
          {entries === undefined ? (
            <p role="status">正在读取本地记录…</p>
          ) : entries.length === 0 ? (
            <Empty>还没有记录。按自己的节奏开始。</Empty>
          ) : (
            <ul className="record-list">
              {entries.slice(0, 50).map((entry) => (
                <li key={entry.id}>
                  <time dateTime={entry.occurredAt}>
                    {displayTime(entry.occurredAt)}
                  </time>
                  <div className="button-row">
                    <button
                      onClick={() => {
                        setEditing(entry.id);
                        setTime(localDateTime(new Date(entry.occurredAt)));
                      }}
                    >
                      编辑
                    </button>
                    <button
                      className="danger"
                      disabled={action.busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            '删除这条习惯记录？删除后可撤销最近一条。',
                          )
                        )
                          void action.run(async () => {
                            await db.habitEntries.delete(entry.id);
                            setDeleted(entry);
                          }, '已删除，可撤销。');
                      }}
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(entries?.length ?? 0) > 50 && (
            <p className="muted">仅展示最近 50 条，统计包含全部记录。</p>
          )}
        </section>
      </div>
    </>
  );
}
