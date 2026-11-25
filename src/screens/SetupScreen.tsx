import { useState, type FormEvent } from "react";
import { backend } from "../backend";
import { friendlyError } from "../lib/errors";
import { useI18n } from "../lib/i18n";
import { CURRENCIES, DEFAULT_CURRENCY, parseAmount } from "../lib/money";

type Mode = "create" | "join";

export function SetupScreen({
  inviteCode,
  user,
}: {
  inviteCode: string | null;
  user: { uid: string; email: string | null; name: string };
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>(inviteCode ? "join" : "create");
  const [walletName, setWalletName] = useState(() => t("setup.defaultName"));
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [opening, setOpening] = useState("");
  const [code, setCode] = useState(inviteCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const createWallet = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const openingRaw = opening.trim();
    const initialBalance = openingRaw ? parseAmount(openingRaw) : 0;
    if (initialBalance === null || initialBalance < 0) {
      setError(t("setup.errOpening"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await backend.createWallet(user, {
        name: walletName,
        currency,
        initialBalance,
      });
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  const joinWallet = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (code.trim().length < 4) {
      setError(t("setup.errCode"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await backend.joinWallet(user, code);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <div className="setup">
      <div className="setup-head">
        <h1 className="auth-title">
          {mode === "create" ? t("setup.createTitle") : t("setup.joinTitle")}
        </h1>
        <p className="auth-sub">
          {mode === "create" ? t("setup.createSub") : t("setup.joinSub")}
        </p>
      </div>

      <div className="tabs" role="tablist" aria-label={t("a11y.walletSetup")}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "create"}
          className={mode === "create" ? "tab is-on" : "tab"}
          onClick={() => {
            setMode("create");
            setError(null);
          }}
        >
          {t("setup.tabCreate")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "join"}
          className={mode === "join" ? "tab is-on" : "tab"}
          onClick={() => {
            setMode("join");
            setError(null);
          }}
        >
          {t("setup.tabJoin")}
        </button>
      </div>

      {mode === "create" ? (
        <form className="auth-form" onSubmit={createWallet} noValidate>
          <label className="field">
            <span className="field-label">{t("setup.walletName")}</span>
            <input
              className="input"
              value={walletName}
              maxLength={60}
              onChange={(event) => setWalletName(event.target.value)}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span className="field-label">{t("common.currency")}</span>
              <select
                className="input select"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {CURRENCIES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} — {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{t("setup.opening")}</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="0,00"
                value={opening}
                onChange={(event) => {
                  setOpening(event.target.value);
                  setError(null);
                }}
              />
            </label>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t("setup.creating") : t("setup.createWallet")}
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={joinWallet} noValidate>
          <label className="field">
            <span className="field-label">{t("setup.inviteCode")}</span>
            <input
              className="input code-input"
              value={code}
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="A1B2C3"
              onChange={(event) => {
                setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                setError(null);
              }}
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t("setup.joining") : t("setup.joinWallet")}
          </button>
        </form>
      )}

      <div className="setup-footer">
        <span>
          {t("setup.signedInAs", { email: user.email ?? user.name })}
        </span>
        <button
          type="button"
          className="text-button"
          onClick={() => void backend.auth.signOut()}
        >
          {t("common.signOut")}
        </button>
      </div>
    </div>
  );
}
