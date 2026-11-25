import { useEffect, useState } from "react";
import {
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuthUser, useMembership, WalletDataProvider } from "./app/data";
import { NavGestures } from "./app/NavGestures";
import { useLiveUpdates } from "./app/useLiveUpdates";
import { BottomNav } from "./components/BottomNav";
import { useI18n } from "./lib/i18n";
import { Activity } from "./screens/Activity";
import { AuthScreen } from "./screens/AuthScreen";
import { Home } from "./screens/Home";
import { Settings } from "./screens/Settings";
import { SetupScreen } from "./screens/SetupScreen";

const INVITE_KEY = "mmt.invite";

function readStoredInvite(): string | null {
  try {
    const value = sessionStorage.getItem(INVITE_KEY);
    return value && /^[A-Z0-9]{4,8}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

function Splash({ label }: { label: string }) {
  return (
    <div className="splash">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        MMT
      </div>
      <p className="splash-text">{label}</p>
    </div>
  );
}

export function App() {
  const { t } = useI18n();
  const { user, loading, error } = useAuthUser();
  const { walletId, loading: membershipLoading } = useMembership(
    user?.uid ?? null,
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState<string | null>(readStoredInvite);
  useLiveUpdates();

  const joinMatch = /^\/join\/([A-Za-z0-9]+)\/?$/.exec(location.pathname);

  useEffect(() => {
    if (!joinMatch) return;
    const code = joinMatch[1].toUpperCase();
    setInviteCode(code);
    try {
      sessionStorage.setItem(INVITE_KEY, code);
    } catch {
      /* session storage can be blocked */
    }
  }, [location.pathname]);

  useEffect(() => {
    if (user && walletId && joinMatch) navigate("/", { replace: true });
  }, [user, walletId, joinMatch?.[1]]);

  let content: React.ReactNode;

  if (loading) {
    content = <Splash label={t("app.loading")} />;
  } else if (error) {
    content = (
      <div className="splash">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          MMT
        </div>
        <p className="splash-title">{t("app.accountError")}</p>
        <p className="splash-text">{error}</p>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => window.location.reload()}
        >
          {t("app.retry")}
        </button>
      </div>
    );
  } else if (!user) {
    content = <AuthScreen inviteCode={inviteCode} />;
  } else if (membershipLoading) {
    content = <Splash label={t("app.loadingWallet")} />;
  } else if (!walletId) {
    content = <SetupScreen inviteCode={inviteCode} user={user} />;
  } else {
    content = (
      <WalletDataProvider walletId={walletId} user={user}>
        <NavGestures />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <BottomNav />
      </WalletDataProvider>
    );
  }

  return <div className="app">{content}</div>;
}

