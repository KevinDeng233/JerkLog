import { db, defaultSettings } from './database';
import type { Settings } from './models';
export async function saveTheme(theme: Settings['theme'], database = db) {
  if (!['dark', 'light', 'system'].includes(theme))
    throw new Error('请选择有效主题。');
  await database.transaction('rw', database.settings, async () => {
    const current = (await database.settings.get('default')) ?? defaultSettings;
    await database.settings.put({ ...current, theme, id: 'default' });
  });
}
