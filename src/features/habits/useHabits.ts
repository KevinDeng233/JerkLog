import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { safeMessage } from '../../lib/errors';
export function useHabits() {
  return useLiveQuery(async () => {
    try {
      const entries = await db.habitEntries
        .orderBy('occurredAt')
        .reverse()
        .toArray();
      return { entries, error: '' };
    } catch (error) {
      return { entries: [], error: safeMessage(error) };
    }
  });
}
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = setInterval(update, 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return now;
}
