/** Helpers for dropping files from the device onto the app. */

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i;

/** Whether a file looks like an image (some platforms report an empty MIME type, e.g. HEIC). */
export function isImageFile(f: Pick<File, 'type' | 'name'>): boolean {
  return f.type.startsWith('image/') || (f.type === '' && IMAGE_EXT.test(f.name));
}

export type DropResult = { kind: 'image'; file: File } | { kind: 'no-image' } | { kind: 'empty' };

/** The first image among dropped files. */
export function pickDroppedImage(files: ArrayLike<File> | null | undefined): DropResult {
  const list = files ? Array.from(files) : [];
  if (list.length === 0) return { kind: 'empty' };
  const file = list.find(isImageFile);
  return file ? { kind: 'image', file } : { kind: 'no-image' };
}

/** Whether a drag carries files (as opposed to text or elements dragged inside the page). */
export function dragHasFiles(dt: DataTransfer | null | undefined): boolean {
  return Boolean(dt && Array.from(dt.types).includes('Files'));
}
