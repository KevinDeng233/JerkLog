import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultSettings } from '../../db/database';
import { saveTheme } from '../../db/preferences';
import type { Settings } from '../../db/models';
import { useAction } from '../../lib/useAction';
import { PageHeading } from '../../components/Shared';
export default function SettingsPage() {
  const persisted = useLiveQuery(
    async () => (await db.settings.get('default')) ?? defaultSettings,
  );
  const [pending, setPending] = useState<Settings['theme']>();
  const action = useAction();
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
          <span className="tag">当前为专业文案</span>
          <p className="muted">
            已为整活模式预留设置字段与文案接口，切换功能将在后续阶段开放。
          </p>
        </section>
        <section className="card">
          <span className="tag">仅本地存储</span>
          <h2>隐私，默认在本机。</h2>
          <p>
            Phase 0
            仅保存主题偏好，不采集或保存个人业务记录。数据库基础架构已就绪。
          </p>
          <p className="muted">
            无需账号，没有后台同步，不接入广告、分析或错误上报
            SDK。本地存储不等于加密；清除浏览器数据可能导致偏好丢失。
          </p>
          <hr />
          <p className="muted">
            仅供成年用户自我管理，不替代医疗建议。不依据私人习惯记录判断身体健康或推导营养、训练结论。
          </p>
        </section>
      </div>
      <p className="muted version">JerkLog · v0.1 / Phase 0 · 项目基础架构</p>
    </>
  );
}
