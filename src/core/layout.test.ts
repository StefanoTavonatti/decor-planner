import { describe, expect, test } from 'vitest';
import { align, centerHorizontallyOn, centerVerticallyAt, distribute } from './layout';

const items = [
  { id: 'a', rect: { x: 0, y: 1200, width: 300, height: 400 } },
  { id: 'b', rect: { x: 500, y: 1400, width: 200, height: 500 } },
  { id: 'c', rect: { x: 1100, y: 1300, width: 400, height: 300 } },
  { id: 'd', rect: { x: 1800, y: 1250, width: 200, height: 200 } },
];

describe('layout', () => {
  test('align top', () => {
    const p = align(items, 'top');
    for (const i of items) expect(p.get(i.id)!.y + i.rect.height).toBe(1900);
  });
  test('align left / hcenter', () => {
    expect(align(items, 'left').get('c')!.x).toBe(0);
    expect(align(items, 'hcenter').get('a')!.x).toBe(1000 - 150);
  });
  test('spec: distribute horizontally keeps outer items and equalises gaps', () => {
    const p = distribute(items, 'x');
    expect(p.get('a')!.x).toBe(0);
    expect(p.get('d')!.x).toBe(1800);
    const gaps = [
      p.get('b')!.x - 300,
      p.get('c')!.x - (p.get('b')!.x + 200),
      1800 - (p.get('c')!.x + 400),
    ];
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0]);
  });
  test('spec: centre group on eye level keeps relative positions', () => {
    const group = [
      { id: 'x', rect: { x: 0, y: 1200, width: 100, height: 300 } },
      { id: 'y', rect: { x: 200, y: 1500, width: 100, height: 400 } }, // bbox 1200..1900
    ];
    const p = centerVerticallyAt(group, 1450);
    expect(p.get('x')!.y).toBe(1100);
    expect(p.get('y')!.y).toBe(1400);
  });
  test('spec: centre over sofa', () => {
    const sofa = { x: 500, y: 0, width: 2200, height: 850 };
    const p = centerHorizontallyOn(items.slice(0, 2), sofa); // bbox 0..700, centre 350
    expect(p.get('a')!.x).toBe(1600 - 350);
  });
});
