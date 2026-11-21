import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from '../../db/database';
import { saveHumor, saveTheme } from '../../db/preferences';
import type { Settings } from '../../db/models';
import { useAction } from '../../lib/useAction';
import { PageHeading } from '../../components/Shared';
export default function SettingsPage() {
  const persisted = useLiveQuery(
    async () => (await db.settings.get('default')) ?? defaultSettings,
  );
  const [pending, setPending] = useState<Settings['theme']>();
  const action = useAction();
  const [humor, setHumor] = useState<boolean>();
  function update(theme: Settings['theme']) {
    const previous = pending;
    setPending(theme);
    void action
      .run(() => saveTheme(theme), '主题已保存。')
      .then((ok) => {
        if (!ok) setPending(previous);
      });
  }
  return (
    <>
      <PageHeading eyebrow="SETTINGS / 由你掌控" title="你的记录，你的选择。">
        让工具适应你自己的节奏。
      </PageHeading>
      <div className="two-columns">
        <section className="card">
          <h2>界面偏好</h2>
          <label>
            界面主题
            <select
              value={pending ?? persisted?.theme ?? 'dark'}
              disabled={action.busy || !persisted}
              onChange={(event) =>
                update(event.target.value as Settings['theme'])
              }
            >
              <option value="dark">深色</option>
              <option value="light">亮色</option>
              <option value="system">跟随系统</option>
            </select>
          </label>
          {action.feedback}
          <hr />
          <h3>文案模式</h3>
          <label className="toggle">
            <span>
              整活文案
              <span className="muted block">
                只改变展示文案，不影响记录或统计。
              </span>
            </span>
            <input
              type="checkbox"
              checked={humor ?? persisted?.humorMode ?? false}
              disabled={action.busy || !persisted}
              onChange={(event) => {
                const next = event.target.checked;
                const previous = humor;
                setHumor(next);
                void action
                  .run(() => saveHumor(next), '文案模式已保存。')
                  .then((ok) => {
                    if (!ok) setHumor(previous);
                  });
              }}
            />
          </label>
        </section>
        <section className="card">
          <span className="tag">仅本地存储</span>
          <h2>隐私，默认在本机。</h2>
          <p>
            习惯、训练、饮食记录与偏好仅保存在当前浏览器
            IndexedDB。没有后台同步。
          </p>
          <p className="muted">
            无需账号，没有后台同步，不接入广告、分析或错误上报
            SDK。本地存储不等于加密；清除浏览器数据可能导致所有记录丢失；备份功能尚未提供。
          </p>
          <hr />
          <p className="muted">
            仅供成年用户自我管理，不替代医疗建议。不依据私人习惯记录判断身体健康或推导营养、训练结论。
          </p>
        </section>
      </div>
      <p className="muted version">JerkLog · v0.1 / Phase 1C · Nutrition Lab</p>
    </>
  );
}
