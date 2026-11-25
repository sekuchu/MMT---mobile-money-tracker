import { useApp } from "../app/data";
import type { Txn } from "../backend/types";
import { formatDateTime, formatFullDate } from "../lib/dates";
import { useI18n } from "../lib/i18n";
import { formatMoney } from "../lib/money";
import { Sheet } from "./Sheet";

interface Props {
  txn: Txn;
  onClose: () => void;
  onEdit: () => void;
}

export function TransactionDetail({ txn, onClose, onEdit }: Props) {
  const app = useApp();
  const { t } = useI18n();
  const isIncome = txn.type === "income";
  const author = txn.createdBy ? app.wallet.memberNames[txn.createdBy] : "";
  const authorLabel = author || t("settings.memberFallback");
  const isMe = txn.createdBy === app.user.uid;

  return (
    <Sheet title={t("detail.title")} onClose={onClose}>
      <div className="detail-head">
        <span className={isIncome ? "detail-amount amt-in" : "detail-amount amt-out"}>
          {formatMoney(isIncome ? txn.amount : -txn.amount, app.wallet.currency, {
            sign: "always",
          })}
        </span>
        <span className="detail-desc">
          {txn.description || (isIncome ? t("txn.moneyAdded") : t("txn.expenseFallback"))}
        </span>
      </div>

      <dl className="detail-list">
        <div className="detail-row">
          <dt>{t("detail.type")}</dt>
          <dd>{isIncome ? t("txn.incomeAria") : t("txn.expenseAria")}</dd>
        </div>
        <div className="detail-row">
          <dt>{t("detail.date")}</dt>
          <dd>{formatFullDate(txn.date)}</dd>
        </div>
        <div className="detail-row">
          <dt>{t("detail.addedBy")}</dt>
          <dd>
            {authorLabel}
            {isMe ? <span className="detail-you"> · {t("detail.you")}</span> : null}
          </dd>
        </div>
        <div className="detail-row">
          <dt>{t("detail.addedAt")}</dt>
          <dd>{txn.createdAt ? formatDateTime(txn.createdAt) : t("txn.pending")}</dd>
        </div>
      </dl>

      <div className="detail-note">
        <span className="field-label">{t("detail.notes")}</span>
        {txn.notes.trim() ? (
          <p className="detail-note-text">{txn.notes.trim()}</p>
        ) : (
          <p className="detail-note-text muted">{t("detail.noNotes")}</p>
        )}
      </div>

      <div className="sheet-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={onEdit}>
          {t("detail.edit")}
        </button>
      </div>
    </Sheet>
  );
}
