import { useEffect, useState } from 'react';
// Refresh time-based totals after local midnight or returning to the tab.
export function useLocalNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const interval = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', update);
    };
  }, []);
  return now;
}
