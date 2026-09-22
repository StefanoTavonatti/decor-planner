import type { Hanging } from '../../core/model';
import { hangingErrorMessage, nailPositions, validateHanging } from '../../core/nails';
import { LengthInput } from '../common/LengthInput';

/** Edit hanging points (1 or 2), offset from top and spacing, with a live preview. */
export function HangingEditor({
  hanging,
  widthMm,
  heightMm,
  onChange,
}: {
  hanging: Hanging;
  widthMm: number;
  heightMm: number;
  onChange(h: Hanging): void;
}) {
  const error = validateHanging(hanging, widthMm, heightMm);
  return (
    <div className="hanging-editor">
      <div className="hanging-controls">
        <div className="segmented" role="radiogroup" aria-label="Hanging points">
          <button
            className={hanging.type === 1 ? 'active' : ''}
            onClick={() => onChange({ type: 1, offsetTopMm: hanging.offsetTopMm })}
          >
            1 point
          </button>
          <button
            className={hanging.type === 2 ? 'active' : ''}
            onClick={() =>
              onChange({ type: 2, offsetTopMm: hanging.offsetTopMm, spacingMm: hanging.spacingMm ?? Math.round(widthMm * 0.6) })
            }
          >
            2 points
          </button>
        </div>
        <LengthInput
          label="Offset from top edge"
          value={hanging.offsetTopMm}
          constraint={{ nonNegative: true }}
          validate={(mm) => (mm > heightMm ? hangingErrorMessage('offset-too-large') : null)}
          onChange={(offsetTopMm) => onChange({ ...hanging, offsetTopMm })}
        />
        {hanging.type === 2 && (
          <LengthInput
            label="Distance between points"
            value={hanging.spacingMm}
            constraint={{ positive: true }}
            validate={(mm) => (mm > widthMm ? hangingErrorMessage('spacing-too-large') : null)}
            onChange={(spacingMm) => onChange({ ...hanging, spacingMm })}
          />
        )}
        {error && (
          <p className="field-message" role="alert">
            {hangingErrorMessage(error)}
          </p>
        )}
        <p className="hint">
          {hanging.type === 1
            ? 'Wire or sawtooth hanger: pull the wire up toward the top edge until taut, then measure from the wire to the top edge.'
            : 'D-rings or two hooks: measure from the top edge to the rings, and between the two rings.'}
        </p>
      </div>
      <HangingPreview hanging={hanging} widthMm={widthMm} heightMm={heightMm} />
    </div>
  );
}

function HangingPreview({ hanging, widthMm, heightMm }: { hanging: Hanging; widthMm: number; heightMm: number }) {
  const size = 140;
  const s = size / Math.max(widthMm, heightMm);
  const w = widthMm * s;
  const h = heightMm * s;
  const pad = 12;
  const nails = validateHanging(hanging, widthMm, heightMm)
    ? []
    : nailPositions({ xMm: 0, yMm: 0 }, { widthMm, heightMm, hanging });
  return (
    <svg className="hanging-preview" width={w + pad * 2} height={h + pad * 2} aria-label="Hanging preview">
      <rect x={pad} y={pad} width={w} height={h} className="hp-frame" />
      {nails.map((n, i) => {
        const cx = pad + n.x * s;
        const cy = pad + (heightMm - n.y) * s;
        return (
          <g key={i}>
            <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} className="hp-nail" />
            <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} className="hp-nail" />
          </g>
        );
      })}
    </svg>
  );
}
