import type { Piece } from '../../core/model';
import { useImageUrl } from '../common/images';
import { useFormatLength } from '../common/LengthInput';

/** Piece preview at its real aspect ratio: image or coloured placeholder. */
export function PieceThumb({ piece, maxSize = 120 }: { piece: Piece; maxSize?: number }) {
  const url = useImageUrl(piece.imageId);
  const fmt = useFormatLength();
  const aspect = piece.widthMm / piece.heightMm;
  const w = aspect >= 1 ? maxSize : maxSize * aspect;
  const h = aspect >= 1 ? maxSize / aspect : maxSize;
  return (
    <div className="piece-thumb" style={{ width: maxSize, height: maxSize }}>
      {url ? (
        <img src={url} alt="" style={{ width: w, height: h }} />
      ) : (
        <div className="placeholder-box" style={{ width: w, height: h, background: piece.color }}>
          <span>
            {fmt(piece.widthMm)} × {fmt(piece.heightMm)}
          </span>
        </div>
      )}
    </div>
  );
}
