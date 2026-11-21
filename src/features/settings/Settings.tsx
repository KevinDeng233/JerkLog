import { useState } from 'react';
import { useAction } from '../../lib/useAction';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from '../../db/database';
import type { Settings } from '../../db/models';
import { PageHeading } from '../../components/Shared';

export default function SettingsPage() {
  const persisted = useLiveQuery(
    async () => (await db.settings.get('default')) ?? defaultSettings,
  );
  const [pending, setPending] = useState<Partial<Settings>>({});
  const settings = { ...(persisted ?? defaultSettings), ...pending };
  const action = useAction();
  function update(patch: Partial<Settings>) {
    const previous = pending;
    setPending({ ...pending, ...patch });
    void action
      .run(
        () =>
          db.transaction('rw', db.settings, async () => {
            const current =
              (await db.settings.get('default')) ?? defaultSettings;
            await db.settings.put({ ...current, ...patch, id: 'default' });
          }),
        '设置已保存。',
      )
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
          <h2>使用偏好</h2>
          <label>
            界面主题
            <select
              value={settings?.theme ?? 'dark'}
              disabled={action.busy || !persisted}
              onChange={(event) =>
                update({ theme: event.target.value as Settings['theme'] })
              }
            >
              <option value="dark">深色</option>
              <option value="light">亮色</option>
              <option value="system">跟随系统</option>
            </select>
          </label>
          <label className="toggle">
            <span>
              整活文案
              <span className="muted block">
                只改变展示文案，统计与健康结论不变。
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings?.humorMode ?? false}
              disabled={action.busy || !persisted}
              onChange={(event) => update({ humorMode: event.target.checked })}
            />
          </label>
          {action.feedback}
        </section>
        <section className="card">
          <span className="tag">仅本地存储</span>
          <h2>隐私，默认在本机。</h2>
          <p>
            私人记录保存在当前浏览器的 IndexedDB
            中。无需账号，没有后台同步，不接入广告、分析或错误上报 SDK。
          </p>
          <p className="muted">
            本地存储不等于加密。清除浏览器数据、使用隐私浏览或更换浏览器可能导致记录丢失。目前尚未提供备份，请勿把本版本作为唯一的长期存档。
          </p>
          <hr />
          <p className="muted">
            仅供成年用户自我管理，不替代医疗建议。本产品不依据私人习惯记录判断身体健康，也不据此推导热量消耗、营养流失或训练能力。
          </p>
        </section>
      </div>
      <p className="muted version">JerkLog · v0.1 / Phase 1 · 本地数据闭环</p>
    </>
  );
}
