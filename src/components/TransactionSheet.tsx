import { useRef, useState, type FormEvent } from "react";
import { useApp } from "../app/data";
import { type Category, type Txn, type TxnInput, type TxnType } from "../backend/types";
import { todayISO } from "../lib/dates";
import { friendlyError } from "../lib/errors";
import { useI18n } from "../lib/i18n";
import { CURRENCIES, amountForInput, formatMoney, parseAmount } from "../lib/money";
import { convertCurrency, rateLabel } from "../lib/rates";
import { Sheet } from "./Sheet";

export type SheetState =
  | { kind: "new"; type: TxnType }
  | { kind: "edit"; txn: Txn };

interface Props {
  state: SheetState;
  onClose: () => void;
}

const MAX_AMOUNT = 1_000_000_000;

export function TransactionSheet({ state, onClose }: Props) {
  const app = useApp();
  const { t } = useI18n();
  const editing = state.kind === "edit" ? state.txn : null;
  const type: TxnType = editing ? editing.type : state.kind === "new" ? state.type : "expense";
  const isIncome = type === "income";

  const [amountText, setAmountText] = useState(
    editing ? amountForInput(editing.amount, app.wallet.currency) : "",
  );
  // Foreign currency is chosen per entry; the saved amount is always converted
  // into the wallet's own currency.
  const [inputCurrency, setInputCurrency] = useState(app.wallet.currency);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [category] = useState<Category>(
    editing?.category ?? "food",
  );
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // One id per sheet session: a retry rewrites the same document, never a duplicate.
  const idRef = useRef<string>(
    editing ? editing.id : crypto.randomUUID(),
  );

  const parsedAmount = parseAmount(amountText);
  const walletAmount =
    parsedAmount === null
      ? null
      : convertCurrency(parsedAmount, inputCurrency, app.wallet.currency);
  const converting = inputCurrency !== app.wallet.currency;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    if (parsedAmount === null || parsedAmount <= 0 || !walletAmount) {
      setError(t("txn.errAmount"));
      return;
    }
    if (walletAmount > MAX_AMOUNT) {
      setError(t("txn.errTooLarge"));
      return;
    }
    const trimmedDescription = description.trim();
    if (!isIncome && !trimmedDescription) {
      setError(t("txn.errDescription"));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError(t("txn.errDate"));
      return;
    }

    const input: TxnInput = {
      amount: walletAmount,
      type,
      description: trimmedDescription || t("txn.moneyAdded"),
      category: isIncome ? null : category,
      date,
      notes: notes.trim(),
    };

    setBusy(true);
    setError(null);
    try {
      if (editing) await app.updateTransaction(editing.id, input);
      else await app.saveTransaction(input, idRef.current);
      onClose();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || busy) return;
    setBusy(true);
    setError(null);
    try {
      await app.deleteTransaction(editing.id);
      onClose();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={
        editing
          ? t("txn.editTitle")
          : isIncome
            ? t("txn.newIncomeTitle")
            : t("txn.newExpenseTitle")
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="amount-row">
          <input
            className="amount-input"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            aria-label={t("txn.amountAria", { currency: inputCurrency })}
            value={amountText}
            onChange={(event) => {
              setAmountText(event.target.value);
              setError(null);
            }}
          />
          <select
            className="amount-cur-select"
            aria-label={t("common.currency")}
            value={inputCurrency}
            onChange={(event) => {
              setInputCurrency(event.target.value);
              setError(null);
            }}
          >
            {CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code}
              </option>
            ))}
          </select>
        </div>
        <p className="amount-hint">
          {isIncome ? t("txn.incomeHint") : t("txn.expenseHint")}
        </p>

        {converting && walletAmount !== null && parsedAmount !== null && parsedAmount > 0 ? (
          <p className="amount-convert" aria-live="polite">
            {t("txn.converted", {
              amount: formatMoney(walletAmount, app.wallet.currency),
              rate: rateLabel(inputCurrency, app.wallet.currency),
            })}
          </p>
        ) : null}

        <label className="field">
          <span className="field-label">{t("txn.description")}</span>
          <input
            className="input"
            value={description}
            maxLength={120}
            placeholder={
              isIncome
                ? t("txn.descriptionPlaceholderIncome")
                : t("txn.descriptionPlaceholderExpense")
            }
            onChange={(event) => {
              setDescription(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="field">
          <span className="field-label">{t("txn.date")}</span>
          <input
            type="date"
            className="input"
            value={date}
            required
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t("txn.notes")} <span className="field-optional">{t("common.optional")}</span>
          </span>
          <textarea
            className="input textarea"
            rows={2}
            maxLength={400}
            placeholder={t("txn.notesPlaceholder")}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="sheet-actions">
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy}
          >
            {busy
              ? t("txn.saving")
              : editing
                ? t("txn.saveChanges")
                : isIncome
                  ? t("txn.newIncomeTitle")
                  : t("txn.newExpenseTitle")}
          </button>

          {editing ? (
            confirmDelete ? (
              <div className="confirm-row">
                <span>
                  {isIncome ? t("txn.confirmDeleteIncome") : t("txn.confirmDeleteExpense")}
                </span>
                <div className="confirm-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setConfirmDelete(false)}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-solid"
                    disabled={busy}
                    onClick={() => void handleDelete()}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={() => setConfirmDelete(true)}
              >
                {t("txn.deleteTransaction")}
              </button>
            )
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}
