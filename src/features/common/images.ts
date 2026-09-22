/** Image import and a small cache of object URLs / decoded images for stored images. */
import { useEffect, useState } from 'react';
import type { Id } from '../../core/model';
import { repo } from '../../storage/repo';

export const MAX_IMAGE_EDGE = 3000;

export interface ImportedImage {
  id: Id;
  width: number;
  height: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), type, quality),
  );
}

/** Decode an image file. Modern browsers apply EXIF orientation when decoding <img>. */
export async function decodeFile(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // Keep the URL alive until decode completes; the element retains decoded pixels.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Import an image file: upright, downscaled to ≤ 3000 px long edge, stored as JPEG. */
export async function importImageFile(file: Blob): Promise<ImportedImage> {
  const img = await decodeFile(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
  const id = await repo.putImage({ mime: 'image/jpeg', width, height, bytes: await blob.arrayBuffer() });
  return { id, width, height };
}

/** Store an encoded blob (e.g. a rectified image). */
export async function storeBlob(blob: Blob, width: number, height: number): Promise<Id> {
  return repo.putImage({ mime: blob.type || 'image/jpeg', width, height, bytes: await blob.arrayBuffer() });
}

export { canvasToBlob };

// ---------------------------------------------------------------- cache

const urlCache = new Map<Id, Promise<string | null>>();
const elementCache = new Map<Id, Promise<HTMLImageElement | null>>();

export function imageUrl(id: Id): Promise<string | null> {
  let p = urlCache.get(id);
  if (!p) {
    p = repo.getImage(id).then((img) => (img ? URL.createObjectURL(new Blob([img.bytes], { type: img.mime })) : null));
    urlCache.set(id, p);
  }
  return p;
}

export function imageElement(id: Id): Promise<HTMLImageElement | null> {
  let p = elementCache.get(id);
  if (!p) {
    p = imageUrl(id).then(async (url) => {
      if (!url) return null;
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    });
    elementCache.set(id, p);
  }
  return p;
}

export function useImageUrl(id: Id | undefined): string | null {
  const [url, setUrl] = useState<{ id: Id; url: string | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void imageUrl(id).then((u) => alive && setUrl({ id, url: u }));
    return () => {
      alive = false;
    };
  }, [id]);
  return id && url?.id === id ? url.url : null;
}

export function useImageElement(id: Id | undefined): HTMLImageElement | null {
  const [el, setEl] = useState<{ id: Id; el: HTMLImageElement | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void imageElement(id).then((e) => alive && setEl({ id, el: e }));
    return () => {
      alive = false;
    };
  }, [id]);
  return id && el?.id === id ? el.el : null;
}

/** Trigger a file download. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'project';
}

/** Open a native file picker. */
export function pickFile(accept: string, capture = false): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.setAttribute('capture', 'environment');
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
