import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from '../../db/database';
import { PageHeading } from '../../components/Shared';
import { dateKey } from '../../lib/calendar';
import { useNow } from '../habits/useHabits';
import { useNutrition } from './useNutrition';
import { NutritionSummary } from './components/Summary';
import { AddFoodDialog } from './diary/AddFoodDialog';
import { Diary } from './diary/Diary';
import { Library } from './foods/Library';
import { Goals } from './goals/Goals';
import { Recommendations } from './recommendations/Recommendations';
import { copy } from '../../i18n/zh-CN';
const tabs = [
  ['overview', '总览 Overview'],
  ['diary', '饮食日记 Food Diary'],
  ['library', '食品库 Food Library'],
  ['goals', '目标 Goals'],
] as const;
export default function Nutrition() {
  const { ready, error, data } = useNutrition();
  const now = useNow();
  const [chosenDate, setDate] = useState('');
  const date = chosenDate || dateKey(now);
  const [tab, setTab] = useState<string>('overview');
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<{ id: string; text: string }>();
  const settings =
    useLiveQuery(() => db.settings.get('default')) ?? defaultSettings;
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(undefined), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <>
      <PageHeading
        eyebrow="NUTRITION LAB / 认识自己的饮食"
        title="吃得明白，记录简单。"
      >
        {settings.humorMode
          ? copy.nutritionIntro.humor
          : copy.nutritionIntro.professional}
      </PageHeading>
      {!ready && !error ? (
        <p role="status">正在读取本地营养数据…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => location.reload()}>重新读取营养数据</button>
        </div>
      ) : (
        data && (
          <>
            <section className="card nutrition-start">
              <div className="section-title">
                <div>
                  <h2>从一餐开始。</h2>
                  <p className="muted">
                    记录真实份量，不追求完美；数据仅保存在本机。
                  </p>
                </div>
                <button className="primary" onClick={() => setAdding(true)}>
                  添加食物
                </button>
              </div>
            </section>
            <label className="date-picker">
              查看饮食日期
              <input
                type="date"
                required
                value={date}
                onChange={(event) => {
                  if (event.target.value) setDate(event.target.value);
                }}
              />
            </label>
            <NutritionSummary
              entries={data.entries}
              date={date}
              goals={data.goals}
            />
            <div
              role="tablist"
              aria-label="Nutrition 视图"
              className="training-tabs nutrition-tabs"
            >
              {tabs.map(([key, label], index) => (
                <button
                  key={key}
                  role="tab"
                  id={`nutrition-tab-${key}`}
                  aria-controls={`nutrition-panel-${key}`}
                  aria-selected={key === tab}
                  tabIndex={key === tab ? 0 : -1}
                  onClick={() => setTab(key)}
                  onKeyDown={(event) => {
                    const offset =
                      event.key === 'ArrowRight'
                        ? 1
                        : event.key === 'ArrowLeft'
                          ? -1
                          : 0;
                    if (offset) {
                      event.preventDefault();
                      const next =
                        tabs[(index + offset + tabs.length) % tabs.length][0];
                      setTab(next);
                      document.getElementById(`nutrition-tab-${next}`)?.focus();
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`nutrition-panel-${tab}`}
              aria-labelledby={`nutrition-tab-${tab}`}
            >
              {tab === 'overview' && (
                <Recommendations
                  entries={data.entries}
                  date={date}
                  goals={data.goals}
                  preferences={data.preferences}
                />
              )}
              {(tab === 'overview' || tab === 'diary') && (
                <Diary entries={data.entries} date={date} onDate={setDate} />
              )}
              {tab === 'library' && <Library foods={data.foods} />}
              {tab === 'goals' && <Goals goals={data.goals} />}
            </div>
            {adding && (
              <AddFoodDialog
                foods={data.foods}
                date={date}
                onClose={() => setAdding(false)}
                onSaved={(localDate) => {
                  setDate(localDate);
                  setTab('diary');
                  setAdding(false);
                  setNotice({
                    id: crypto.randomUUID(),
                    text: '饮食记录已保存。',
                  });
                }}
              />
            )}
          </>
        )
      )}
      {notice && (
        <p role="status" className="feedback toast">
          {notice.text}
          <button
            className="toast-dismiss"
            aria-label="关闭提示"
            onClick={() => setNotice(undefined)}
          >
            关闭
          </button>
        </p>
      )}
    </>
  );
}
