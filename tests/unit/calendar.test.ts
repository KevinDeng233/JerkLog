import { describe, expect, it } from 'vitest';
import type { HabitEntry } from '../../src/db/models';
import {
  dateKey,
  localInput,
  parseLocal,
  monthDays,
  shiftMonth,
  summarize,
} from '../../src/lib/calendar';
const entry = (date: string): HabitEntry => ({
  id: date,
  occurredAt: new Date(date).toISOString(),
  createdAt: new Date(date).toISOString(),
  updatedAt: new Date(date).toISOString(),
});
describe('local calendar statistics in America/New_York', () => {
  it('uses local day around midnight rather than the UTC date', () => {
    const date = new Date('2026-11-21T02:30:00Z');
    expect(dateKey(date)).toBe('2026-11-20');
    expect(localInput(date)).toBe('2026-11-20T21:30:00');
    const stats = summarize(
      [entry('2026-11-20T23:59:59-05:00'), entry('2026-11-21T00:00:00-05:00')],
      new Date('2026-11-21T12:00:00-05:00'),
    );
    expect(stats.today).toBe(1);
    expect(stats.daily['2026-11-20']).toBe(1);
  });
  it('counts Monday-based week, 7 and 30 inclusive calendar days and excludes future events', () => {
    const dates = [
      '2026-11-21T00:00:00-05:00',
      '2026-11-16T00:00:00-05:00',
      '2026-11-15T00:00:00-05:00',
      '2026-11-14T23:59:59-05:00',
      '2026-10-23T00:00:00-04:00',
      '2026-10-22T23:59:59-04:00',
      '2026-11-22T00:00:00-05:00',
    ];
    const stats = summarize(
      dates.map(entry),
      new Date('2026-11-21T12:00:00-05:00'),
    );
    expect([stats.today, stats.week, stats.seven, stats.thirty]).toEqual([
      1, 2, 3, 5,
    ]);
    expect(stats.latest).toBe(new Date(dates[0]).toISOString());
    expect(stats.trend).toHaveLength(30);
    expect(stats.trend.reduce((sum, day) => sum + day.count, 0)).toBe(5);
  });
  it('keeps spring DST calendar days, which are not always 24 hours', () => {
    const stats = summarize(
      [
        '2026-03-08T00:00:00-05:00',
        '2026-03-08T23:59:59-04:00',
        '2026-03-09T00:00:00-04:00',
      ].map(entry),
      new Date('2026-03-09T01:00:00-04:00'),
    );
    expect(stats.today).toBe(1);
    expect(stats.week).toBe(1);
    expect(stats.daily['2026-03-08']).toBe(2);
  });
  it('counts both occurrences of the repeated autumn hour on the same day', () => {
    const stats = summarize(
      ['2026-11-01T01:30:00-04:00', '2026-11-01T01:30:00-05:00'].map(entry),
      new Date('2026-11-01T03:00:00-05:00'),
    );
    expect(stats.today).toBe(2);
    expect(stats.daily['2026-11-01']).toBe(2);
  });
  it('handles a week and 30-day window crossing a year boundary', () => {
    const stats = summarize(
      [
        '2025-12-29T00:00:00-05:00',
        '2025-12-28T23:59:59-05:00',
        '2026-01-01T00:00:00-05:00',
      ].map(entry),
      new Date('2026-01-01T12:00:00-05:00'),
    );
    expect(stats.week).toBe(2);
    expect(stats.seven).toBe(3);
    expect(stats.trend[29].date).toBe('2026-01-01');
  });
  it('shows zero totals and zero trend for an empty database', () => {
    const stats = summarize([], new Date());
    expect(stats.today + stats.week + stats.seven + stats.thirty).toBe(0);
    expect(stats.latest).toBeUndefined();
    expect(stats.trend.every((day) => day.count === 0)).toBe(true);
  });
  it.each([
    '2026-03-08T02:30',
    '2026-02-30T12:00',
    'bad',
    '2026-11-21T12:00Z',
    '2999-01-01T00:00',
  ])('rejects nonexistent, invalid or future local input %s', (value) =>
    expect(() =>
      parseLocal(value, new Date('2026-11-21T23:00:00-05:00')),
    ).toThrow(),
  );
  it('parses minutes and seconds and consistently uses earlier repeated DST hour', () => {
    expect(
      parseLocal('2026-11-01T01:30', new Date('2026-11-21T00:00:00Z')),
    ).toBe('2026-11-01T05:30:00.000Z');
    expect(
      parseLocal('2026-11-01T01:30:15', new Date('2026-11-21T00:00:00Z')),
    ).toBe('2026-11-01T05:30:15.000Z');
  });
  it('builds leap-year and month-end cells and navigates across years', () => {
    expect(monthDays('2024-02')).toHaveLength(29);
    expect(monthDays('2026-02')).toHaveLength(28);
    expect(monthDays('2026-01').at(-1)?.key).toBe('2026-01-31');
    expect(monthDays('2026-11')[0].weekday).toBe(6);
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(() => monthDays('2026-13')).toThrow();
  });
});

it('allows choosing the later repeated hour without shifting ordinary local times', () => {
  expect(
    parseLocal('2026-11-01T01:30', new Date('2026-11-21T00:00:00Z'), 'later'),
  ).toBe('2026-11-01T06:30:00.000Z');
  expect(
    parseLocal('2026-11-02T01:30', new Date('2026-11-21T00:00:00Z'), 'later'),
  ).toBe('2026-11-02T06:30:00.000Z');
  expect(() =>
    parseLocal('2026-11-01T01:30', new Date('2026-11-01T06:00:00Z'), 'later'),
  ).toThrow('未来');
});
