export interface CurrencyOption {
  code: string;
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "RSD", label: "Serbian dinar" },
  { code: "EUR", label: "Euro" },
  { code: "USD", label: "US dollar" },
  { code: "GBP", label: "Pound sterling" },
  { code: "CHF", label: "Swiss franc" },
  { code: "BAM", label: "Bosnian mark" },
  { code: "HRK", label: "Croatian kuna" },
  { code: "CAD", label: "Canadian dollar" },
  { code: "AUD", label: "Australian dollar" },
];

export const DEFAULT_CURRENCY = "RSD";

export function isSupportedCurrency(code: string): boolean {
  return CURRENCIES.some((c) => c.code === code);
}

/** RSD uses Serbian convention (1.234,56); other supported currencies use 1,234.56. */
function separators(currency: string) {
  return currency === "RSD" || currency === "BAM" || currency === "HRK"
    ? { group: ".", decimal: "," }
    : { group: ",", decimal: "." };
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

function groupDigits(value: string, separator: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export interface MoneyParts {
  integer: string;
  fraction: string;
  negative: boolean;
}

export function moneyParts(amount: number, currency: string): MoneyParts {
  const cents = toCents(amount);
  const abs = Math.abs(cents);
  const { group } = separators(currency);
  return {
    integer: groupDigits(Math.floor(abs / 100).toString(), group),
    fraction: (abs % 100).toString().padStart(2, "0"),
    negative: cents < 0,
  };
}

export interface FormatOptions {
  /** always: show + or −. auto: show − only. none: never show a sign. */
  sign?: "auto" | "always" | "none";
  currency?: boolean;
}

export function formatMoney(
  amount: number,
  currency: string,
  options: FormatOptions = {},
): string {
  const { sign = "none", currency: withCurrency = true } = options;
  const parts = moneyParts(amount, currency);
  const { decimal } = separators(currency);
  const prefix =
    sign === "always" ? (parts.negative ? "−" : "+") : parts.negative ? "−" : "";
  const value = `${prefix}${parts.integer}${decimal}${parts.fraction}`;
  return withCurrency ? `${value} ${currency}` : value;
}

/** Raw amount for an editable input, e.g. 1240.5 -> "1240,50" for RSD. */
export function amountForInput(amount: number, currency: string): string {
  const { decimal } = separators(currency);
  return (Math.round(amount * 100) / 100).toFixed(2).replace(".", decimal);
}

/**
 * Parses user input in either convention: "1234,56", "1.234,56", "1,234.56".
 * Returns null when the input cannot be read as a positive amount.
 */
export function parseAmount(raw: string): number | null {
  let text = raw.replace(/[^\d.,]/g, "");
  if (!text || !/\d/.test(text)) return null;

  const lastSeparator = Math.max(text.lastIndexOf(","), text.lastIndexOf("."));
  if (lastSeparator >= 0) {
    const decimals = text.length - lastSeparator - 1;
    if (decimals === 0) {
      text = text.slice(0, lastSeparator);
    } else if (decimals <= 2) {
      text =
        text.slice(0, lastSeparator).replace(/[.,]/g, "") +
        "." +
        text.slice(lastSeparator + 1);
    } else {
      text = text.replace(/[.,]/g, "");
    }
  }

  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}
