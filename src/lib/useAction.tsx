import { useState } from 'react';

export function useAction() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      await action();
      setMessage(success);
      return true;
    } catch (error) {
      setFailed(true);
      // Known validation errors contain no entered values; storage errors stay generic.
      setMessage(
        error instanceof Error && error.name === 'Error'
          ? error.message
          : '本地存储操作失败，请检查浏览器存储权限或剩余空间后重试。',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    run,
    busy,
    feedback: (
      <p
        className={failed ? 'feedback error' : 'feedback'}
        role={failed ? 'alert' : 'status'}
      >
        {message}
      </p>
    ),
  };
}
