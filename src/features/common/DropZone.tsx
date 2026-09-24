import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { dragHasFiles, pickDroppedImage } from './fileDrop';
import { alertDialog } from './ui';

/**
 * Area that accepts an image file dragged from the device. Shows an overlay
 * with `message` while files are dragged over it; the innermost zone wins.
 */
export function DropZone({
  message,
  onImage,
  disabled,
  className,
  children,
}: {
  message: string;
  onImage(file: File): void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(false);
  // dragenter/dragleave fire for every child element; count them to avoid flicker.
  const depth = useRef(0);

  const accept = (e: DragEvent) => !disabled && dragHasFiles(e.dataTransfer);

  const onDragEnter = (e: DragEvent) => {
    if (!accept(e)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current += 1;
    setActive(true);
  };
  const onDragOver = (e: DragEvent) => {
    if (!accept(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = (e: DragEvent) => {
    if (!accept(e)) return;
    e.stopPropagation();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setActive(false);
  };
  const onDrop = (e: DragEvent) => {
    if (!accept(e)) return;
    e.preventDefault();
    e.stopPropagation();
    depth.current = 0;
    setActive(false);
    const r = pickDroppedImage(e.dataTransfer.files);
    if (r.kind === 'image') onImage(r.file);
    else if (r.kind === 'no-image') void alertDialog('Not an image', 'Only image files can be used.');
  };

  return (
    <div
      className={`drop-zone ${active ? 'drop-zone-active' : ''} ${className ?? ''}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {active && (
        <div className="drop-overlay" aria-live="polite">
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
