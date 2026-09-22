/**
 * Four-corner perspective correction: drag handles onto the corners of the
 * real rectangle, enter its real size, preview the flattened result, confirm.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Point } from '../../core/geometry';
import { isValidQuad } from '../../core/homography';
import type { Id } from '../../core/model';
import { LengthInput } from '../common/LengthInput';
import { storeBlob, useImageElement } from '../common/images';
import { Modal, withErrorAlert } from '../common/ui';
import { rectifyStoredImage } from './rectify';
import type { Quad } from './rectifyCore';

export interface RectifyResult {
  originalImageId: Id;
  corners: Quad;
  widthMm: number;
  heightMm: number;
  rectifiedImageId: Id;
}

interface Props {
  title: string;
  imageId: Id;
  initialCorners?: Quad;
  /** 'inset' for angled photos, 'full' for already-flat images (crop). */
  initialMode?: 'inset' | 'full';
  initialWidthMm?: number;
  initialHeightMm?: number;
  widthLabel?: string;
  heightLabel?: string;
  onConfirm(r: RectifyResult): void;
  onCancel(): void;
}

const HANDLE_NAMES = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
const LOUPE_SIZE = 140;
const LOUPE_ZOOM = 3;

function defaultCorners(w: number, h: number, mode: 'inset' | 'full'): Quad {
  // Even for flat images keep a small inset so handles on the image edge stay grabbable.
  const i = mode === 'inset' ? 0.12 : 0.03;
  return [
    { x: w * i, y: h * i },
    { x: w * (1 - i), y: h * i },
    { x: w * (1 - i), y: h * (1 - i) },
    { x: w * i, y: h * (1 - i) },
  ];
}

export function RectifyEditor(props: Props) {
  const img = useImageElement(props.imageId);
  const [edited, setCorners] = useState<Quad | null>(props.initialCorners ?? null);
  const corners = edited ?? (img ? defaultCorners(img.naturalWidth, img.naturalHeight, props.initialMode ?? 'inset') : null);
  const [widthMm, setWidthMm] = useState(props.initialWidthMm);
  const [heightMm, setHeightMm] = useState(props.initialHeightMm);
  const [preview, setPreview] = useState<{ url: string; blob: Blob; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview.url)), [preview]);

  const valid = corners !== null && isValidQuad(corners, 100);
  const canPreview = valid && widthMm !== undefined && heightMm !== undefined;

  const runPreview = () =>
    withErrorAlert('Could not straighten the image', async () => {
      if (!corners || !widthMm || !heightMm) return;
      setBusy(true);
      try {
        const out = await rectifyStoredImage(props.imageId, corners, widthMm, heightMm);
        setPreview({ url: URL.createObjectURL(out.blob), ...out });
      } finally {
        setBusy(false);
      }
    });

  const confirm = () =>
    withErrorAlert('Could not save the image', async () => {
      if (!preview || !corners || !widthMm || !heightMm) return;
      setBusy(true);
      try {
        const rectifiedImageId = await storeBlob(preview.blob, preview.width, preview.height);
        props.onConfirm({ originalImageId: props.imageId, corners, widthMm, heightMm, rectifiedImageId });
      } finally {
        setBusy(false);
      }
    });

  return (
    <Modal
      title={props.title}
      onClose={props.onCancel}
      fullscreen
      footer={
        preview ? (
          <>
            <button className="btn" onClick={() => setPreview(null)} disabled={busy}>
              Adjust corners
            </button>
            <button className="btn btn-primary" onClick={confirm} disabled={busy}>
              {busy ? 'Saving…' : 'Use this'}
            </button>
          </>
        ) : (
          <>
            <div className="rectify-dims">
              <LengthInput
                label={props.widthLabel ?? 'Real width'}
                value={widthMm}
                onChange={setWidthMm}
                constraint={{ positive: true }}
                required
                compact
              />
              <LengthInput
                label={props.heightLabel ?? 'Real height'}
                value={heightMm}
                onChange={setHeightMm}
                constraint={{ positive: true }}
                required
                compact
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={runPreview}
              disabled={!canPreview || busy}
              title={!valid ? 'The corners do not form a valid shape' : undefined}
            >
              {busy ? 'Working…' : 'Preview'}
            </button>
          </>
        )
      }
    >
      {preview ? (
        <div className="rectify-preview">
          <img src={preview.url} alt="Straightened result" />
          <p className="hint">Check that edges look straight. Adjust the corners if needed.</p>
        </div>
      ) : img && corners ? (
        <>
          <p className="hint">
            Drag the four handles onto the corners of the {props.widthLabel ? 'wall' : 'frame'}, then enter its real size.
          </p>
          <CornerCanvas img={img} corners={corners} onChange={setCorners} valid={valid} />
          {!valid && (
            <p className="field-message" role="alert">
              The corners cross or form an invalid shape. Move them to the four corners in order.
            </p>
          )}
        </>
      ) : (
        <p>Loading image…</p>
      )}
    </Modal>
  );
}

function CornerCanvas({
  img,
  corners,
  onChange,
  valid,
}: {
  img: HTMLImageElement;
  corners: Quad;
  onChange(q: Quad): void;
  valid: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = box.w && box.h ? Math.min(box.w / iw, box.h / ih) : 0;
  const ox = (box.w - iw * scale) / 2;
  const oy = (box.h - ih * scale) / 2;
  const toScreen = (p: Point) => ({ x: ox + p.x * scale, y: oy + p.y * scale });

  const pointerToImage = (e: React.PointerEvent): Point => {
    const r = boxRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(iw, (e.clientX - r.left - ox) / scale)),
      y: Math.max(0, Math.min(ih, (e.clientY - r.top - oy) / scale)),
    };
  };

  // Loupe rendering.
  useEffect(() => {
    const c = loupeRef.current;
    if (drag === null || !c || !scale) return;
    const ctx = c.getContext('2d')!;
    const p = corners[drag];
    const srcSize = LOUPE_SIZE / (scale * LOUPE_ZOOM);
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, p.x - srcSize / 2, p.y - srcSize / 2, srcSize, srcSize, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.strokeStyle = '#ff3b6b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LOUPE_SIZE / 2, 0);
    ctx.lineTo(LOUPE_SIZE / 2, LOUPE_SIZE);
    ctx.moveTo(0, LOUPE_SIZE / 2);
    ctx.lineTo(LOUPE_SIZE, LOUPE_SIZE / 2);
    ctx.stroke();
  }, [drag, corners, img, scale]);

  const pts = corners.map(toScreen);
  // Put the loupe in the corner away from the dragged handle.
  const loupeLeft = drag !== null && pts[drag].x < box.w / 2 ? box.w - LOUPE_SIZE - 8 : 8;

  return (
    <div className="corner-canvas" ref={boxRef}>
      {scale > 0 && (
        <>
          <img
            src={img.src}
            alt=""
            draggable={false}
            style={{ position: 'absolute', left: ox, top: oy, width: iw * scale, height: ih * scale }}
          />
          <svg
            width={box.w}
            height={box.h}
            style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
            onPointerMove={(e) => {
              if (drag === null) return;
              const next = [...corners] as Quad;
              next[drag] = pointerToImage(e);
              onChange(next);
            }}
            onPointerUp={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
          >
            <polygon
              points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
              className={`quad ${valid ? '' : 'quad-invalid'}`}
            />
            {pts.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={24}
                  className="handle-hit"
                  aria-label={`${HANDLE_NAMES[i]} corner`}
                  onPointerDown={(e) => {
                    (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId);
                    setDrag(i);
                  }}
                />
                <circle cx={p.x} cy={p.y} r={9} className={`handle ${drag === i ? 'handle-active' : ''}`} />
              </g>
            ))}
          </svg>
          {drag !== null && (
            <canvas ref={loupeRef} className="loupe" width={LOUPE_SIZE} height={LOUPE_SIZE} style={{ left: loupeLeft }} />
          )}
        </>
      )}
    </div>
  );
}
