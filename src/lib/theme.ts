import type { Settings } from '../db/models';
export function resolveTheme(
  theme: Settings['theme'],
  systemDark: boolean,
): 'dark' | 'light' {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}
