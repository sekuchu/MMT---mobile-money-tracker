import { useMemo, useState } from "react";
import { useApp } from "../app/data";
import {
  filterTransactions,
  groupByDay,
  sumByType,
  type RangeId,
  type TypeFilter,
} from "../app/derive";
import { EmptyState } from "../components/EmptyState";
import { OfflineBanner } from "../components/OfflineBanner";
import { TransactionDetail } from "../components/TransactionDetail";
import { TransactionRow } from "../components/TransactionList";
import {
  TransactionSheet,
  type SheetState,
} from "../components/TransactionSheet";
import { type Category } from "../backend/types";
import { useI18n } from "../lib/i18n";
import { countText } from "../lib/strings";
import { dayLabel } from "../lib/dates";
import { formatMoney } from "../lib/money";

export function Activity() {
  const app = useApp();
  const { t } = useI18n();
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [type, setType] = useState<TypeFilter>("all");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [range, setRange] = useState<RangeId>("all");

  const typeOptions: { id: TypeFilter; label: string }[] = [
    { id: "all", label: t("activity.all") },
    { id: "income", label: t("activity.in") },
    { id: "expense", label: t("activity.out") },
  ];

  const filtered = useMemo(
    () => filterTransactions(app.transactions, { type, category, range }),
    [app.transactions, type, category, range],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const detailTxn = detailId
    ? app.transactions.find((txn) => txn.id === detailId) ?? null
    : null;
  const spent = sumByType(filtered, "expense");
  const added = sumByType(filtered, "income");
  const isFiltered = type !== "all" || category !== "all" || range !== "all";

  const clearFilters = () => {
    setType("all");
    setCategory("all");
    setRange("all");
  };

  return (
    <>
      <header className="page-head">
      </header>

      {app.offline ? <OfflineBanner pending={app.pendingCount} /> : null}

      <div className="filters">
        <div className="seg" role="group" aria-label={t("a11y.txnType")}>
          {typeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={type === option.id ? "seg-item is-on" : "seg-item"}
              aria-pressed={type === option.id}
              onClick={() => setType(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-summary">
        <span>
          {countText(filtered.length)}
          {isFiltered ? t("activity.matching") : ""}
        </span>
        <span className="filter-summary-amounts">
          {added > 0 ? (
            <span className="amt-in">
              {formatMoney(added, app.wallet.currency, { sign: "always" })}
            </span>
          ) : null}
          {spent > 0 ? (
            <span className="amt-out">
              {formatMoney(-spent, app.wallet.currency, { sign: "always" })}
            </span>
          ) : null}
        </span>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title={isFiltered ? t("activity.emptyFiltered") : t("activity.empty")}
        >
          {isFiltered ? (
            <button type="button" className="btn btn-outline" onClick={clearFilters}>
              {t("activity.clearFilters")}
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <div className="day-groups">
          {groups.map((group) => (
            <section key={group.date} className="day-group">
              <h2 className="day-head">
                <span>{dayLabel(group.date)}</span>
                <span>{group.items.length}</span>
              </h2>
              <div className="txns">
                {group.items.map((txn) => (
                  <TransactionRow
                    key={txn.id}
                    txn={txn}
                    currency={app.wallet.currency}
                    onOpen={(next) => setDetailId(next.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {detailTxn ? (
        <TransactionDetail
          txn={detailTxn}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setSheet({ kind: "edit", txn: detailTxn });
            setDetailId(null);
          }}
        />
      ) : null}

      {sheet ? (
        <TransactionSheet state={sheet} onClose={() => setSheet(null)} />
      ) : null}
    </>
  );
}
