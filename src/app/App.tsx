import { useEffect, Component, type ReactNode, useRef } from 'react';
import {
  HashRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { resolveTheme } from '../lib/theme';
import { copy } from '../i18n/zh-CN';
import Dashboard from '../features/dashboard/Dashboard';
import Habits from '../features/habits/Habits';
import Training from '../features/training/Training';
import Nutrition from '../features/nutrition/Nutrition';
import Settings from '../features/settings/Settings';

class StorageBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal" role="alert">
          <h1>暂时无法读取本地数据</h1>
          <p>
            请确认浏览器允许 IndexedDB
            存储，并检查可用空间。我们不会自动清空已有数据。
          </p>
          <button onClick={() => window.location.reload()}>重新读取</button>
        </main>
      );
    return this.props.children;
  }
}
function Shell() {
  const settings = useLiveQuery(() => db.settings.get('default'));
  const theme = settings?.theme ?? 'dark';
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(
        theme,
        query.matches,
      );
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    main.current?.focus();
    window.scrollTo(0, 0);
    document.title = `${copy.navigation.find((item) => item.to === location.pathname)?.label ?? '页面未找到'} · JerkLog`;
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        跳到内容
      </a>
      <aside className="sidebar">
        <NavLink className="brand" to="/">
          <span className="brand-mark">J.</span>
          <span>
            JerkLog<small>Habits · Training · Nutrition</small>
          </span>
        </NavLink>
        <nav aria-label="主导航">
          {copy.navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <span aria-hidden="true" className="nav-icon">
                {item.icon}
              </span>
              <span>
                {item.label}
                <small>{item.english}</small>
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="privacy-mark" aria-hidden="true">
            ◇
          </span>
          <strong>私人空间</strong>
          <p>无需登录 · 仅本地存储</p>
          <span className="muted">v0.1 / Phase 1B</span>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span>Habits · Training · Nutrition</span>
          <NavLink to="/settings" className="privacy-pill">
            ◇ 仅保存在本机
          </NavLink>
        </div>
        <main id="main" tabIndex={-1} ref={main}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/training" element={<Training />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="*"
              element={
                <>
                  <h1>页面未找到</h1>
                  <NavLink to="/">返回总览</NavLink>
                </>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <StorageBoundary>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StorageBoundary>
  );
}
