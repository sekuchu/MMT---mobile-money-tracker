import { formatMoney } from "./money";

/**
 * Approximate value of one unit in RSD. Every conversion goes through RSD, so
 * any supported pair works. These are fixed reference rates, not live quotes;
 * update them here when they drift.
 */
export const RSD_PER_UNIT: Record<string, number> = {
  RSD: 1,
  BAM: 58, // as agreed: 1 BAM = 58 RSD
  EUR: 117.2,
  USD: 108,
  GBP: 137,
  CHF: 122,
  HRK: 15.6,
  CAD: 78,
  AUD: 71,
};

export function canConvert(from: string, to: string): boolean {
  return from in RSD_PER_UNIT && to in RSD_PER_UNIT;
}

export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to || !canConvert(from, to)) {
    return Math.round(amount * 100) / 100;
  }
  const rsd = amount * RSD_PER_UNIT[from];
  return Math.round((rsd / RSD_PER_UNIT[to]) * 100) / 100;
}

export function conversionRate(from: string, to: string): number | null {
  if (!canConvert(from, to)) return null;
  return RSD_PER_UNIT[from] / RSD_PER_UNIT[to];
}

/** "1 BAM = 58,00 RSD" in the target currency's formatting. */
export function rateLabel(from: string, to: string): string {
  const rate = conversionRate(from, to);
  if (rate === null) return "";
  return `1 ${from} = ${formatMoney(rate, to, { currency: false })} ${to}`;
}
