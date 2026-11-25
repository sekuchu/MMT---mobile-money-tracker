import type { Category, Txn } from "../backend/types";
import { currentMonthKey, daysAgoISO, monthKey, todayISO } from "../lib/dates";

export type TypeFilter = "all" | "income" | "expense";
export type RangeId = "all" | "month" | "last-month" | "30d";

export const RANGE_LABELS: Record<RangeId, string> = {
  all: "Sve",
  month: "Ovaj mjesec",
  "last-month": "Prosli mjesec",
  "30d": "Zadnjih 30 dana",
};

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
}

export function monthTotals(transactions: Txn[], month: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const txn of transactions) {
    if (monthKey(txn.date) !== month) continue;
    if (txn.type === "income") income += txn.amount;
    else expense += txn.amount;
  }
  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    net: Math.round((income - expense) * 100) / 100,
  };
}

function lastMonthKey(): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

export function inRange(date: string, range: RangeId): boolean {
  switch (range) {
    case "month":
      return monthKey(date) === currentMonthKey();
    case "last-month":
      return monthKey(date) === lastMonthKey();
    case "30d":
      return date >= daysAgoISO(29) && date <= todayISO();
    default:
      return true;
  }
}

export interface FilterState {
  type: TypeFilter;
  category: "all" | Category;
  range: RangeId;
}

export function filterTransactions(
  transactions: Txn[],
  filter: FilterState,
): Txn[] {
  return transactions.filter((txn) => {
    if (filter.type !== "all" && txn.type !== filter.type) return false;
    if (filter.category !== "all") {
      if (txn.type !== "expense" || txn.category !== filter.category) return false;
    }
    return inRange(txn.date, filter.range);
  });
}

export interface DayGroup {
  date: string;
  items: Txn[];
}

export function groupByDay(transactions: Txn[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const txn of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === txn.date) last.items.push(txn);
    else groups.push({ date: txn.date, items: [txn] });
  }
  return groups;
}

export function sumByType(transactions: Txn[], type: "income" | "expense"): number {
  const total = transactions
    .filter((txn) => txn.type === type)
    .reduce((sum, txn) => sum + Math.round(txn.amount * 100), 0);
  return total / 100;
}
