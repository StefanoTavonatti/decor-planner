/// <reference lib="webworker" />
import { rectifyToBlob, type RectifyRequest } from '../features/rectify/rectifyCore';

self.onmessage = async (e: MessageEvent<RectifyRequest & { requestId: number }>) => {
  const { requestId, ...req } = e.data;
  try {
    const blob = await rectifyToBlob(req, (w, h) => new OffscreenCanvas(w, h));
    (self as unknown as Worker).postMessage({ requestId, ok: true, blob });
  } catch (err) {
    (self as unknown as Worker).postMessage({ requestId, ok: false, error: String(err) });
  }
};
