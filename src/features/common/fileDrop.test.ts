import { describe, expect, test } from 'vitest';
import { isImageFile, pickDroppedImage } from './fileDrop';

const file = (name: string, type: string) => new File([new Uint8Array([1, 2, 3])], name, { type });

describe('pickDroppedImage', () => {
  test('spec: first image among mixed files', () => {
    const r = pickDroppedImage([file('notes.txt', 'text/plain'), file('a.jpg', 'image/jpeg'), file('b.png', 'image/png')]);
    expect(r.kind === 'image' && r.file.name).toBe('a.jpg');
  });
  test('no image among dropped files', () => {
    expect(pickDroppedImage([file('plan.pdf', 'application/pdf')])).toEqual({ kind: 'no-image' });
  });
  test('empty drop', () => {
    expect(pickDroppedImage([])).toEqual({ kind: 'empty' });
    expect(pickDroppedImage(null)).toEqual({ kind: 'empty' });
  });
});

describe('isImageFile', () => {
  test('uses MIME type, falls back to extension when the type is missing', () => {
    expect(isImageFile(file('x.heic', ''))).toBe(true);
    expect(isImageFile(file('x.webp', 'image/webp'))).toBe(true);
    expect(isImageFile(file('x.decorplan', ''))).toBe(false);
    expect(isImageFile(file('x.jpg', 'application/pdf'))).toBe(false);
  });
});
