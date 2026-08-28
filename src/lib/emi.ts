/**
 * EMI (equated monthly instalment) calculation.
 *
 * Pure functions, no DOM, so the maths can be tested on its own. The original
 * WordPress plugin is replaced entirely; only the formula and the control
 * ranges were taken from it.
 */

export interface EmiInput {
  /** Principal in AED. */
  principal: number;
  /** Nominal annual interest rate, as a percentage (e.g. 15 for 15%). */
  annualRatePercent: number;
  /** Tenure in months. */
  months: number;
}

export interface EmiResult {
  /** Monthly instalment. */
  emi: number;
  /** Total of all instalments. */
  totalPayment: number;
  /** Total payment minus principal. */
  totalInterest: number;
}

/** Control ranges, measured from the original plugin. */
export const EMI_LIMITS = {
  amount: { min: 5_000, max: 10_000_000, step: 1, default: 50_000 },
  rate: { min: 1, max: 30, step: 0.1, default: 15 },
  years: { min: 1, max: 30, step: 1, default: 5 },
  /**
   * The original caps months at 30, which is 2.5 years while the years slider
   * reaches 30 (audit defect #10). Corrected to 360 per the client's decision
   * on Q3, so the two units cover the same span.
   */
  months: { min: 6, max: 360, step: 1, default: 60 },
} as const;

export const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;

/**
 * Standard amortisation:
 *
 *   r   = annualRate / 12 / 100
 *   EMI = P · r · (1 + r)^n / ((1 + r)^n − 1)
 *
 * Verified against the live site: 50,000 AED at 15% over 60 months gives
 * 1,189.4965, which rounds to the 1189 the original displays, with totals of
 * 71,370 and 21,370 — also exactly what the original shows. Its arithmetic is
 * correct; only the presentation needed fixing.
 */
export function calculateEmi({ principal, annualRatePercent, months }: EmiInput): EmiResult {
  const n = Math.max(1, Math.round(months));
  const p = Math.max(0, principal);
  const r = annualRatePercent / 12 / 100;

  // A zero rate degenerates to a simple split, and the formula below divides
  // by zero there.
  const emi = r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const totalPayment = emi * n;
  return {
    emi,
    totalPayment,
    totalInterest: totalPayment - p,
  };
}

const formatter = new Intl.NumberFormat('en-AE', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/**
 * Consistent thousands separators everywhere.
 *
 * The original prints "21370 AED" next to "71,370 AED" — separators on one
 * value and not the other (audit defect #12).
 */
export const formatAed = (value: number) =>
  `${formatter.format(Math.round(Number.isFinite(value) ? value : 0))} AED`;

/** Tenure in months, whichever unit the visitor is using. */
export const toMonths = (value: number, unit: 'years' | 'months') =>
  unit === 'years' ? Math.round(value * 12) : Math.round(value);
