import { useState, type FormEvent } from "react";
import { backend } from "../backend";
import { friendlyError } from "../lib/errors";
import { useI18n } from "../lib/i18n";

type Mode = "signin" | "signup";

export function AuthScreen({ inviteCode }: { inviteCode: string | null }) {
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setError(t("auth.errMissing"));
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError(t("auth.errShortPassword"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        await backend.auth.signIn(email, password);
      } else {
        await backend.auth.signUp(email, password, name);
      }
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <button
        type="button"
        className="lang-toggle"
        onClick={() => setLang(lang === "sr" ? "en" : "sr")}
      >
        {lang === "sr" ? "English" : "Srpski"}
      </button>

      <div className="auth-head">
        <h1 className="auth-title">{t("auth.title")}</h1>
        <p className="auth-sub">{t("auth.sub")}</p>
      </div>

      <form className="auth-form" onSubmit={submit} noValidate>
        {inviteCode ? (
          <div className="invite-note">
            <span className="invite-note-label">{t("auth.joining")}</span>
            <span className="invite-code-sm">{inviteCode}</span>
          </div>
        ) : null}

        {mode === "signup" ? (
          <label className="field">
            <span className="field-label">{t("auth.name")}</span>
            <input
              className="input"
              value={name}
              autoComplete="name"
              maxLength={40}
              placeholder="Branko"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        ) : null}

        <label className="field">
          <span className="field-label">{t("auth.email")}</span>
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            placeholder="you@example.com"
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="field">
          <span className="field-label">{t("auth.password")}</span>
          <input
            className="input"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            placeholder={
              mode === "signup" ? t("auth.passwordMinimum") : "••••••••"
            }
            onChange={(event) => {
              setPassword(event.target.value);
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
          {busy
            ? t("auth.pleaseWait")
            : mode === "signin"
              ? t("auth.signIn")
              : t("auth.createAccount")}
        </button>

        <p className="auth-switch">
          {mode === "signin" ? t("auth.newHere") : t("auth.haveAccount")}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
          >
            {t("auth.createAnAccount")}
          </button>
        </p>
      </form>

      {backend.kind === "demo" ? (
        <p className="demo-note">
          <strong>{t("auth.demoTitle")}</strong> {t("auth.demoText")}
        </p>
      ) : null}
    </div>
  );
}
