import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from '../../db/database';
import type { HabitEntry } from '../../db/models';
import { habits, QUICK_COOLDOWN_MS } from './repository';
import { useHabits, useNow } from './useHabits';
import { History } from './History';
import { Calendar } from './Calendar';
import { Insights } from './Insights';
import { PageHeading } from '../../components/Shared';
import { useAction } from '../../lib/useAction';
import { localInput, parseLocal } from '../../lib/calendar';
import { copy } from '../../i18n/zh-CN';
export default function Habits() {
  const data = useHabits();
  const now = useNow();
  const settings =
    useLiveQuery(() => db.settings.get('default')) ?? defaultSettings;
  const state = useLiveQuery(() => db.habitState.get('control'));
  const action = useAction();
  const [ambiguity, setAmbiguity] = useState<'earlier' | 'later'>('earlier');
  const [editing, setEditing] = useState<HabitEntry>();
  const [time, setTime] = useState(() => localInput());
  const input = useRef<HTMLInputElement>(null);
  const remaining =
    state?.lastQuickAt === undefined
      ? 0
      : Math.abs(now.getTime() - state.lastQuickAt) < QUICK_COOLDOWN_MS
        ? Math.max(0, QUICK_COOLDOWN_MS - (now.getTime() - state.lastQuickAt))
        : 0;
  function edit(entry: HabitEntry) {
    setEditing(entry);
    const earlier = new Date(
      parseLocal(localInput(new Date(entry.occurredAt))),
    );
    setAmbiguity(
      earlier.getTimezoneOffset() ===
        new Date(entry.occurredAt).getTimezoneOffset()
        ? 'earlier'
        : 'later',
    );
    setTime(localInput(new Date(entry.occurredAt)));
    input.current?.focus();
    input.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function remove(entry: HabitEntry) {
    if (window.confirm('确认删除这条记录？你可以撤销最近一次操作。'))
      void action.run(() => habits.remove(entry), '记录已删除，可撤销。');
  }
  return (
    <>
      <PageHeading eyebrow="HABITS / 自主记录" title="留一点时间，了解自己。">
        由你决定如何记录，不设统一频率标准。所有时间按当前浏览器时区显示。
      </PageHeading>
      {!data ? (
        <p role="status">正在读取本地记录…</p>
      ) : data.error ? (
        <div role="alert">
          <p>{data.error}</p>
          <button onClick={() => location.reload()}>重新读取</button>
        </div>
      ) : (
        <>
          <section className="card quick-record">
            {' '}
            <h2>当下，记一笔</h2>
            <p className="muted">一键保存当前时间。短时间重复点击会被阻止。</p>
            <button
              className="primary wide"
              disabled={action.busy || remaining > 0}
              onClick={() =>
                void action.run(() => habits.add(), '已记录到本机。')
              }
            >
              {remaining > 0
                ? '刚刚已记录 · 请稍候'
                : settings.humorMode
                  ? copy.habitAction.humor
                  : copy.habitAction.professional}
            </button>
          </section>
          <Insights entries={data.entries} now={now} />
          <div className="two-columns habits-columns">
            <section className="card">
              <h3>{editing ? '编辑记录时间' : '补录历史记录'}</h3>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void action.run(async () => {
                    const iso =
                      editing &&
                      time === localInput(new Date(editing.occurredAt)) &&
                      new Date(
                        parseLocal(time, new Date(), ambiguity),
                      ).getTimezoneOffset() ===
                        new Date(editing.occurredAt).getTimezoneOffset()
                        ? editing.occurredAt
                        : parseLocal(time, new Date(), ambiguity);
                    if (editing) await habits.edit(editing, iso);
                    else await habits.add(iso);
                    setEditing(undefined);
                  }, '记录时间已保存。');
                }}
              >
                <label>
                  记录发生时间
                  <input
                    ref={input}
                    type="datetime-local"
                    step="1"
                    required
                    value={time}
                    max={localInput(now)}
                    onChange={(event) => setTime(event.target.value)}
                  />
                </label>
                <p className="muted">
                  时间按当前浏览器时区解释；夏令时回拨可选择较早或较晚的一次，不存在的时间会被拒绝。
                </p>
                <label>
                  夏令时重复时间
                  <select
                    value={ambiguity}
                    onChange={(event) =>
                      setAmbiguity(event.target.value as 'earlier' | 'later')
                    }
                  >
                    <option value="earlier">采用较早的一次（默认）</option>
                    <option value="later">采用较晚的一次</option>
                  </select>
                </label>
                <div className="button-row">
                  <button disabled={action.busy}>
                    {editing ? '保存修改' : '保存补录'}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(undefined);
                        setTime(localInput());
                      }}
                    >
                      取消编辑
                    </button>
                  )}
                </div>
              </form>
              <hr />
              <button
                disabled={!state?.undo || action.busy}
                onClick={() => {
                  if (state?.undo)
                    void action.run(
                      () => habits.undo(state.undo!),
                      '已撤销最近操作。',
                    );
                }}
              >
                撤销最近操作
              </button>
              <p className="muted">
                可撤销最近一次新增、修改或删除；刷新后仍可撤销，不支持重做。
              </p>
            </section>
            <section className="card">
              <div className="section-title">
                <h2>历史记录</h2>
                <span className="tag">共 {data.entries.length} 条</span>
              </div>
              <History
                entries={data.entries}
                onEdit={edit}
                onDelete={remove}
                busy={action.busy}
              />
            </section>
          </div>
          <Calendar
            entries={data.entries}
            now={now}
            onEdit={edit}
            onDelete={remove}
            busy={action.busy}
          />
        </>
      )}
      {action.feedback}
    </>
  );
}
