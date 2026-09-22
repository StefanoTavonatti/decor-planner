/**
 * Length units: everything is stored in millimetres; this module is the single
 * place where lengths are converted to/from human-readable text.
 */

export type DisplayUnit = 'mm' | 'cm' | 'm' | 'imperial';

export const DISPLAY_UNITS: readonly DisplayUnit[] = ['mm', 'cm', 'm', 'imperial'];
export const DEFAULT_UNIT: DisplayUnit = 'cm';

export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = MM_PER_INCH * 12;

/** Round to `decimals` and drop trailing zeros ("162.50" -> "162.5", "85.0" -> "85"). */
function trimNumber(value: number, decimals: number): string {
  const s = value.toFixed(decimals);
  const trimmed = s.includes('.') ? s.replace(/\.?0+$/, '') : s;
  return trimmed === '-0' ? '0' : trimmed;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Format a value in inches with a reduced fraction, rounded to 1/16". Returns e.g. `9 7/16`. */
function formatInchesFraction(totalSixteenths: number): string {
  const whole = Math.floor(totalSixteenths / 16);
  const rem = totalSixteenths % 16;
  if (rem === 0) return String(whole);
  const d = gcd(rem, 16);
  const frac = `${rem / d}/${16 / d}`;
  return whole === 0 ? frac : `${whole} ${frac}`;
}

/** Format imperial: inches < 12" (e.g. `7 1/2"`), otherwise feet-inches (e.g. `2' 9 7/16"`). */
export function formatImperial(mm: number): string {
  const negative = mm < 0;
  const sixteenths = Math.round((Math.abs(mm) / MM_PER_INCH) * 16);
  let text: string;
  if (sixteenths < 12 * 16) {
    text = `${formatInchesFraction(sixteenths)}"`;
  } else {
    const feet = Math.floor(sixteenths / (12 * 16));
    const restSixteenths = sixteenths - feet * 12 * 16;
    text = `${feet}' ${formatInchesFraction(restSixteenths)}"`;
  }
  return negative && sixteenths !== 0 ? `-${text}` : text;
}

/** Format a millimetre length for display, including the unit. */
export function formatLength(mm: number, unit: DisplayUnit): string {
  switch (unit) {
    case 'mm':
      return `${trimNumber(mm, 0)} mm`;
    case 'cm':
      return `${trimNumber(mm / 10, 1)} cm`;
    case 'm':
      return `${trimNumber(mm / 1000, 3)} m`;
    case 'imperial':
      return formatImperial(mm);
  }
}

/** Format a value for an editable input field: same as display but unitless for metric. */
export function formatLengthForInput(mm: number, unit: DisplayUnit): string {
  switch (unit) {
    case 'mm':
      return trimNumber(mm, 0);
    case 'cm':
      return trimNumber(mm / 10, 1);
    case 'm':
      return trimNumber(mm / 1000, 3);
    case 'imperial':
      return formatImperial(mm);
  }
}

/** Short unit label for input adornments. */
export function unitLabel(unit: DisplayUnit): string {
  return unit === 'imperial' ? 'in' : unit;
}

export type LengthError = 'empty' | 'unparseable' | 'not-positive' | 'negative';

export type ParseResult = { ok: true; mm: number } | { ok: false; error: LengthError };

const NUM = String.raw`\d+(?:[.,]\d+)?`;
const FRACTION = String.raw`\d+\s*/\s*\d+`;
/** Inch quantity: "33", "33.5", "33 1/2", "1/2". */
const INCH_QTY = String.raw`(?:(${NUM})(?:\s+(${FRACTION}))?|(${FRACTION}))`;

const METRIC_RE = new RegExp(String.raw`^(-?)(${NUM})\s*(mm|cm|m)?$`, 'i');
const INCH_RE = new RegExp(String.raw`^(-?)${INCH_QTY}\s*(in|inch|inches|")?$`, 'i');
const FEET_RE = new RegExp(
  String.raw`^(-?)(${NUM})\s*(?:ft|feet|foot|')(?:\s*${INCH_QTY}\s*(?:in|inch|inches|")?)?$`,
  'i',
);

function num(s: string): number {
  return Number(s.replace(',', '.'));
}

function fraction(s: string): number {
  const [n, d] = s.split('/').map((p) => Number(p.trim()));
  return d === 0 ? NaN : n / d;
}

function inchQty(whole: string | undefined, frac: string | undefined, onlyFrac: string | undefined): number {
  if (onlyFrac) return fraction(onlyFrac);
  return num(whole ?? '0') + (frac ? fraction(frac) : 0);
}

/** Normalise typographic quotes and whitespace. */
function normalise(input: string): string {
  return input
    .trim()
    .replace(/[′’‘]/g, "'")
    .replace(/[″“”]|''/g, '"')
    .replace(/\s+/g, ' ');
}

/**
 * Parse a length typed by the user. A number without unit is interpreted in the
 * current display unit (inches when imperial).
 */
export function parseLength(input: string, unit: DisplayUnit): ParseResult {
  const s = normalise(input);
  if (s === '') return { ok: false, error: 'empty' };

  const feet = FEET_RE.exec(s);
  if (feet) {
    const sign = feet[1] ? -1 : 1;
    const inches = feet[3] || feet[5] ? inchQty(feet[3], feet[4], feet[5]) : 0;
    const mm = sign * (num(feet[2]) * MM_PER_FOOT + inches * MM_PER_INCH);
    return Number.isFinite(mm) ? { ok: true, mm } : { ok: false, error: 'unparseable' };
  }

  const metric = METRIC_RE.exec(s);
  if (metric) {
    const sign = metric[1] ? -1 : 1;
    const value = num(metric[2]);
    const explicit = metric[3]?.toLowerCase() as 'mm' | 'cm' | 'm' | undefined;
    const u = explicit ?? unit;
    const factor = u === 'mm' ? 1 : u === 'cm' ? 10 : u === 'm' ? 1000 : MM_PER_INCH;
    return { ok: true, mm: sign * value * factor };
  }

  const inch = INCH_RE.exec(s);
  if (inch) {
    // Explicit inches ("33.5in") or a fraction ("33 1/2"); bare numbers were handled above.
    const sign = inch[1] ? -1 : 1;
    const hasUnit = Boolean(inch[5]);
    const value = inchQty(inch[2], inch[3], inch[4]);
    const factor = hasUnit || unit === 'imperial' ? MM_PER_INCH : unit === 'mm' ? 1 : unit === 'cm' ? 10 : 1000;
    const mm = sign * value * factor;
    return Number.isFinite(mm) ? { ok: true, mm } : { ok: false, error: 'unparseable' };
  }

  return { ok: false, error: 'unparseable' };
}

export interface LengthConstraint {
  /** Require > 0 (sizes). */
  positive?: boolean;
  /** Require >= 0 (offsets, positions from floor). */
  nonNegative?: boolean;
}

/** Parse and validate against a constraint. */
export function parseLengthValidated(input: string, unit: DisplayUnit, c: LengthConstraint = {}): ParseResult {
  const r = parseLength(input, unit);
  if (!r.ok) return r;
  if (c.positive && !(r.mm > 0)) return { ok: false, error: 'not-positive' };
  if (c.nonNegative && r.mm < 0) return { ok: false, error: 'negative' };
  return r;
}

export function lengthErrorMessage(error: LengthError): string {
  switch (error) {
    case 'empty':
      return 'Enter a length';
    case 'unparseable':
      return 'Not a valid length';
    case 'not-positive':
      return 'Must be greater than zero';
    case 'negative':
      return 'Cannot be negative';
  }
}
