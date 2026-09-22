/**
 * PDF mounting plan: to-scale drawing with nail markers and dimension lines,
 * plus a table of nail coordinates. PDF space is y-up like wall space.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import { chooseScale, planRows, type PlanRow } from '../../core/composition';
import type { PaperSize, Piece, Project } from '../../core/model';
import { formatLength, type DisplayUnit } from '../../core/units';

const PT_PER_MM = 72 / 25.4;
const PAGE: Record<PaperSize, [number, number]> = { A4: [841.89, 595.28], Letter: [792, 612] }; // landscape, pt

const M = 12 * PT_PER_MM; // page margin
const HEADER_H = 17 * PT_PER_MM;
const FOOTER_H = 7 * PT_PER_MM;
const DIM_LEFT = 24 * PT_PER_MM; // space for Y labels
const DIM_BOTTOM = 14 * PT_PER_MM; // space for X labels
const ROW_H = 16;
const TABLE_HEAD_H = 20;

const INK = rgb(0.11, 0.1, 0.09);
const MUTED = rgb(0.45, 0.43, 0.41);
const LIGHT = rgb(0.82, 0.8, 0.77);
const NAIL = rgb(0.84, 0.12, 0.12);
const DIM = rgb(0.2, 0.45, 0.75);

export interface PdfOptions {
  project: Project;
  pieces: Map<string, Piece>;
  unit: DisplayUnit;
  paper: PaperSize;
  includePhoto: boolean;
  wallImage?: { bytes: Uint8Array; mime: string };
  date?: Date;
}

export interface PdfResult {
  bytes: Uint8Array;
  pageCount: number;
  scale: number;
  rows: PlanRow[];
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Replace characters the standard (WinAnsi) fonts cannot encode. */
function sanitizer(font: PDFFont) {
  const cache = new Map<string, boolean>();
  return (text: string) =>
    [...text]
      .map((ch) => {
        if (!cache.has(ch)) {
          try {
            font.encodeText(ch);
            cache.set(ch, true);
          } catch {
            cache.set(ch, false);
          }
        }
        return cache.get(ch) ? ch : '?';
      })
      .join('');
}

export async function buildMountingPlanPdf(o: PdfOptions): Promise<PdfResult> {
  const { project, unit } = o;
  const fmt = (mm: number) => formatLength(mm, unit);
  const doc = await PDFDocument.create();
  doc.setTitle(`${project.name} — mounting plan`);
  doc.setCreator('Decor Planner');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const clean = sanitizer(font);
  const [PW, PH] = PAGE[o.paper];
  const date = o.date ?? new Date();
  const rows = planRows(project, o.pieces);
  const W = project.wall.widthMm;
  const H = project.wall.heightMm;

  const text = (page: PDFPage, s: string, x: number, y: number, size: number, f = font, color = INK) =>
    page.drawText(clean(s), { x, y, size, font: f, color });
  const width = (s: string, size: number, f = font) => f.widthOfTextAtSize(clean(s), size);

  // Layout: drawing area on top, table below (continuing on further pages).
  const contentTop = PH - M - HEADER_H;
  const contentBottom = M + FOOTER_H;
  const avail = contentTop - contentBottom;
  const tableH = TABLE_HEAD_H + rows.length * ROW_H + 10;
  const tableReserve = Math.min(tableH, avail * 0.38);
  const areaW = PW - 2 * M - DIM_LEFT;
  const areaH = avail - tableReserve - DIM_BOTTOM;
  const scale = chooseScale(W, H, areaW / PT_PER_MM, areaH / PT_PER_MM);
  const k = PT_PER_MM / scale; // pt per wall mm
  const drawW = W * k;
  const drawH = H * k;
  // Wall drawing: centred horizontally, top-aligned under the header.
  const x0 = M + DIM_LEFT + (areaW - drawW) / 2;
  const wallBottom = contentTop - 6 - drawH;
  const X = (mm: number) => x0 + mm * k;
  const Y = (mm: number) => wallBottom + mm * k;

  const header = (page: PDFPage, continued: boolean) => {
    text(page, `${project.name}${continued ? ' (continued)' : ''} — Mounting plan`, M, PH - M - 14, 15, bold);
    const sub = `${date.toLocaleDateString()}  ·  Scale 1:${scale} (print at 100% / actual size on ${o.paper})  ·  Wall ${fmt(W)} × ${fmt(H)}`;
    text(page, sub, M, PH - M - 30, 9, font, MUTED);
  };
  const footer = (page: PDFPage, n: number) => {
    text(
      page,
      'All positions are measured from the floor and the left corner of the wall to the nail. Check the real wall size before drilling.',
      M,
      M,
      7.5,
      font,
      MUTED,
    );
    const p = `Page ${n}`;
    text(page, p, PW - M - width(p, 7.5), M, 7.5, font, MUTED);
  };

  let page = doc.addPage([PW, PH]);
  header(page, false);

  // Optional faded photo.
  if (o.includePhoto && o.wallImage) {
    const img = o.wallImage.mime === 'image/png' ? await doc.embedPng(o.wallImage.bytes) : await doc.embedJpg(o.wallImage.bytes);
    page.drawImage(img, { x: X(0), y: Y(0), width: drawW, height: drawH, opacity: 0.3 });
  }

  // Wall.
  page.drawRectangle({ x: X(0), y: Y(0), width: drawW, height: drawH, borderColor: INK, borderWidth: 1.2 });

  // Obstacles (hatched).
  for (const ob of project.obstacles) {
    const ox = X(ob.xMm);
    const oy = Y(ob.yMm);
    const ow = ob.widthMm * k;
    const oh = ob.heightMm * k;
    page.drawRectangle({ x: ox, y: oy, width: ow, height: oh, color: rgb(0.93, 0.92, 0.9), borderColor: MUTED, borderWidth: 0.6, borderDashArray: [3, 2] });
    const step = 5;
    for (let c = -oh; c < ow; c += step) {
      const t0 = Math.max(0, -c);
      const t1 = Math.min(oh, ow - c);
      if (t1 > t0) page.drawLine({ start: { x: ox + c + t0, y: oy + t0 }, end: { x: ox + c + t1, y: oy + t1 }, thickness: 0.3, color: LIGHT });
    }
    const label = ob.name;
    const size = Math.min(8, oh * 0.4);
    if (size > 3) text(page, label, ox + ow / 2 - width(label, size, bold) / 2, oy + oh / 2 - size / 3, size, bold, MUTED);
  }

  // Pieces.
  for (const r of rows) {
    const piece = o.pieces.get(project.placements.find((p) => p.id === r.placementId)!.pieceId)!;
    const px = X(r.rect.x);
    const py = Y(r.rect.y);
    const pw = r.rect.width * k;
    const ph = r.rect.height * k;
    page.drawRectangle({
      x: px,
      y: py,
      width: pw,
      height: ph,
      color: r.isPlaceholder ? hexToRgb(piece.color) : rgb(1, 1, 1),
      opacity: r.isPlaceholder ? 0.35 : 0.85,
      borderColor: INK,
      borderWidth: 0.9,
    });
    const num = String(r.number);
    const radius = Math.max(4, Math.min(8, Math.min(pw, ph) / 4));
    const cx = px + pw / 2;
    const cy = py + ph / 2;
    page.drawCircle({ x: cx, y: cy, size: radius, color: INK });
    const ns = radius * 1.1;
    text(page, num, cx - width(num, ns, bold) / 2, cy - ns / 2.8, ns, bold, rgb(1, 1, 1));
    const nameSize = Math.min(6.5, pw / 10);
    if (nameSize >= 4 && ph > radius * 2 + nameSize * 2.5) {
      let name = r.name;
      while (name.length > 3 && width(name, nameSize) > pw - 4) name = name.slice(0, -2) + '…';
      text(page, name, cx - width(name, nameSize) / 2, cy - radius - nameSize - 2, nameSize, font, MUTED);
    }
  }

  // Dimension lines from floor and left edge to each nail; labels along the axes.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of rows) {
    for (const n of r.nails) {
      const nx = X(n.x);
      const ny = Y(n.y);
      page.drawLine({ start: { x: nx, y: Y(0) }, end: { x: nx, y: ny }, thickness: 0.35, color: DIM, dashArray: [2, 2], opacity: 0.8 });
      page.drawLine({ start: { x: X(0), y: ny }, end: { x: nx, y: ny }, thickness: 0.35, color: DIM, dashArray: [2, 2], opacity: 0.8 });
      xs.push(n.x);
      ys.push(n.y);
    }
  }
  const uniq = (v: number[]) => [...new Set(v.map((x) => Math.round(x * 10) / 10))].sort((a, b) => a - b);
  // X labels below the wall, staggered in rows to avoid overlaps.
  const xRowsEnd: number[] = [];
  for (const v of uniq(xs)) {
    const label = fmt(v);
    const lw = width(label, 7);
    const cx = X(v);
    let row = 0;
    while (xRowsEnd[row] !== undefined && xRowsEnd[row] > cx - lw / 2 - 2) row++;
    xRowsEnd[row] = cx + lw / 2;
    const ly = Y(0) - 10 - row * 10;
    page.drawLine({ start: { x: cx, y: Y(0) }, end: { x: cx, y: ly + 7 }, thickness: 0.4, color: DIM });
    text(page, label, cx - lw / 2, ly, 7, font, DIM);
  }
  // Y labels left of the wall, staggered in columns.
  const yColsEnd: number[] = [];
  for (const v of uniq(ys)) {
    const label = fmt(v);
    const lw = width(label, 7);
    const cy = Y(v);
    let col = 0;
    while (yColsEnd[col] !== undefined && yColsEnd[col] > cy - 5) col++;
    yColsEnd[col] = cy + 5;
    const lx = X(0) - 4 - lw - col * (lw + 6);
    page.drawLine({ start: { x: lx + lw + 1, y: cy }, end: { x: X(0), y: cy }, thickness: 0.4, color: DIM });
    text(page, label, lx, cy - 2.5, 7, font, DIM);
  }
  // Nail markers on top.
  for (const r of rows) {
    for (const n of r.nails) {
      const nx = X(n.x);
      const ny = Y(n.y);
      page.drawCircle({ x: nx, y: ny, size: 2.2, borderColor: NAIL, borderWidth: 0.8, color: rgb(1, 1, 1) });
      page.drawLine({ start: { x: nx - 4, y: ny }, end: { x: nx + 4, y: ny }, thickness: 0.8, color: NAIL });
      page.drawLine({ start: { x: nx, y: ny - 4 }, end: { x: nx, y: ny + 4 }, thickness: 0.8, color: NAIL });
    }
  }
  // Origin marker.
  text(page, 'origin', X(0) - width('origin', 6) - 2, Y(0) - 8, 6, font, MUTED);

  // Table.
  const cols = [
    { title: '#', w: 22 },
    { title: 'Piece', w: 190 },
    { title: 'Size (W × H)', w: 120 },
    { title: 'Nail from left', w: 150 },
    { title: 'Nail from floor', w: 100 },
    { title: 'Top edge from floor', w: 110 },
  ];
  let pageNo = 1;
  // Table starts below the X-axis labels.
  let y = Y(0) - 14 - xRowsEnd.length * 10;
  const drawHead = () => {
    let x = M;
    page.drawRectangle({ x: M, y: y - TABLE_HEAD_H + 4, width: PW - 2 * M, height: TABLE_HEAD_H - 2, color: rgb(0.95, 0.94, 0.92) });
    for (const c of cols) {
      text(page, c.title, x + 4, y - TABLE_HEAD_H + 10, 8, bold);
      x += c.w;
    }
    y -= TABLE_HEAD_H;
  };
  if (y - TABLE_HEAD_H - ROW_H < contentBottom) {
    footer(page, pageNo++);
    page = doc.addPage([PW, PH]);
    header(page, true);
    y = contentTop - 4;
  }
  drawHead();
  for (const r of rows) {
    if (y - ROW_H < contentBottom) {
      footer(page, pageNo++);
      page = doc.addPage([PW, PH]);
      header(page, true);
      y = contentTop - 4;
      drawHead();
    }
    const cells = [
      String(r.number),
      r.name + (r.isPlaceholder ? ' (placeholder)' : ''),
      `${fmt(r.widthMm)} × ${fmt(r.heightMm)}`,
      r.nails.map((n) => fmt(n.x)).join('  and  '),
      fmt(r.nails[0].y),
      fmt(r.topEdgeMm),
    ];
    let x = M;
    cells.forEach((c, i) => {
      let s = c;
      const size = 8.5;
      while (s.length > 3 && width(s, size) > cols[i].w - 8) s = s.slice(0, -2) + '…';
      text(page, s, x + 4, y - ROW_H + 5, size, i === 0 || i >= 3 ? bold : font);
      x += cols[i].w;
    });
    page.drawLine({ start: { x: M, y: y - ROW_H + 1 }, end: { x: PW - M, y: y - ROW_H + 1 }, thickness: 0.3, color: LIGHT });
    y -= ROW_H;
  }
  if (rows.length === 0) text(page, 'No pieces placed.', M + 4, y - ROW_H + 5, 8.5, font, MUTED);
  footer(page, pageNo);

  return { bytes: await doc.save(), pageCount: doc.getPageCount(), scale, rows };
}
