import { describe, expect, it } from 'vitest';
import {
  habitStats,
  localDate,
  localDateTime,
  validDate,
} from '../../src/lib/date';

describe('local calendar statistics (America/New_York)', () => {
  it('uses local date rather than UTC near midnight', () => {
    const date = new Date('2026-11-21T02:30:00Z');
    expect(localDate(date)).toBe('2026-11-20');
    expect(localDateTime(date)).toBe('2026-11-20T21:30');
  });
  it('counts Monday-based week and inclusive 30 calendar days, excluding future', () => {
    const now = new Date('2026-11-21T12:00:00-05:00');
    const entries = [
      '2026-11-21T00:00:00-05:00',
      '2026-11-20T23:59:59-05:00',
      '2026-11-16T00:00:00-05:00',
      '2026-11-15T23:59:59-05:00',
      '2026-10-23T00:00:00-04:00',
      '2026-10-22T23:59:59-04:00',
      '2026-11-21T12:00:01-05:00',
    ].map((occurredAt) => ({ occurredAt }));
    expect(habitStats(entries, now)).toEqual({ today: 1, week: 3, month: 5 });
  });
  it('handles spring daylight saving transition without using fixed 24h days', () => {
    const now = new Date('2026-03-09T01:00:00-04:00');
    const entries = [
      '2026-03-09T00:00:00-04:00',
      '2026-03-08T23:59:59-04:00',
      '2026-02-08T00:00:00-05:00',
      '2026-02-07T23:59:59-05:00',
    ].map((occurredAt) => ({ occurredAt }));
    expect(habitStats(entries, now)).toEqual({ today: 1, week: 1, month: 3 });
  });
  it('counts both instances of the repeated autumn hour', () => {
    expect(
      habitStats(
        ['2026-11-01T01:30:00-04:00', '2026-11-01T01:30:00-05:00'].map(
          (occurredAt) => ({ occurredAt }),
        ),
        new Date('2026-11-01T03:00:00-05:00'),
      ).today,
    ).toBe(2);
  });
  it('returns zeros for an empty diary', () =>
    expect(habitStats([])).toEqual({ today: 0, week: 0, month: 0 }));
  it('validates leap years and rejects normalized invalid calendar dates', () => {
    expect(validDate('2024-02-29')).toBe(true);
    expect(validDate('2026-02-29')).toBe(false);
    expect(validDate('2026-13-01')).toBe(false);
    expect(validDate('bad')).toBe(false);
  });
});
