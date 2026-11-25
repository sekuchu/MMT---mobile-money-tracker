import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../app/data";
import { monthTotals } from "../app/derive";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { OfflineBanner } from "../components/OfflineBanner";
import { TransactionDetail } from "../components/TransactionDetail";
import { TransactionList } from "../components/TransactionList";
import {
  TransactionSheet,
  type SheetState,
} from "../components/TransactionSheet";
import { useI18n } from "../lib/i18n";
import { currentMonthKey, currentMonthName } from "../lib/dates";
import { formatMoney, moneyParts } from "../lib/money";

export function Home() {
  const app = useApp();
  const { t } = useI18n();
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { wallet, transactions, balance, pendingCount, offline } = app;
  const detailTxn = detailId
    ? transactions.find((txn) => txn.id === detailId) ?? null
    : null;
  const parts = moneyParts(balance, wallet.currency);
  const totals = monthTotals(transactions, currentMonthKey());
  const recent = transactions.slice(0, 5);
  const flow = totals.income + totals.expense;
  const incomeShare = flow > 0 ? (totals.income / flow) * 100 : 0;

  return (
    <>

      {offline ? <OfflineBanner pending={pendingCount} /> : null}

      <section className="balance">
        <h1 className="balance-label">{t("home.balance")}</h1>
        <div className="balance-figure" aria-live="polite">
          <span className="balance-int">
            {parts.negative ? "−" : ""}
            {parts.integer}
          </span>
          <span className="balance-frac">{parts.fraction}</span>
          <span className="balance-cur">{wallet.currency}</span>
        </div>
      </section>

      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setSheet({ kind: "new", type: "expense" })}
        >
          <Icon name="plus" size={16} />
          {t("home.addExpense")}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setSheet({ kind: "new", type: "income" })}
        >
          <Icon name="arrowDown" size={16} />
          {t("home.addMoney")}
        </button>
      </div>

      <section className="summary">
        <div className="summary-head">
          <h2 className="section-title">
            {t("home.summaryTitle", { month: currentMonthName() })}
          </h2>
        </div>
        <div className="summary-grid">
          <div className="stat">
            <span className="stat-k">{t("home.in")}</span>
            <span className="stat-v amt-in">
              {formatMoney(totals.income, wallet.currency, { sign: "always" })}
            </span>
          </div>
          <div className="stat">
            <span className="stat-k">{t("home.out")}</span>
            <span className="stat-v amt-out">
              {formatMoney(-totals.expense, wallet.currency, {
                sign: totals.expense === 0 ? "none" : "always",
              })}
            </span>
          </div>
          <div className="stat">
            <span className="stat-k">{t("home.net")}</span>
            <span className="stat-v">
              {formatMoney(totals.net, wallet.currency, {
                sign: totals.net === 0 ? "none" : "always",
              })}
            </span>
          </div>
        </div>
        <div
          className="flow-bar"
          role="img"
          aria-label={t("home.flowLabel", {
            income: formatMoney(totals.income, wallet.currency),
            expense: formatMoney(totals.expense, wallet.currency),
          })}
        >
          <span className="flow-in" style={{ width: `${incomeShare}%` }} />
          <span className="flow-out" style={{ width: `${100 - incomeShare}%` }} />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">{t("home.recent")}</h2>
          <Link className="link" to="/activity">
            {t("home.allActivity")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title={t("home.emptyTitle")}
            text={t("home.emptyText")}
          />
        ) : (
          <TransactionList
            items={recent}
            currency={wallet.currency}
            onOpen={(txn) => setDetailId(txn.id)}
          />
        )}
      </section>

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
