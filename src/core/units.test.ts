import { describe, expect, test } from 'vitest';
import { formatImperial, formatLength, formatLengthForInput, parseLength, parseLengthValidated } from './units';

describe('formatLength (metric)', () => {
  test('cm with at most 1 decimal', () => {
    expect(formatLength(1625, 'cm')).toBe('162.5 cm');
    expect(formatLength(500, 'cm')).toBe('50 cm');
    expect(formatLength(1234.56, 'cm')).toBe('123.5 cm');
  });
  test('mm with 0 decimals', () => {
    expect(formatLength(850.4, 'mm')).toBe('850 mm');
  });
  test('m with at most 3 decimals', () => {
    expect(formatLength(3200, 'm')).toBe('3.2 m');
    expect(formatLength(1625.4, 'm')).toBe('1.625 m');
  });
  test('input format is unitless for metric', () => {
    expect(formatLengthForInput(855, 'cm')).toBe('85.5');
  });
});

describe('formatImperial', () => {
  test('spec example: 850 mm -> 2\' 9 7/16"', () => {
    expect(formatLength(850, 'imperial')).toBe(`2' 9 7/16"`);
  });
  test('below a foot shows inches only', () => {
    expect(formatImperial(190.5)).toBe('7 1/2"');
    expect(formatImperial(3.175)).toBe('1/8"');
  });
  test('whole feet', () => {
    expect(formatImperial(304.8)).toBe(`1' 0"`);
  });
  test('rounds to nearest 1/16 and carries', () => {
    // 11.99" rounds to 12" -> 1' 0"
    expect(formatImperial(11.99 * 25.4)).toBe(`1' 0"`);
  });
  test('5\' 4 3/8"', () => {
    expect(formatImperial(1635.125)).toBe(`5' 4 3/8"`);
  });
});

describe('parseLength', () => {
  test('unitless uses current unit, comma decimal accepted', () => {
    expect(parseLength('85,5', 'cm')).toEqual({ ok: true, mm: 855 });
    expect(parseLength('85.5', 'cm')).toEqual({ ok: true, mm: 855 });
    expect(parseLength('850', 'mm')).toEqual({ ok: true, mm: 850 });
    expect(parseLength('3.2', 'm')).toEqual({ ok: true, mm: 3200 });
  });
  test('explicit unit overrides display unit', () => {
    expect(parseLength('850mm', 'cm')).toEqual({ ok: true, mm: 850 });
    expect(parseLength('85 cm', 'imperial')).toEqual({ ok: true, mm: 850 });
    expect(parseLength('1.2 m', 'cm')).toEqual({ ok: true, mm: 1200 });
  });
  test('imperial feet-inches with fraction', () => {
    const r = parseLength(`5' 4 3/8"`, 'cm');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mm).toBeCloseTo(1635.1, 1);
  });
  test('imperial variants', () => {
    const cases: [string, number][] = [
      ['33.5in', 33.5],
      ['33 1/2"', 33.5],
      ['1/2"', 0.5],
      [`2'`, 24],
      ['2 ft 3 in', 27],
      [`2'3"`, 27],
      ['5′ 4″', 64],
    ];
    for (const [input, inches] of cases) {
      const r = parseLength(input, 'cm');
      expect(r, input).toMatchObject({ ok: true });
      if (r.ok) expect(r.mm, input).toBeCloseTo(inches * 25.4, 6);
    }
  });
  test('unitless in imperial is inches', () => {
    const r = parseLength('33 1/2', 'imperial');
    expect(r.ok && r.mm).toBeCloseTo(33.5 * 25.4, 6);
    const r2 = parseLength('12', 'imperial');
    expect(r2.ok && r2.mm).toBeCloseTo(304.8, 6);
  });
  test('round-trips the imperial formatter', () => {
    for (const mm of [3.175, 190.5, 850, 1635.125, 3000]) {
      const text = formatImperial(mm);
      const r = parseLength(text, 'imperial');
      expect(r.ok && Math.abs(r.mm - mm) <= 25.4 / 32, text).toBe(true);
    }
  });
  test('unparseable input', () => {
    expect(parseLength('abc', 'cm')).toEqual({ ok: false, error: 'unparseable' });
    expect(parseLength('', 'cm')).toEqual({ ok: false, error: 'empty' });
    expect(parseLength('12 cm 3', 'cm')).toEqual({ ok: false, error: 'unparseable' });
    expect(parseLength('1/0"', 'cm')).toEqual({ ok: false, error: 'unparseable' });
  });
});

describe('parseLengthValidated', () => {
  test('rejects zero and negative sizes', () => {
    expect(parseLengthValidated('0', 'cm', { positive: true })).toEqual({ ok: false, error: 'not-positive' });
    expect(parseLengthValidated('-5', 'cm', { positive: true })).toEqual({ ok: false, error: 'not-positive' });
    expect(parseLengthValidated('-5', 'cm', { nonNegative: true })).toEqual({ ok: false, error: 'negative' });
    expect(parseLengthValidated('0', 'cm', { nonNegative: true })).toEqual({ ok: true, mm: 0 });
  });
});
