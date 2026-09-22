/** Render a composition (wall + pieces, no editing overlays) to a 2D canvas. */
import type { Piece, Project } from '../../core/model';
import { canvasToBlob, imageElement } from '../common/images';

export async function renderComposition(
  project: Project,
  pieces: Map<string, Piece>,
  maxLongEdgePx: number,
): Promise<HTMLCanvasElement> {
  const { widthMm, heightMm } = project.wall;
  const scale = maxLongEdgePx / Math.max(widthMm, heightMm);
  const W = Math.max(1, Math.round(widthMm * scale));
  const H = Math.max(1, Math.round(heightMm * scale));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ece8e1';
  ctx.fillRect(0, 0, W, H);
  if (project.wall.imageId) {
    const bg = await imageElement(project.wall.imageId);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
  }

  const images = await Promise.all(
    project.placements.map(async (pl) => {
      const piece = pieces.get(pl.pieceId);
      return piece?.imageId ? imageElement(piece.imageId) : null;
    }),
  );

  project.placements.forEach((pl, i) => {
    const piece = pieces.get(pl.pieceId);
    if (!piece) return;
    const x = pl.xMm * scale;
    const y = (heightMm - pl.yMm - piece.heightMm) * scale;
    const w = piece.widthMm * scale;
    const h = piece.heightMm * scale;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = Math.max(2, 12 * scale * 10);
    ctx.shadowOffsetY = Math.max(1, 4 * scale * 10);
    const img = images[i];
    if (img) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      ctx.fillStyle = piece.color;
      ctx.fillRect(x, y, w, h);
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = Math.max(1, scale * 3);
      ctx.strokeRect(x, y, w, h);
      const fontPx = Math.max(8, Math.min(w, h) / 8);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.font = `${fontPx}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(piece.name, x + w / 2, y + h / 2, w * 0.9);
    }
    ctx.restore();
  });
  return canvas;
}

export async function renderCompositionPng(project: Project, pieces: Map<string, Piece>, maxLongEdgePx: number) {
  const canvas = await renderComposition(project, pieces, maxLongEdgePx);
  return { blob: await canvasToBlob(canvas, 'image/png'), width: canvas.width, height: canvas.height };
}
