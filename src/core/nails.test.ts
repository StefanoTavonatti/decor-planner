import { describe, expect, test } from 'vitest';
import { nailPositions, validateHanging } from './nails';

describe('nailPositions', () => {
  test('spec: single hanging point', () => {
    const piece = { widthMm: 400, heightMm: 500, hanging: { type: 1 as const, offsetTopMm: 60 } };
    expect(nailPositions({ xMm: 650, yMm: 1180 }, piece)).toEqual([{ x: 850, y: 1620 }]);
  });
  test('spec: two hanging points', () => {
    const piece = { widthMm: 1000, heightMm: 700, hanging: { type: 2 as const, offsetTopMm: 100, spacingMm: 600 } };
    expect(nailPositions({ xMm: 1500, yMm: 950 }, piece)).toEqual([
      { x: 1700, y: 1550 },
      { x: 2300, y: 1550 },
    ]);
  });
  test('default hanging is top centre', () => {
    const piece = { widthMm: 400, heightMm: 500, hanging: { type: 1 as const, offsetTopMm: 0 } };
    expect(nailPositions({ xMm: 0, yMm: 0 }, piece)).toEqual([{ x: 200, y: 500 }]);
  });
});

describe('validateHanging', () => {
  test('spacing too large', () => {
    expect(validateHanging({ type: 2, offsetTopMm: 80, spacingMm: 700 }, 600, 800)).toBe('spacing-too-large');
  });
  test('offset too large', () => {
    expect(validateHanging({ type: 1, offsetTopMm: 900 }, 600, 800)).toBe('offset-too-large');
  });
  test('two points need a positive spacing', () => {
    expect(validateHanging({ type: 2, offsetTopMm: 0 }, 600, 800)).toBe('spacing-required');
    expect(validateHanging({ type: 2, offsetTopMm: 0, spacingMm: 0 }, 600, 800)).toBe('spacing-required');
  });
  test('valid D-rings', () => {
    expect(validateHanging({ type: 2, offsetTopMm: 80, spacingMm: 400 }, 600, 800)).toBeNull();
  });
});
