import { getLang, type Lang } from "./locale";
import { t } from "./strings";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_LONG: Record<Lang, string[]> = {
  sr: [
    "Januar",
    "Februar",
    "Mart",
    "April",
    "Maj",
    "Jun",
    "Jul",
    "Avgust",
    "Septembar",
    "Oktobar",
    "Novembar",
    "Decembar",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

const WEEKDAYS: Record<Lang, string[]> = {
  sr: [
    "Nedelja",
    "Ponedeljak",
    "Utorak",
    "Srijeda",
    "Četvrtak",
    "Petak",
    "Subota",
  ],
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
};

export function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export interface YMD {
  year: number;
  month: number;
  day: number;
}

/** Parses yyyy-mm-dd as a local calendar date (never UTC). */
export function parseISODate(value: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function formatShortDate(iso: string): string {
  const ymd = parseISODate(iso);
  if (!ymd) return iso;
  return `${ymd.day} ${MONTHS_SHORT[ymd.month - 1]}`;
}

export function formatFullDate(iso: string): string {
  const ymd = parseISODate(iso);
  if (!ymd) return iso;
  const date = new Date(ymd.year, ymd.month - 1, ymd.day);
  const lang = getLang();
  return `${WEEKDAYS[lang][date.getDay()]}, ${ymd.day} ${MONTHS_LONG[lang][ymd.month - 1]}`;
}

export function dayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return t("date.today");
  const ymd = parseISODate(today);
  if (ymd) {
    const yesterday = new Date(ymd.year, ymd.month - 1, ymd.day - 1);
    if (toISODate(yesterday) === iso) return t("date.yesterday");
  }
  return formatShortDate(iso);
}

/** "Srijeda, 25 Novembar · 14:32" for a stored epoch millisecond value. */
export function formatDateTime(ms: number): string {
  const date = new Date(ms);
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  return `${formatFullDate(toISODate(date))} · ${time}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7);
}

export function currentMonthName(): string {
  return MONTHS_LONG[getLang()][new Date().getMonth()];
}

export function daysAgoISO(days: number): string {
  const now = new Date();
  return toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days));
}
