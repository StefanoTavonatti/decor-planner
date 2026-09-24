/** Choose a wall photo (camera or file) and straighten it. */
import { useState } from 'react';
import type { Wall } from '../../core/model';
import { importImageFile, pickFile } from '../common/images';
import { withErrorAlert } from '../common/ui';
import { RectifyEditor, type RectifyResult } from '../rectify/RectifyEditor';

export function wallFromRectify(r: RectifyResult): Wall {
  return {
    widthMm: r.widthMm,
    heightMm: r.heightMm,
    imageId: r.rectifiedImageId,
    imageSource: { originalImageId: r.originalImageId, corners: r.corners },
  };
}

/** Hook that opens the photo picker + corner editor and resolves with a new wall. */
export function useWallPhotoFlow(onWall: (w: Wall) => void, current?: Wall) {
  const [editing, setEditing] = useState<{ imageId: string; reedit: boolean } | null>(null);

  /** Import a photo (picked or dropped) and open the corner editor. */
  const startWithFile = async (file: File) => {
    const img = await withErrorAlert('Could not open the image', () => importImageFile(file));
    if (img) setEditing({ imageId: img.id, reedit: false });
  };

  const pickPhoto = async (camera: boolean) => {
    const file = await pickFile('image/*', camera);
    if (file) await startWithFile(file);
  };

  const reStraighten = () => {
    if (current?.imageSource) setEditing({ imageId: current.imageSource.originalImageId, reedit: true });
  };

  const editor = editing ? (
    <RectifyEditor
      title="Straighten wall photo"
      imageId={editing.imageId}
      initialCorners={editing.reedit ? current?.imageSource?.corners : undefined}
      initialWidthMm={current?.widthMm}
      initialHeightMm={current?.heightMm}
      widthLabel="Wall width"
      heightLabel="Wall height"
      onCancel={() => setEditing(null)}
      onConfirm={(r) => {
        setEditing(null);
        onWall(wallFromRectify(r));
      }}
    />
  ) : null;

  return { pickPhoto, startWithFile, reStraighten, editor };
}
