import { safeMessage } from './errors';
import { useState, useRef, useEffect } from 'react';

export function useAction() {
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!message || failed) return;
    const timer = setTimeout(() => setMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [message, failed]);
  async function run(action: () => Promise<unknown>, success: string) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      await action();
      setMessage(success);
      return true;
    } catch (error) {
      setFailed(true);
      setMessage(safeMessage(error));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    run,
    busy,
    feedback: (
      <p
        className={
          message
            ? failed
              ? 'feedback toast error'
              : 'feedback toast'
            : 'feedback'
        }
        role={failed ? 'alert' : 'status'}
      >
        {message}
        {message && (
          <button
            className="toast-dismiss"
            aria-label="关闭提示"
            onClick={() => setMessage('')}
          >
            关闭
          </button>
        )}
      </p>
    ),
  };
}
