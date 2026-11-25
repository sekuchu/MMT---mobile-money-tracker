import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { backend } from "../backend";
import {
  type AccountUser,
  type Txn,
  type TxnInput,
  type Wallet,
  type WalletPatch,
} from "../backend/types";
import { friendlyError } from "../lib/errors";
import { useI18n } from "../lib/i18n";
import { fromCents, toCents } from "../lib/money";
import { useOnline } from "./useOnline";

export function useAuthUser() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      backend.auth.subscribe(
        (next) => {
          setUser(next);
          setLoading(false);
        },
        (err) => {
          setError(friendlyError(err));
          setLoading(false);
        },
      ),
    [],
  );

  return { user, loading, error };
}

export function useMembership(uid: string | null) {
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setWalletId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return backend.subscribeMembership(uid, (id) => {
      setWalletId(id);
      setLoading(false);
    });
  }, [uid]);

  return { walletId, loading };
}

/** Balance is always derived: opening balance + every recorded transaction. */
export function balanceFrom(initialBalance: number, transactions: Txn[]): number {
  const cents = transactions.reduce(
    (sum, txn) =>
      sum + (txn.type === "income" ? toCents(txn.amount) : -toCents(txn.amount)),
    toCents(initialBalance),
  );
  return fromCents(cents);
}

interface WalletData {
  user: AccountUser;
  wallet: Wallet;
  transactions: Txn[];
  balance: number;
  pendingCount: number;
  offline: boolean;
  latestTransaction: Txn | null;
  saveTransaction(input: TxnInput, id: string): Promise<void>;
  updateTransaction(id: string, input: TxnInput): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  updateWallet(patch: WalletPatch): Promise<void>;
  signOut(): Promise<void>;
}


const WalletContext = createContext<WalletData | null>(null);

export function useApp(): WalletData {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useApp must be used inside WalletDataProvider");
  return value;
}

interface ProviderProps {
  walletId: string;
  user: AccountUser;
  children: ReactNode;
}

export function WalletDataProvider({ walletId, user, children }: ProviderProps) {
  const { t } = useI18n();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Txn[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const online = useOnline();
  // The demo backend never talks to a network, so connectivity is not a
  // meaningful state there.
  const offline = backend.kind === "firebase" && !online;

  useEffect(() => {
    setWallet(null);
    setTransactions(null);
    setError(null);

    const stopWallet = backend.subscribeWallet(
      walletId,
      (next) => setWallet(next),
      (err) => setError(friendlyError(err)),
    );
    const stopTransactions = backend.subscribeTransactions(
      walletId,
      (next) => setTransactions(next),
      (err) => setError(friendlyError(err)),
    );

    return () => {
      stopWallet();
      stopTransactions();
    };
  }, [walletId]);

  const balance = useMemo(
    () => (wallet ? balanceFrom(wallet.initialBalance, transactions ?? []) : 0),
    [wallet, transactions],
  );

  const pendingCount = useMemo(
    () => (transactions ?? []).filter((txn) => txn.pending).length,
    [transactions],
  );

  if (!wallet || !transactions) {
    if (error) {
      return (
        <div className="splash">
          <div className="brand">
            <span className="brand-mark" />
            MMT
          </div>
          <p className="splash-title">{t("wallet.openError")}</p>
          <p className="splash-text">{error}</p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void backend.auth.signOut()}
          >
            {t("common.signOut")}
          </button>
        </div>
      );
    }
    return (
      <div className="splash">
        <div className="brand">
          <span className="brand-mark" />
          MMT
        </div>
        <p className="splash-text">{t("wallet.opening")}</p>
      </div>
    );
  }

  const value: WalletData = {
    user,
    wallet,
    transactions,
    balance,
    pendingCount,
    offline,
    latestTransaction: transactions[0] ?? null,
    saveTransaction: (input, id) => backend.saveTransaction(walletId, input, id),
    updateTransaction: (id, input) =>
      backend.updateTransaction(walletId, id, input),
    deleteTransaction: (id) => backend.deleteTransaction(walletId, id),
    updateWallet: (patch) => backend.updateWallet(walletId, patch),
    signOut: () => backend.auth.signOut(),
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
