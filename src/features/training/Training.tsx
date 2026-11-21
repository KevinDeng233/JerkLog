import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from '../../db/database';
import { PageHeading, Metrics } from '../../components/Shared';
import { useAction } from '../../lib/useAction';
import { dateKey, displayTime } from '../../lib/calendar';
import { useNow } from '../habits/useHabits';
import { copy } from '../../i18n/zh-CN';
import { training } from './repository';
import { useTraining } from './useTraining';
import { trainingSummary } from './metrics';
import { Exercises } from './exercises/Exercises';
import { Plans } from './plans/Plans';
import { CurrentSession } from './sessions/CurrentSession';
import { TrainingHistory } from './sessions/History';
const tabs = [
  ['plans', '计划 Plans'],
  ['exercises', '动作 Exercises'],
  ['current', '当前训练 Current Session'],
  ['history', '历史 History'],
] as const;
export default function Training() {
  const { data, ready, error } = useTraining();
  const now = useNow();
  const action = useAction();
  const [tab, setTab] = useState<string>('plans');
  const settings =
    useLiveQuery(() => db.settings.get('default')) ?? defaultSettings;
  async function start(planId?: string, dayId?: string) {
    await action.run(async () => {
      await training.start(planId, dayId);
      setTab('current');
    }, '训练已开始。');
  }
  const summary = trainingSummary(data?.sessions ?? [], now);
  const pending = data?.sessions.some((item) => item.status !== 'completed');
  return (
    <>
      <PageHeading eyebrow="TRAINING LAB / 训练与日程" title="专注下一组。">
        {settings.humorMode
          ? copy.trainingIntro.humor
          : copy.trainingIntro.professional}
      </PageHeading>
      {!ready && !error ? (
        <p role="status">正在读取本地训练数据…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => location.reload()}>重新读取训练数据</button>
        </div>
      ) : (
        data && (
          <>
            <section className="card training-start">
              <div className="section-title">
                <div>
                  <h2>今天，练得清楚。</h2>
                  <p className="muted">
                    从自己的计划开始，或记录一次自由训练。
                  </p>
                </div>
                <button
                  className="primary"
                  disabled={action.busy}
                  onClick={() => (pending ? setTab('current') : void start())}
                >
                  {pending ? '查看当前训练' : '开始训练'}
                </button>
              </div>
            </section>
            <Metrics
              items={[
                { label: '本周完成训练', value: summary.week, unit: '次' },
                {
                  label: '累计完成训练',
                  value: summary.completed.length,
                  unit: '次',
                },
                {
                  label: '最近训练日期',
                  value: summary.latest
                    ? dateKey(new Date(summary.latest.startedAt)).slice(5)
                    : '—',
                },
              ]}
            />
            <p className="muted">
              最近一次：
              {summary.latest
                ? displayTime(summary.latest.startedAt)
                : '暂无训练'}{' '}
              · 本周按当地周一零点至现在的完成时间计算。
            </p>
            <div
              className="training-tabs"
              role="tablist"
              aria-label="Training 视图"
            >
              {tabs.map(([id, label], index) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`training-tab-${id}`}
                  aria-controls={`training-panel-${id}`}
                  aria-selected={tab === id}
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => setTab(id)}
                  onKeyDown={(event) => {
                    const offset =
                      event.key === 'ArrowRight'
                        ? 1
                        : event.key === 'ArrowLeft'
                          ? -1
                          : 0;
                    if (offset) {
                      event.preventDefault();
                      const target =
                        tabs[(index + offset + tabs.length) % tabs.length][0];
                      setTab(target);
                      document
                        .getElementById(`training-tab-${target}`)
                        ?.focus();
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`training-panel-${tab}`}
              aria-labelledby={`training-tab-${tab}`}
            >
              {tab === 'plans' && (
                <Plans
                  data={data}
                  onStart={(planId, dayId) => void start(planId, dayId)}
                />
              )}
              {tab === 'exercises' && <Exercises exercises={data.exercises} />}
              {tab === 'current' && (
                <CurrentSession
                  data={data}
                  now={now}
                  onStart={() => void start()}
                  onHistory={() => setTab('history')}
                />
              )}
              {tab === 'history' && <TrainingHistory data={data} />}
            </div>
          </>
        )
      )}
      {action.feedback}
    </>
  );
}
