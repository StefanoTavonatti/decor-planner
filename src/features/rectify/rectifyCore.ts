/** Rectification pipeline shared by the worker and the main-thread fallback. */
import type { Point } from '../../core/geometry';
import { warpQuadToRect } from '../../core/warp';

export type Quad = [Point, Point, Point, Point];

export interface RectifyRequest {
  bytes: ArrayBuffer;
  mime: string;
  corners: Quad;
  width: number;
  height: number;
  quality: number;
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

async function toBlob(c: AnyCanvas, quality: number): Promise<Blob> {
  if ('convertToBlob' in c) return c.convertToBlob({ type: 'image/jpeg', quality });
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', quality));
}

export async function rectifyToBlob(req: RectifyRequest, makeCanvas: (w: number, h: number) => AnyCanvas): Promise<Blob> {
  const bmp = await createImageBitmap(new Blob([req.bytes], { type: req.mime }));
  const src = makeCanvas(bmp.width, bmp.height);
  const sctx = src.getContext('2d') as Ctx;
  sctx.drawImage(bmp, 0, 0);
  const pixels = sctx.getImageData(0, 0, bmp.width, bmp.height);
  bmp.close();

  const out = warpQuadToRect(pixels, req.corners, req.width, req.height);
  const warped = makeCanvas(req.width, req.height);
  (warped.getContext('2d') as Ctx).putImageData(new ImageData(out.data as Uint8ClampedArray<ArrayBuffer>, req.width, req.height), 0, 0);
  // JPEG has no alpha: composite onto white.
  const final = makeCanvas(req.width, req.height);
  const fctx = final.getContext('2d') as Ctx;
  fctx.fillStyle = '#fff';
  fctx.fillRect(0, 0, req.width, req.height);
  fctx.drawImage(warped as CanvasImageSource, 0, 0);
  return toBlob(final, req.quality);
}
