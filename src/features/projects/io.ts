/** Project-level operations: .decorplan export/import, thumbnails. */
import { readDecorPlan, referencedImageIds, referencedPieces, writeDecorPlan, type ArchiveImage } from '../../core/format';
import { newId, type Id, type Project } from '../../core/model';
import { repo } from '../../storage/repo';
import { flushAutosave, piecesMap, useEditor, useLibrary } from '../../app/stores';
import { downloadBlob, safeFilename, storeBlob } from '../common/images';
import { renderCompositionPng } from '../export/render';

export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.1.0';

/** Read the latest state of a project (the open editor copy wins over storage). */
async function currentProject(id: Id): Promise<Project | undefined> {
  const open = useEditor.getState().project;
  if (open?.id === id) return open;
  return repo.getProject(id);
}

async function setProjectFields(id: Id, fields: Partial<Project>) {
  const editor = useEditor.getState();
  if (editor.project?.id === id) {
    editor.patch(fields);
    await flushAutosave();
  } else {
    await repo.db.projects.update(id, fields);
  }
}

export async function exportProjectFile(id: Id): Promise<void> {
  await flushAutosave();
  const project = await currentProject(id);
  if (!project) throw new Error('Project not found');
  const library = Object.values(useLibrary.getState().pieces);
  const pieces = referencedPieces(project, library);
  const images: ArchiveImage[] = [];
  for (const imageId of referencedImageIds(project, pieces)) {
    const img = await repo.getImage(imageId);
    if (img) images.push({ id: img.id, mime: img.mime, bytes: new Uint8Array(img.bytes) });
  }
  const bytes = writeDecorPlan(project, pieces, images, APP_VERSION);
  downloadBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), `${safeFilename(project.name)}.decorplan`);
  await setProjectFields(id, { lastExportedAt: Date.now() });
}

async function imageSize(bytes: Uint8Array, mime: string): Promise<{ width: number; height: number }> {
  try {
    const bmp = await createImageBitmap(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }));
    const size = { width: bmp.width, height: bmp.height };
    bmp.close();
    return size;
  } catch {
    return { width: 0, height: 0 };
  }
}

/** Import a .decorplan file as a new project. Pieces already in the library (same id) are reused. */
export async function importProjectFile(file: Blob): Promise<Project> {
  const plan = readDecorPlan(new Uint8Array(await file.arrayBuffer()));
  for (const img of plan.images) {
    if (await repo.getImage(img.id)) continue;
    const size = await imageSize(img.bytes, img.mime);
    await repo.putImage({ id: img.id, mime: img.mime, ...size, bytes: img.bytes.slice().buffer });
  }
  for (const piece of plan.pieces) {
    if (!(await repo.getPiece(piece.id))) await repo.savePiece(piece);
  }
  const now = Date.now();
  const project: Project = {
    ...plan.project,
    id: newId(),
    createdAt: now,
    updatedAt: now,
    lastExportedAt: now,
    thumbnailId: undefined,
  };
  await repo.saveProject(project);
  await useLibrary.getState().load();
  await updateThumbnail(project.id);
  return project;
}

/** Regenerate the small preview image shown in the project list. */
export async function updateThumbnail(id: Id): Promise<void> {
  const project = await repo.getProject(id);
  if (!project) return;
  const { blob, width, height } = await renderCompositionPng(project, piecesMap(useLibrary.getState().pieces), 480);
  const thumbId = await storeBlob(blob, width, height);
  await repo.db.projects.update(id, { thumbnailId: thumbId });
  const editor = useEditor.getState();
  if (editor.project?.id === id) editor.patch({ thumbnailId: thumbId });
  if (project.thumbnailId) await repo.deleteImage(project.thumbnailId);
}
