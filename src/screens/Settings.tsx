import { useEffect, useState, type FormEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { useApp } from "../app/data";
import { canCheckUpdates, checkForUpdates, type UpdateOutcome } from "../app/updates";
import { backend } from "../backend";
import { resetDemoData } from "../backend/demo";
import { Icon } from "../components/Icon";
import { friendlyError } from "../lib/errors";
import { useI18n } from "../lib/i18n";
import { CURRENCIES, amountForInput, parseAmount } from "../lib/money";

type Theme = "light" | "dark";
type UpdateState = "idle" | "checking" | UpdateOutcome | "error";

const THEME_KEY = "mmt-theme";
const THEME_COLORS: Record<Theme, string> = {
  light: "#f6f8fb",
  dark: "#0b1426",
};

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[theme]);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable, the theme just won't persist */
  }
}

export function Settings() {
  const app = useApp();
  const { t, lang, setLang } = useI18n();
  const { wallet } = app;

  const [name, setName] = useState(wallet.name);
  const [currency, setCurrency] = useState(wallet.currency);
  const [opening, setOpening] = useState(
    amountForInput(wallet.initialBalance, wallet.currency),
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const { pendingCount, offline } = app;

  const themeOptions: { id: Theme; label: string }[] = [
    { id: "light", label: t("settings.themeLight") },
    { id: "dark", label: t("settings.themeDark") },
  ];

  const syncLabel = offline
    ? t("settings.syncOffline")
    : pendingCount > 0
      ? t("settings.syncPending")
      : t("settings.syncDone");

  // Keep fields in step when the other member changes the wallet, unless the
  // user is in the middle of editing.
  useEffect(() => {
    if (dirty) return;
    setName(wallet.name);
    setCurrency(wallet.currency);
    setOpening(amountForInput(wallet.initialBalance, wallet.currency));
  }, [wallet.name, wallet.currency, wallet.initialBalance, dirty]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2200);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const markDirty = () => {
    setDirty(true);
    setError(null);
    setSaved(false);
  };

  const chooseTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const initialBalance = parseAmount(opening);
    if (initialBalance === null || initialBalance < 0) {
      setError(t("setup.errOpening"));
      return;
    }
    if (!name.trim()) {
      setError(t("setup.walletName"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await app.updateWallet({ name: name.trim(), currency, initialBalance });
      setDirty(false);
      setSaved(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const copy = async (kind: "code" | "link") => {
    const value =
      kind === "code"
        ? wallet.inviteCode
        : `${window.location.origin}/join/${wallet.inviteCode}`;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const runUpdateCheck = async () => {
    if (updateState === "checking") return;
    setUpdateState("checking");
    try {
      setUpdateState(await checkForUpdates());
    } catch {
      setUpdateState("error");
    }
  };

  const updateMessage =
    updateState === "ready"
      ? t("settings.updateReady")
      : updateState === "none"
        ? t("settings.updateCurrent")
        : updateState === "error"
          ? t("settings.updateError")
          : t("settings.updatesHint");

  const bothJoined = wallet.members.length >= 2;

  return (
    <>
      <section className="block"></section>
      <form className="settings" onSubmit={save}>
        <section className="block">
          <h2 className="section-title">{t("settings.wallet")}</h2>
          <div className="field-row">
            <label className="field">
              <span className="field-label">{t("common.currency")}</span>
              <select
                className="input select"
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value);
                  markDirty();
                }}
              >
                {CURRENCIES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code}
                  </option>
                ))}
              </select>
            </label>
            <div className="settings-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!dirty || saving}
              >
                {saving ? t("settings.saving") : t("settings.save")}
              </button>
              {saved ? (
                <span className="saved-note">
                  <Icon name="check" size={14} /> {t("common.saved")}
                </span>
              ) : null}
            </div>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        <section className="block">
          <h2 className="section-title">{t("settings.appearance")}</h2>
          <div className="seg" role="group" aria-label={t("settings.appearance")}>
            {themeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={theme === option.id ? "seg-item is-on" : "seg-item"}
                aria-pressed={theme === option.id}
                onClick={() => chooseTheme(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="block">
          <h2 className="section-title">{t("settings.language")}</h2>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setLang(lang === "sr" ? "en" : "sr")}
          >
            {lang === "sr" ? "English" : "Srpski"}
          </button>
        </section>

        <section className="block">
          <h2 className="section-title">
            {t("settings.members", { state: syncLabel })}
          </h2>
          <div className="member-list">
            {wallet.members.map((uid) => (
              <div className="member" key={uid}>
                <span className="member-avatar" aria-hidden="true">
                  {(wallet.memberNames[uid] ?? "M").slice(0, 1).toUpperCase()}
                </span>
                <span className="member-name">
                  {wallet.memberNames[uid] ?? t("settings.memberFallback")}
                  {uid === app.user.uid ? (
                    <span className="member-you">{t("settings.you")}</span>
                  ) : null}
                </span>
              </div>
            ))}
            {!bothJoined ? (
              <div className="member member-empty">
                <span className="member-avatar" aria-hidden="true">
                  +
                </span>
                <span className="member-name muted">{t("settings.waitingMember")}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="block">
          <h2 className="section-title">{t("settings.invite")}</h2>
          <div className="invite-card">
            <div className="invite-code">{wallet.inviteCode || "—"}</div>
            <div className="invite-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => void copy("code")}
              >
                {copied === "code" ? <Icon name="check" size={14} /> : <Icon name="copy" size={14} />}
                {copied === "code" ? t("settings.copied") : t("settings.copyCode")}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => void copy("link")}
              >
                {copied === "link" ? <Icon name="check" size={14} /> : <Icon name="copy" size={14} />}
                {copied === "link" ? t("settings.copied") : t("settings.copyLink")}
              </button>
            </div>
          </div>
          <p className="hint">{t("settings.inviteHint")}</p>
        </section>
      </form>

      <section className="block block-last">
        <h2 className="section-title">{t("settings.account")}</h2>
        <div className="account-row">
          <div>
            <span className="account-name">{app.user.name}</span>
            <span className="account-email">{app.user.email ?? "—"}</span>
          </div>
          {confirmSignOut ? (
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmSignOut(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => void app.signOut()}
              >
                {t("common.signOut")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setConfirmSignOut(true)}
            >
              {t("common.signOut")}
            </button>
          )}
        </div>

        {canCheckUpdates && Capacitor.isNativePlatform() ? (
          <div className="account-row">
            <div>
              <span className="account-name">{t("settings.updates")}</span>
              <span className="account-email">{updateMessage}</span>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={updateState === "checking"}
              onClick={() => void runUpdateCheck()}
            >
              {updateState === "checking"
                ? t("settings.checking")
                : t("settings.checkUpdates")}
            </button>
          </div>
        ) : null}

        {backend.kind === "demo" ? (
          <div className="account-row account-row-demo">
            <div>
              <span className="account-name">{t("settings.demoName")}</span>
              <span className="account-email">{t("settings.demoText")}</span>
            </div>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (window.confirm(t("settings.resetConfirm"))) {
                  resetDemoData();
                }
              }}
            >
              {t("settings.reset")}
            </button>
          </div>
        ) : null}
      </section>
    </>
  );
}
