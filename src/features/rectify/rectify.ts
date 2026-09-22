/** Run rectification in a Web Worker (falls back to the main thread). */
import { rectifiedSize } from '../../core/homography';
import type { Id } from '../../core/model';
import { repo } from '../../storage/repo';
import { storeBlob } from '../common/images';
import { rectifyToBlob, type Quad, type RectifyRequest } from './rectifyCore';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve(b: Blob): void; reject(e: Error): void }>();

function getWorker(): Worker | null {
  if (typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined') return null;
  if (!worker) {
    worker = new Worker(new URL('../../workers/rectify.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { requestId, ok, blob, error } = e.data;
      const p = pending.get(requestId);
      pending.delete(requestId);
      if (ok) p?.resolve(blob);
      else p?.reject(new Error(error));
    };
  }
  return worker;
}

function run(req: RectifyRequest): Promise<Blob> {
  const w = getWorker();
  if (!w) return rectifyToBlob(req, (width, height) => Object.assign(document.createElement('canvas'), { width, height }));
  return new Promise((resolve, reject) => {
    const requestId = nextId++;
    pending.set(requestId, { resolve, reject });
    w.postMessage({ ...req, requestId });
  });
}

export interface RectifyOutput {
  blob: Blob;
  width: number;
  height: number;
}

export async function rectifyStoredImage(
  imageId: Id,
  corners: Quad,
  widthMm: number,
  heightMm: number,
  maxLongEdge = 3000,
): Promise<RectifyOutput> {
  const img = await repo.getImage(imageId);
  if (!img) throw new Error('Image not found');
  const size = rectifiedSize(corners, widthMm, heightMm, maxLongEdge);
  const blob = await run({
    bytes: img.bytes.slice(0),
    mime: img.mime,
    corners,
    width: size.width,
    height: size.height,
    quality: maxLongEdge < 1000 ? 0.8 : 0.9,
  });
  return { blob, ...size };
}

export async function rectifyAndStore(imageId: Id, corners: Quad, widthMm: number, heightMm: number): Promise<Id> {
  const out = await rectifyStoredImage(imageId, corners, widthMm, heightMm);
  return storeBlob(out.blob, out.width, out.height);
}
