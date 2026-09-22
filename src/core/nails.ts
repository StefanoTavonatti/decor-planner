/** Nail (hanging point) coordinates in wall space — shared by composer and PDF export. */
import type { Point } from './geometry';
import type { Hanging, Piece, Placement } from './model';

export function nailPositions(placement: Pick<Placement, 'xMm' | 'yMm'>, piece: Pick<Piece, 'widthMm' | 'heightMm' | 'hanging'>): Point[] {
  const cx = placement.xMm + piece.widthMm / 2;
  const y = placement.yMm + piece.heightMm - piece.hanging.offsetTopMm;
  if (piece.hanging.type === 1) return [{ x: cx, y }];
  const half = (piece.hanging.spacingMm ?? 0) / 2;
  return [
    { x: cx - half, y },
    { x: cx + half, y },
  ];
}

export type HangingError = 'offset-negative' | 'offset-too-large' | 'spacing-required' | 'spacing-too-large';

/** Validate a hanging config against the piece size. Returns the first error, or null. */
export function validateHanging(h: Hanging, widthMm: number, heightMm: number): HangingError | null {
  if (h.offsetTopMm < 0) return 'offset-negative';
  if (h.offsetTopMm > heightMm) return 'offset-too-large';
  if (h.type === 2) {
    if (h.spacingMm === undefined || !(h.spacingMm > 0)) return 'spacing-required';
    if (h.spacingMm > widthMm) return 'spacing-too-large';
  }
  return null;
}

export function hangingErrorMessage(e: HangingError): string {
  switch (e) {
    case 'offset-negative':
      return 'Offset cannot be negative';
    case 'offset-too-large':
      return 'Offset cannot be larger than the piece height';
    case 'spacing-required':
      return 'Enter the distance between the two hanging points';
    case 'spacing-too-large':
      return 'Spacing cannot be larger than the piece width';
  }
}
