import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadTrainingData } from './read';
import { safeMessage } from '../../lib/errors';
import { training } from './repository';
export function useTraining() {
  const [boot, setBoot] = useState({ ready: false, error: '' });
  useEffect(() => {
    let alive = true;
    void training
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
      return await loadTrainingData();
    } catch (error) {
      return {
        exercises: [],
        plans: [],
        days: [],
        sessions: [],
        sets: [],
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
export type TrainingData = NonNullable<ReturnType<typeof useTraining>['data']>;
