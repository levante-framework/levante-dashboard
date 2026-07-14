import { describe, expect, it } from 'vitest';
import {
  endOfLocalDay,
  normalizeAdministrationDateOpen,
  startOfLocalDay,
} from './administrations';

describe('normalizeAdministrationDateOpen', () => {
  it('opens immediately when the selected calendar day is today at midnight', () => {
    const now = new Date(2026, 6, 14, 13, 0, 0); // 1pm local
    const pickedToday = startOfLocalDay(now);
    const result = normalizeAdministrationDateOpen(pickedToday, now);
    expect(result.getTime()).toBe(now.getTime());
  });

  it('keeps an explicit non-midnight time on today', () => {
    const now = new Date(2026, 6, 14, 15, 30, 0);
    const alreadyNow = new Date(2026, 6, 14, 15, 30, 0);
    expect(normalizeAdministrationDateOpen(alreadyNow, now).getTime()).toBe(alreadyNow.getTime());
  });

  it('uses local midnight for a future calendar day', () => {
    const now = new Date(2026, 6, 14, 16, 59, 0);
    const tomorrow = new Date(2026, 6, 15, 0, 0, 0);
    const result = normalizeAdministrationDateOpen(tomorrow, now);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });
});

describe('local day helpers', () => {
  it('startOfLocalDay zeroes the clock', () => {
    const d = startOfLocalDay(new Date(2026, 6, 14, 13, 45, 12));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('endOfLocalDay sets end-of-day', () => {
    const d = endOfLocalDay(new Date(2026, 6, 14, 13, 0, 0));
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
    expect(d.getMilliseconds()).toBe(999);
  });
});
