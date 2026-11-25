import type { Txn } from "../backend/types";
import { formatFullDate } from "../lib/dates";
import { useI18n } from "../lib/i18n";
import { formatMoney } from "../lib/money";

function subtitle(txn: Txn): string {
  const parts: string[] = [];
  if (txn.notes.trim()) parts.push(txn.notes.trim());
  parts.push(formatFullDate(txn.date));
  return parts.join(" · ");
}

interface RowProps {
  txn: Txn;
  currency: string;
  onOpen: (txn: Txn) => void;
}

export function TransactionRow({ txn, currency, onOpen }: RowProps) {
  const { t } = useI18n();
  const isIncome = txn.type === "income";
  const title =
    txn.description || (isIncome ? t("txn.moneyAdded") : t("txn.expenseFallback"));
  return (
    <button
      type="button"
      className="txn"
      onClick={() => onOpen(txn)}
      aria-label={`${isIncome ? t("txn.incomeAria") : t("txn.expenseAria")}: ${
        txn.description || t("txn.untitled")
      }, ${formatMoney(txn.amount, currency)}`}
    >
      <span className="txn-main">
        <span className="txn-title">{title}</span>
        <span className="txn-sub">{subtitle(txn)}</span>
      </span>
      <span className="txn-right">
        <span className={isIncome ? "txn-amt amt-in" : "txn-amt amt-out"}>
          {formatMoney(isIncome ? txn.amount : -txn.amount, currency, {
            sign: "always",
          })}
        </span>
        {txn.pending ? <span className="txn-pending">{t("txn.pending")}</span> : null}
      </span>
    </button>
  );
}

export function TransactionList({
  items,
  currency,
  onOpen,
}: {
  items: Txn[];
  currency: string;
  onOpen: (txn: Txn) => void;
}) {
  return (
    <div className="txns">
      {items.map((txn) => (
        <TransactionRow
          key={txn.id}
          txn={txn}
          currency={currency}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
