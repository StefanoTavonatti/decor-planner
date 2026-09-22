import { useId, useState } from 'react';
import {
  formatLength,
  formatLengthForInput,
  lengthErrorMessage,
  parseLengthValidated,
  unitLabel,
  type LengthConstraint,
} from '../../core/units';
import { useUnit } from '../../app/stores';

interface LengthInputProps {
  label: string;
  /** Current value in mm; undefined when not set yet. */
  value: number | undefined;
  onChange(mm: number): void;
  constraint?: LengthConstraint;
  /** Extra validation on the parsed value; return an error message or null. */
  validate?(mm: number): string | null;
  required?: boolean;
  autoFocus?: boolean;
  compact?: boolean;
}

/**
 * Length input: accepts metric or imperial text, shows an inline error for
 * invalid input and keeps the previous value until a valid one is entered.
 */
export function LengthInput({ label, value, onChange, constraint, validate, required, autoFocus, compact }: LengthInputProps) {
  const unit = useUnit();
  const id = useId();
  // While editing (or while showing an error) the user's text is kept as a draft;
  // otherwise the stored value is shown, so external changes and unit switches show up.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const text = draft ?? (value === undefined ? '' : formatLengthForInput(value, unit));

  const commit = () => {
    if (draft === null) return;
    if (draft.trim() === '' && !required && value === undefined) return setDraft(null);
    const r = parseLengthValidated(draft, unit, constraint);
    if (!r.ok) return setError(lengthErrorMessage(r.error));
    const extra = validate?.(r.mm) ?? null;
    if (extra) return setError(extra);
    setError(null);
    setDraft(null);
    const mm = Math.round(r.mm * 100) / 100;
    if (mm !== value) onChange(mm);
  };

  return (
    <label className={`field ${compact ? 'field-compact' : ''} ${error ? 'field-error' : ''}`} htmlFor={id}>
      <span className="field-label">
        {label}
        {required ? ' *' : ''}
      </span>
      <span className="field-input">
        <input
          id={id}
          inputMode={unit === 'imperial' ? 'text' : 'decimal'}
          autoComplete="off"
          autoFocus={autoFocus}
          value={text}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onFocus={(e) => {
            setDraft(e.target.value);
            e.target.select();
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
            e.stopPropagation();
          }}
        />
        {unit !== 'imperial' && <span className="field-suffix">{unitLabel(unit)}</span>}
      </span>
      {error && (
        <span className="field-message" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

/** Display a length in the current unit. */
export function Length({ mm }: { mm: number }) {
  const unit = useUnit();
  return <>{formatLength(mm, unit)}</>;
}

export function useFormatLength() {
  const unit = useUnit();
  return (mm: number) => formatLength(mm, unit);
}
