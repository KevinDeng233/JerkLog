import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { nutrition, defaultGoals, defaultPreferences } from './repository';
import { loadNutritionData } from './read';
import { safeMessage } from '../../lib/errors';
export function useNutrition() {
  const [boot, setBoot] = useState({ ready: false, error: '' });
  useEffect(() => {
    let alive = true;
    void nutrition
      .ensureCatalog()
      .then(() => {
        if (alive) setBoot({ ready: true, error: '' });
      })
      .catch((error) => {
        if (alive) setBoot({ ready: false, error: safeMessage(error) });
      });
    return () => {
      alive = false;
    };
  }, []);
  const data = useLiveQuery(async () => {
    try {
      return await loadNutritionData();
    } catch (error) {
      return {
        foods: [],
        entries: [],
        goals: defaultGoals,
        preferences: defaultPreferences,
        error: safeMessage(error),
      };
    }
  }, []);
  return {
    ready: boot.ready && !!data,
    error: boot.error || data?.error || '',
    data,
  };
}
