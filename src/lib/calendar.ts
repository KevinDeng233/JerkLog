import { UserError } from './errors';
import type { HabitEntry } from '../db/models';
const pad = (n: number) => String(n).padStart(2, '0');
export function dateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function localInput(date = new Date()): string {
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export function parseLocal(
  value: string,
  now = new Date(),
  ambiguity: 'earlier' | 'later' = 'earlier',
): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value))
    throw new UserError('请填写有效的本地日期和时间。');
  let date = new Date(value);
  const normalized = value.length === 16 ? `${value}:00` : value;
  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() < 1 ||
    localInput(date) !== normalized
  )
    throw new UserError('这个本地时间不存在，请检查日期或夏令时切换。');
  if (ambiguity === 'later') {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const repeatMinutes =
      nextDay.getTimezoneOffset() - date.getTimezoneOffset();
    if (repeatMinutes > 0) {
      const later = new Date(date.getTime() + repeatMinutes * 60000);
      if (localInput(later) === normalized) date = later;
    }
  }
  if (date > now) throw new UserError('不能记录未来时间。');
  return date.toISOString();
}
function dayAt(year: number, month: number, day: number) {
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(12, 0, 0, 0);
  return date;
}
export function monthDays(
  month: string,
): { key: string; day: number; weekday: number }[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || Number(month.slice(0, 4)) < 1)
    throw new UserError('月份无效。');
  const [year, m] = month.split('-').map(Number);
  const count = dayAt(year, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const date = dayAt(year, m - 1, i + 1);
    return { key: dateKey(date), day: i + 1, weekday: (date.getDay() + 6) % 7 };
  });
}
export function shiftMonth(month: string, delta: number): string {
  monthDays(month);
  const [year, m] = month.split('-').map(Number);
  const date = dayAt(year, m - 1 + delta, 1);
  if (date.getFullYear() < 1 || date.getFullYear() > 9999) return month;
  return dateKey(date).slice(0, 7);
}
export function summarize(entries: HabitEntry[], now: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(today);
  week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
  const seven = new Date(today);
  seven.setDate(seven.getDate() - 6);
  const thirty = new Date(today);
  thirty.setDate(thirty.getDate() - 29);
  const valid = entries.filter(
    (entry) =>
      Number.isFinite(Date.parse(entry.occurredAt)) &&
      Date.parse(entry.occurredAt) <= now.getTime(),
  );
  const daily: Record<string, number> = {};
  for (const entry of valid) {
    const key = dateKey(new Date(entry.occurredAt));
    daily[key] = (daily[key] ?? 0) + 1;
  }
  const count = (start: Date) =>
    valid.filter((entry) => Date.parse(entry.occurredAt) >= start.getTime())
      .length;
  const trend = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(thirty);
    date.setDate(date.getDate() + i);
    const key = dateKey(date);
    return { date: key, count: daily[key] ?? 0 };
  });
  const latest = valid.reduce<string | undefined>(
    (last, entry) =>
      !last || entry.occurredAt > last ? entry.occurredAt : last,
    undefined,
  );
  return {
    today: count(today),
    week: count(week),
    seven: count(seven),
    thirty: count(thirty),
    latest,
    daily,
    trend,
  };
}
export function displayTime(iso: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}
