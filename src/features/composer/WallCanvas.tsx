/**
 * To-scale wall editor (Konva). Content is drawn in a group scaled to mm with a
 * y-down wall frame; overlays (guides, labels, nails) are drawn in screen pixels.
 */
import type Konva from 'konva';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Image as KImage, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { compositionWarnings, obstacleRect, placementRect } from '../../core/composition';
import { boundingBox, fitViewport, overlaps, rectToView, worldToView, type Rect as WRect, type Viewport } from '../../core/geometry';
import type { Id, Obstacle, Piece, Placement } from '../../core/model';
import { nailPositions } from '../../core/nails';
import { neighbourGaps, snap, type Guide } from '../../core/snapping';
import { piecesMap, useEditor, useLibrary, useSettings } from '../../app/stores';
import { useImageElement } from '../common/images';
import { useFormatLength } from '../common/LengthInput';
import { useViewCommands } from './viewCommands';

const SNAP_PX = 8;
const COLORS = {
  select: '#2563eb',
  warn: '#dc2626',
  guide: '#ec4899',
  gap: '#0ea5e9',
  eye: '#f59e0b',
  nail: '#dc2626',
};

type VP = Omit<Viewport, 'wallHeightMm'>;

interface DragState {
  ids: Id[];
  starts: Map<Id, { x: number; y: number }>;
  anchorStart: { x: number; y: number };
  bbox0: WRect;
  others: WRect[];
}

function useHatchPattern(): HTMLCanvasElement {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 10;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(120,113,108,0.18)';
    ctx.fillRect(0, 0, 10, 10);
    ctx.strokeStyle = 'rgba(87,83,78,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(10, 0);
    ctx.moveTo(-5, 5);
    ctx.lineTo(5, -5);
    ctx.moveTo(5, 15);
    ctx.lineTo(15, 5);
    ctx.stroke();
    return c;
  }, []);
}

export function WallCanvas() {
  const project = useEditor((s) => s.project)!;
  const selection = useEditor((s) => s.selection);
  const libraryPieces = useLibrary((s) => s.pieces);
  const settings = useSettings((s) => s.settings);
  const fmt = useFormatLength();
  const cmd = useViewCommands((s) => s.cmd);
  const hatch = useHatchPattern();

  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [vp, setVp] = useState<VP | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [dragging, setDragging] = useState<Id | null>(null);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | { kind: 'pan'; start: { x: number; y: number }; vp0: VP; moved: boolean }
    | { kind: 'pinch'; dist0: number; center0: { x: number; y: number }; vp0: VP }
    | { kind: 'marquee'; additive: boolean }
    | null
  >(null);
  const spaceDown = useRef(false);

  const W = project.wall.widthMm;
  const H = project.wall.heightMm;
  const pieces = useMemo(() => piecesMap(libraryPieces), [libraryPieces]);

  useLayoutEffect(() => {
    const el = boxRef.current!;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasSize = size.w > 0 && size.h > 0;
  const fitScale = hasSize ? fitViewport(W, H, size.w, size.h, 48).scale : 1;
  const clampScale = (s: number) => Math.max(fitScale * 0.25, Math.min(8, s));
  const zoomed = (v: VP, factor: number, at: { x: number; y: number }): VP => {
    const scale = clampScale(v.scale * factor);
    const k = scale / v.scale;
    return { scale, offsetX: at.x - (at.x - v.offsetX) * k, offsetY: at.y - (at.y - v.offsetY) * k };
  };

  // Apply toolbar commands (fit / zoom) and fit on first layout — adjusted during render.
  const [applied, setApplied] = useState<{ n: number; projectId: string } | null>(null);
  if (hasSize && (applied?.n !== cmd.n || applied.projectId !== project.id)) {
    setApplied({ n: cmd.n, projectId: project.id });
    if (cmd.type === 'fit' || !vp || applied?.projectId !== project.id) {
      const f = fitViewport(W, H, size.w, size.h, 48);
      setVp({ scale: f.scale, offsetX: f.offsetX, offsetY: f.offsetY });
    } else {
      setVp(zoomed(vp, cmd.type === 'in' ? 1.25 : 0.8, { x: size.w / 2, y: size.h / 2 }));
    }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => e.code === 'Space' && (spaceDown.current = true);
    const up = (e: KeyboardEvent) => e.code === 'Space' && (spaceDown.current = false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const zoomAt = (factor: number, at: { x: number; y: number }) => setVp((v) => (v ? zoomed(v, factor, at) : v));

  const view: Viewport | null = vp ? { ...vp, wallHeightMm: H } : null;

  const itemRects = useMemo(() => {
    const m = new Map<Id, { rect: WRect; kind: 'placement' | 'obstacle' }>();
    for (const pl of project.placements) {
      const piece = pieces.get(pl.pieceId);
      if (piece) m.set(pl.id, { rect: placementRect(pl, piece), kind: 'placement' });
    }
    for (const o of project.obstacles) m.set(o.id, { rect: obstacleRect(o), kind: 'obstacle' });
    return m;
  }, [project.placements, project.obstacles, pieces]);

  const warnings = useMemo(() => new Set(compositionWarnings(project, pieces).map((w) => w.placementId)), [project, pieces]);

  // ------------------------------------------------------------- item drag

  const select = useEditor.getState().select;
  const toggleSelect = useEditor.getState().toggleSelect;

  const onItemPointerDown = (id: Id, e: Konva.KonvaEventObject<PointerEvent>) => {
    e.cancelBubble = true;
    const sel = useEditor.getState().selection;
    if (e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey) toggleSelect(id);
    else if (!sel.includes(id)) select([id]);
  };

  const onDragStart = (id: Id, e: Konva.KonvaEventObject<DragEvent>) => {
    if (pointers.current.size > 1) {
      e.target.stopDrag();
      return;
    }
    const st = useEditor.getState();
    const p = st.project!;
    const sel = st.selection.includes(id) ? st.selection : [id];
    const locked = new Set(p.placements.filter((pl) => pl.locked).map((pl) => pl.id));
    const ids = sel.filter((x) => !locked.has(x) && itemRects.has(x));
    const starts = new Map(ids.map((x) => [x, { x: itemRects.get(x)!.rect.x, y: itemRects.get(x)!.rect.y }]));
    const bbox0 = boundingBox(ids.map((x) => itemRects.get(x)!.rect))!;
    const others = [...itemRects.entries()].filter(([x]) => !ids.includes(x)).map(([, v]) => v.rect);
    dragRef.current = { ids, starts, anchorStart: { x: e.target.x(), y: e.target.y() }, bbox0, others };
    st.beginGesture();
    setDragging(id);
  };

  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const d = dragRef.current;
    if (!d || !vp) return;
    let dx = Math.round(e.target.x() - d.anchorStart.x);
    let dy = Math.round(-(e.target.y() - d.anchorStart.y));
    let g: Guide[] = [];
    if (settings.snapping && !e.evt.altKey) {
      const r = snap({
        moving: { ...d.bbox0, x: d.bbox0.x + dx, y: d.bbox0.y + dy },
        others: d.others,
        wall: { width: W, height: H },
        eyeLevelMm: project.eyeLevelMm,
        threshold: SNAP_PX / vp.scale,
      });
      dx = r.x - d.bbox0.x;
      dy = r.y - d.bbox0.y;
      g = r.guides;
    }
    e.target.position({ x: d.anchorStart.x + dx, y: d.anchorStart.y - dy });
    setGuides(g);
    useEditor.getState().updateGesture((draft) => {
      for (const item of [...draft.placements, ...draft.obstacles]) {
        const s = d.starts.get(item.id);
        if (s) {
          item.xMm = s.x + dx;
          item.yMm = s.y + dy;
        }
      }
    });
  };

  const onDragEnd = () => {
    dragRef.current = null;
    setGuides([]);
    setDragging(null);
    useEditor.getState().endGesture();
  };

  // ------------------------------------------------------------- stage pan / pinch / marquee

  const stagePoint = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: e.evt.clientX - r.left, y: e.evt.clientY - r.top };
  };

  const isBackground = (t: Konva.Node) => t === t.getStage() || t.name() === 'background';

  const onStagePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const p = stagePoint(e);
    pointers.current.set(e.evt.pointerId, p);
    if (!vp) return;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        kind: 'pinch',
        dist0: Math.hypot(a.x - b.x, a.y - b.y),
        center0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        vp0: vp,
      };
      e.target.getStage()?.find('.item').forEach((n) => n.isDragging() && n.stopDrag());
      return;
    }
    if (!isBackground(e.target)) return;
    const mousePan = e.evt.pointerType === 'mouse' && (e.evt.button === 1 || spaceDown.current);
    if (e.evt.pointerType !== 'mouse' || mousePan) {
      gesture.current = { kind: 'pan', start: p, vp0: vp, moved: false };
    } else {
      const additive = e.evt.shiftKey || e.evt.metaKey;
      if (!additive) select([]);
      gesture.current = { kind: 'marquee', additive };
      setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    }
  };

  const onStagePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (!pointers.current.has(e.evt.pointerId)) return;
    const p = stagePoint(e);
    pointers.current.set(e.evt.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pan') {
      const dx = p.x - g.start.x;
      const dy = p.y - g.start.y;
      if (Math.hypot(dx, dy) > 4) g.moved = true;
      setVp({ ...g.vp0, offsetX: g.vp0.offsetX + dx, offsetY: g.vp0.offsetY + dy });
    } else if (g.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scale = clampScale((g.vp0.scale * dist) / g.dist0);
      const k = scale / g.vp0.scale;
      setVp({
        scale,
        offsetX: center.x - (g.center0.x - g.vp0.offsetX) * k,
        offsetY: center.y - (g.center0.y - g.vp0.offsetY) * k,
      });
    } else if (g.kind === 'marquee') {
      setMarquee((m) => (m ? { ...m, x1: p.x, y1: p.y } : m));
    }
  };

  const onStagePointerUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
    pointers.current.delete(e.evt.pointerId);
    const g = gesture.current;
    if (g?.kind === 'pan' && !g.moved && e.evt.pointerType !== 'mouse') select([]);
    if (g?.kind === 'marquee' && marquee && view) {
      const box = {
        x: Math.min(marquee.x0, marquee.x1),
        y: Math.min(marquee.y0, marquee.y1),
        width: Math.abs(marquee.x1 - marquee.x0),
        height: Math.abs(marquee.y1 - marquee.y0),
      };
      if (box.width > 3 || box.height > 3) {
        const hit = [...itemRects.entries()]
          .filter(([, v]) => overlaps(rectToView(view, v.rect), box, 0))
          .map(([id]) => id);
        const current = useEditor.getState().selection;
        select(g.additive ? [...new Set([...current, ...hit])] : hit);
      }
      setMarquee(null);
    }
    if (pointers.current.size < 2 && g?.kind === 'pinch') gesture.current = null;
    else if (pointers.current.size === 0) gesture.current = null;
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const r = boxRef.current!.getBoundingClientRect();
    const at = { x: e.evt.clientX - r.left, y: e.evt.clientY - r.top };
    if (e.evt.ctrlKey || e.evt.metaKey) {
      zoomAt(Math.exp(-e.evt.deltaY * 0.01), at);
    } else {
      setVp((v) => (v ? { ...v, offsetX: v.offsetX - e.evt.deltaX, offsetY: v.offsetY - e.evt.deltaY } : v));
    }
  };

  // ------------------------------------------------------------- eye level drag

  const onEyeDragStart = () => useEditor.getState().beginGesture();
  const onEyeDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!view) return;
    const yMm = H - (e.target.y() - view.offsetY) / view.scale;
    const eye = Math.max(0, Math.min(H, Math.round(yMm / 5) * 5));
    useEditor.getState().updateGesture((d) => void (d.eyeLevelMm = eye));
  };
  const onEyeDragEnd = () => useEditor.getState().endGesture();

  // ------------------------------------------------------------- render

  const single = selection.length === 1 ? selection[0] : null;
  const singleRect = single && !dragging ? itemRects.get(single)?.rect : undefined;
  const gaps =
    singleRect && view
      ? neighbourGaps(
          singleRect,
          [...itemRects.entries()].filter(([id]) => id !== single).map(([, v]) => v.rect),
          { width: W, height: H },
        )
      : null;
  const dragRect = dragging ? itemRects.get(dragging)?.rect : undefined;

  return (
    <div className="wall-canvas" ref={boxRef}>
      {hasSize && view && (
        <Stage
          width={size.w}
          height={size.h}
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={onStagePointerUp}
          onPointerCancel={onStagePointerUp}
          onPointerLeave={(e) => gesture.current?.kind !== 'marquee' && onStagePointerUp(e)}
          onWheel={onWheel}
        >
          <Layer>
            <Rect name="background" x={0} y={0} width={size.w} height={size.h} fill="transparent" />
            <Group x={view.offsetX} y={view.offsetY} scaleX={view.scale} scaleY={view.scale}>
              <WallBackground imageId={project.wall.imageId} width={W} height={H} />
              {project.obstacles.map((o) => (
                <ObstacleNode
                  key={o.id}
                  o={o}
                  wallH={H}
                  scale={view.scale}
                  hatch={hatch}
                  selected={selection.includes(o.id)}
                  onPointerDown={(e) => onItemPointerDown(o.id, e)}
                  onDragStart={(e) => onDragStart(o.id, e)}
                  onDragMove={onDragMove}
                  onDragEnd={onDragEnd}
                />
              ))}
              {project.placements.map((pl) => {
                const piece = pieces.get(pl.pieceId);
                return piece ? (
                  <PlacementNode
                    key={pl.id}
                    pl={pl}
                    piece={piece}
                    wallH={H}
                    scale={view.scale}
                    selected={selection.includes(pl.id)}
                    warning={warnings.has(pl.id)}
                    onPointerDown={(e) => onItemPointerDown(pl.id, e)}
                    onDragStart={(e) => onDragStart(pl.id, e)}
                    onDragMove={onDragMove}
                    onDragEnd={onDragEnd}
                  />
                ) : null;
              })}
              <Rect width={W} height={H} stroke="#57534e" strokeWidth={1.5} strokeScaleEnabled={false} listening={false} />
            </Group>
          </Layer>
          <Layer listening={true}>
            <EyeLevel
              view={view}
              wallW={W}
              eyeMm={project.eyeLevelMm}
              label={`Eye level ${fmt(project.eyeLevelMm)}`}
              onDragStart={onEyeDragStart}
              onDragMove={onEyeDragMove}
              onDragEnd={onEyeDragEnd}
            />
            {settings.showNails &&
              project.placements.map((pl) => {
                const piece = pieces.get(pl.pieceId);
                return piece
                  ? nailPositions(pl, piece).map((n, i) => {
                      const s = worldToView(view, n);
                      return (
                        <Group key={`${pl.id}-${i}`} x={s.x} y={s.y} listening={false}>
                          <Circle radius={5} stroke={COLORS.nail} strokeWidth={1.5} fill="rgba(255,255,255,0.8)" />
                          <Line points={[-8, 0, 8, 0]} stroke={COLORS.nail} strokeWidth={1.5} />
                          <Line points={[0, -8, 0, 8]} stroke={COLORS.nail} strokeWidth={1.5} />
                        </Group>
                      );
                    })
                  : null;
              })}
            {guides.map((g, i) => (
              <GuideShape key={i} g={g} view={view} wallW={W} wallH={H} fmt={fmt} />
            ))}
            {gaps &&
              (['left', 'right', 'below', 'above'] as const).map((k) => {
                const gp = gaps[k];
                if (gp.distance < 1) return null;
                const axis = k === 'left' || k === 'right' ? 'x' : 'y';
                return (
                  <GuideShape
                    key={k}
                    g={{ kind: 'gap', axis, from: gp.from, to: gp.to, at: gp.at }}
                    view={view}
                    wallW={W}
                    wallH={H}
                    fmt={fmt}
                    color={gp.toWall ? '#78716c' : COLORS.gap}
                  />
                );
              })}
            {dragRect && (
              <Readout
                view={view}
                rect={dragRect}
                text={`← ${fmt(dragRect.x)}   ↓ ${fmt(dragRect.y)}`}
              />
            )}
            {marquee && (
              <Rect
                x={Math.min(marquee.x0, marquee.x1)}
                y={Math.min(marquee.y0, marquee.y1)}
                width={Math.abs(marquee.x1 - marquee.x0)}
                height={Math.abs(marquee.y1 - marquee.y0)}
                fill="rgba(37,99,235,0.08)"
                stroke={COLORS.select}
                dash={[4, 3]}
                strokeWidth={1}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

function WallBackground({ imageId, width, height }: { imageId?: Id; width: number; height: number }) {
  const img = useImageElement(imageId);
  return img ? (
    <KImage name="background" image={img} width={width} height={height} />
  ) : (
    <Rect name="background" width={width} height={height} fill="#ece8e1" />
  );
}

interface NodeHandlers {
  onPointerDown(e: Konva.KonvaEventObject<PointerEvent>): void;
  onDragStart(e: Konva.KonvaEventObject<DragEvent>): void;
  onDragMove(e: Konva.KonvaEventObject<DragEvent>): void;
  onDragEnd(e: Konva.KonvaEventObject<DragEvent>): void;
}

function PlacementNode({
  pl,
  piece,
  wallH,
  scale,
  selected,
  warning,
  ...h
}: { pl: Placement; piece: Piece; wallH: number; scale: number; selected: boolean; warning: boolean } & NodeHandlers) {
  const img = useImageElement(piece.imageId);
  const w = piece.widthMm;
  const hgt = piece.heightMm;
  const stroke = selected ? COLORS.select : warning ? COLORS.warn : undefined;
  return (
    <Group
      name="item"
      x={pl.xMm}
      y={wallH - pl.yMm - hgt}
      draggable={!pl.locked}
      onPointerDown={h.onPointerDown}
      onDragStart={h.onDragStart}
      onDragMove={h.onDragMove}
      onDragEnd={h.onDragEnd}
    >
      {img ? (
        <KImage
          image={img}
          width={w}
          height={hgt}
          shadowColor="black"
          shadowOpacity={0.3}
          shadowBlur={10 / scale}
          shadowOffsetY={3 / scale}
        />
      ) : (
        <>
          <Rect width={w} height={hgt} fill={piece.color} opacity={0.92} stroke="rgba(0,0,0,0.35)" strokeWidth={1} strokeScaleEnabled={false} />
          <Text
            text={piece.name}
            width={w}
            height={hgt}
            align="center"
            verticalAlign="middle"
            fontSize={Math.max(Math.min(w, hgt) / 9, 11 / scale)}
            fill="rgba(0,0,0,0.7)"
            padding={Math.min(w, hgt) * 0.05}
            listening={false}
          />
        </>
      )}
      {stroke && (
        <Rect
          width={w}
          height={hgt}
          stroke={stroke}
          strokeWidth={selected && warning ? 3 : 2.5}
          dash={warning && !selected ? [6, 4] : undefined}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}
      {selected && warning && (
        <Rect width={w} height={hgt} stroke={COLORS.warn} strokeWidth={1.5} dash={[6, 4]} strokeScaleEnabled={false} listening={false} />
      )}
      {pl.locked && <Text text="🔒" x={w - 22 / scale} y={4 / scale} fontSize={14 / scale} listening={false} />}
    </Group>
  );
}

function ObstacleNode({
  o,
  wallH,
  scale,
  hatch,
  selected,
  ...h
}: { o: Obstacle; wallH: number; scale: number; hatch: HTMLCanvasElement; selected: boolean } & NodeHandlers) {
  return (
    <Group
      name="item"
      x={o.xMm}
      y={wallH - o.yMm - o.heightMm}
      draggable
      onPointerDown={h.onPointerDown}
      onDragStart={h.onDragStart}
      onDragMove={h.onDragMove}
      onDragEnd={h.onDragEnd}
    >
      <Rect
        width={o.widthMm}
        height={o.heightMm}
        fillPatternImage={hatch as unknown as HTMLImageElement}
        fillPatternScaleX={1 / scale}
        fillPatternScaleY={1 / scale}
        stroke={selected ? COLORS.select : '#57534e'}
        strokeWidth={selected ? 2.5 : 1}
        dash={selected ? undefined : [5, 3]}
        strokeScaleEnabled={false}
      />
      <Text
        text={o.name}
        width={o.widthMm}
        height={o.heightMm}
        align="center"
        verticalAlign="middle"
        fontSize={12 / scale}
        fontStyle="bold"
        fill="#44403c"
        listening={false}
      />
    </Group>
  );
}

function EyeLevel({
  view,
  wallW,
  eyeMm,
  label,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  view: Viewport;
  wallW: number;
  eyeMm: number;
  label: string;
  onDragStart(): void;
  onDragMove(e: Konva.KonvaEventObject<DragEvent>): void;
  onDragEnd(): void;
}) {
  const left = worldToView(view, { x: 0, y: eyeMm });
  const right = worldToView(view, { x: wallW, y: eyeMm });
  const handleX = right.x - 4;
  return (
    <>
      <Line points={[left.x, left.y, right.x, right.y]} stroke={COLORS.eye} strokeWidth={1.5} dash={[8, 5]} listening={false} />
      <Group
        x={handleX}
        y={left.y}
        draggable
        dragBoundFunc={(pos) => ({ x: handleX, y: pos.y })}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onPointerDown={(e) => (e.cancelBubble = true)}
      >
        <Rect x={-128} y={-13} width={128} height={26} cornerRadius={13} fill={COLORS.eye} />
        <Text x={-122} y={-7} width={116} align="center" text={label} fontSize={12} fill="white" fontStyle="bold" />
      </Group>
    </>
  );
}

function GuideShape({
  g,
  view,
  wallW,
  wallH,
  fmt,
  color,
}: {
  g: Guide;
  view: Viewport;
  wallW: number;
  wallH: number;
  fmt(mm: number): string;
  color?: string;
}) {
  if (g.kind === 'line') {
    const a = g.axis === 'x' ? worldToView(view, { x: g.pos, y: 0 }) : worldToView(view, { x: 0, y: g.pos });
    const b = g.axis === 'x' ? worldToView(view, { x: g.pos, y: wallH }) : worldToView(view, { x: wallW, y: g.pos });
    return <Line points={[a.x, a.y, b.x, b.y]} stroke={color ?? COLORS.guide} strokeWidth={1} listening={false} />;
  }
  const a = g.axis === 'x' ? worldToView(view, { x: g.from, y: g.at }) : worldToView(view, { x: g.at, y: g.from });
  const b = g.axis === 'x' ? worldToView(view, { x: g.to, y: g.at }) : worldToView(view, { x: g.at, y: g.to });
  const c = color ?? COLORS.gap;
  const tick = g.axis === 'x' ? [0, -5, 0, 5] : [-5, 0, 5, 0];
  const text = fmt(g.to - g.from);
  const tw = text.length * 6.5 + 10;
  return (
    <Group listening={false}>
      <Line points={[a.x, a.y, b.x, b.y]} stroke={c} strokeWidth={1.25} />
      <Line points={tick} x={a.x} y={a.y} stroke={c} strokeWidth={1.25} />
      <Line points={tick} x={b.x} y={b.y} stroke={c} strokeWidth={1.25} />
      <Group x={(a.x + b.x) / 2} y={(a.y + b.y) / 2}>
        <Rect x={-tw / 2} y={-9} width={tw} height={18} cornerRadius={9} fill={c} />
        <Text x={-tw / 2} y={-6} width={tw} align="center" text={text} fontSize={11} fill="white" />
      </Group>
    </Group>
  );
}

function Readout({ view, rect, text }: { view: Viewport; rect: WRect; text: string }) {
  const r = rectToView(view, rect);
  const w = text.length * 6.6 + 16;
  return (
    <Group x={r.x} y={r.y - 30} listening={false}>
      <Rect width={w} height={22} cornerRadius={6} fill="rgba(28,25,23,0.85)" />
      <Text x={0} y={5} width={w} align="center" text={text} fontSize={12} fill="white" />
    </Group>
  );
}
