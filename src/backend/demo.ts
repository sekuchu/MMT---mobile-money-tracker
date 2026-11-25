import { newId, randomInviteCode } from "../lib/ids";
import { t } from "../lib/strings";
import {
  type AccountUser,
  type Backend,
  type Category,
  type Txn,
  type Wallet,
  type WalletPatch,
} from "./types";

/**
 * Local-only backend used before Firebase credentials are configured.
 * It mirrors the Firestore contract (subscriptions, shared wallet, invite
 * codes, derived balance) and syncs across tabs through localStorage events,
 * so the interface can be exercised end to end without a project.
 */

const STORAGE_KEY = "mmt.demo.v2";

interface DemoUser {
  uid: string;
  email: string;
  name: string;
  password: string;
  walletId: string | null;
}

interface DemoWallet {
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
  members: string[];
  memberNames: Record<string, string>;
  inviteCode: string;
}

interface DemoTxn {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  category: Category | null;
  date: string;
  notes: string;
  createdBy: string;
  createdAt: number | null;
  updatedAt: number | null;
}

interface DemoDB {
  users: DemoUser[];
  wallets: DemoWallet[];
  transactions: Record<string, DemoTxn[]>;
  invites: Record<string, string>;
  session: string | null;
}

const emptyDb = (): DemoDB => ({
  users: [],
  wallets: [],
  transactions: {},
  invites: {},
  session: null,
});

function load(): DemoDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw) as Partial<DemoDB>;
    return {
      ...emptyDb(),
      ...parsed,
      users: parsed.users ?? [],
      wallets: parsed.wallets ?? [],
      transactions: parsed.transactions ?? {},
      invites: parsed.invites ?? {},
    };
  } catch {
    return emptyDb();
  }
}

let db: DemoDB = load();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of Array.from(listeners)) listener();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage may be full or blocked; in-memory state still works for this tab.
  }
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      db = load();
      notify();
    }
  });
}

function watch<T>(
  select: (database: DemoDB) => T,
  cb: (value: T) => void,
): () => void {
  cb(select(db));
  const listener = () => cb(select(db));
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function currentUser(): DemoUser | null {
  if (!db.session) return null;
  return db.users.find((user) => user.uid === db.session) ?? null;
}

function toAccountUser(user: DemoUser | null): AccountUser | null {
  if (!user) return null;
  return { uid: user.uid, email: user.email, name: user.name };
}

function walletById(walletId: string): DemoWallet | undefined {
  return db.wallets.find((wallet) => wallet.id === walletId);
}

function toWallet(wallet: DemoWallet): Wallet {
  return {
    id: wallet.id,
    name: wallet.name,
    currency: wallet.currency,
    initialBalance: wallet.initialBalance,
    members: [...wallet.members],
    memberNames: { ...wallet.memberNames },
    inviteCode: wallet.inviteCode,
  };
}

function toTxn(txn: DemoTxn): Txn {
  return { ...txn, pending: false };
}

function sortTransactions(list: Txn[]): Txn[] {
  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

export function createDemoBackend(): Backend {
  return {
    kind: "demo",

    auth: {
      subscribe(cb) {
        return watch(currentUser, (user) => cb(toAccountUser(user)));
      },
      async signUp(email, password, name) {
        const normalized = email.trim().toLowerCase();
        if (db.users.some((user) => user.email === normalized)) {
          throw new Error(t("err.emailInUse"));
        }
        const user: DemoUser = {
          uid: newId(),
          email: normalized,
          name: name.trim() || normalized.split("@")[0],
          password,
          walletId: null,
        };
        db = { ...db, users: [...db.users, user], session: user.uid };
        persist();
      },
      async signIn(email, password) {
        const normalized = email.trim().toLowerCase();
        const user = db.users.find(
          (candidate) =>
            candidate.email === normalized && candidate.password === password,
        );
        if (!user) throw new Error(t("err.badCredentials"));
        db = { ...db, session: user.uid };
        persist();
      },
      async signOut() {
        db = { ...db, session: null };
        persist();
      },
    },

    async createWallet(user, input) {
      const walletId = newId();
      const inviteCode = randomInviteCode();
      const wallet: DemoWallet = {
        id: walletId,
        name: input.name.trim() || "Our wallet",
        currency: input.currency,
        initialBalance: Math.round(input.initialBalance * 100) / 100,
        members: [user.uid],
        memberNames: { [user.uid]: user.name },
        inviteCode,
      };
      db = {
        ...db,
        wallets: [...db.wallets, wallet],
        transactions: { ...db.transactions, [walletId]: [] },
        invites: { ...db.invites, [inviteCode]: walletId },
        users: db.users.map((candidate) =>
          candidate.uid === user.uid ? { ...candidate, walletId } : candidate,
        ),
      };
      persist();
      return walletId;
    },

    async joinWallet(user, rawCode) {
      const code = rawCode.trim().toUpperCase();
      const walletId = db.invites[code];
      const wallet = walletId ? walletById(walletId) : undefined;
      if (!wallet) {
        throw new Error(t("err.inviteInvalid"));
      }
      if (!wallet.members.includes(user.uid)) {
        if (wallet.members.length >= 2) {
          throw new Error(t("err.walletFull"));
        }
        db = {
          ...db,
          wallets: db.wallets.map((candidate) =>
            candidate.id === wallet.id
              ? {
                  ...candidate,
                  members: [...candidate.members, user.uid],
                  memberNames: {
                    ...candidate.memberNames,
                    [user.uid]: user.name,
                  },
                }
              : candidate,
          ),
          users: db.users.map((candidate) =>
            candidate.uid === user.uid ? { ...candidate, walletId } : candidate,
          ),
          transactions: db.transactions[wallet.id]
            ? db.transactions
            : { ...db.transactions, [wallet.id]: [] },
        };
        persist();
      }
      return wallet.id;
    },

    subscribeMembership(uid, cb) {
      return watch(
        (database) => database.users.find((user) => user.uid === uid)?.walletId ?? null,
        cb,
      );
    },

    subscribeWallet(walletId, cb) {
      return watch(
        (database) => {
          const wallet = database.wallets.find((item) => item.id === walletId);
          return wallet ? toWallet(wallet) : null;
        },
        (wallet) => {
          if (wallet) cb(wallet);
        },
      );
    },

    subscribeTransactions(walletId, cb) {
      return watch(
        (database) => (database.transactions[walletId] ?? []).map(toTxn),
        (list) => cb(sortTransactions(list)),
      );
    },

    async updateWallet(walletId, patch: WalletPatch) {
      const wallet = walletById(walletId);
      if (!wallet) throw new Error(t("err.walletMissing"));
      const updated: DemoWallet = {
        ...wallet,
        name: patch.name !== undefined ? patch.name.trim() : wallet.name,
        currency: patch.currency ?? wallet.currency,
        initialBalance:
          patch.initialBalance !== undefined
            ? Math.round(patch.initialBalance * 100) / 100
            : wallet.initialBalance,
      };
      db = {
        ...db,
        wallets: db.wallets.map((item) => (item.id === walletId ? updated : item)),
      };
      persist();
    },

    async saveTransaction(walletId, input, id) {
      const user = currentUser();
      if (!user) throw new Error(t("err.signedOut"));
      const list = db.transactions[walletId] ?? [];
      if (list.some((txn) => txn.id === id)) return; // idempotent retry
      const now = Date.now();
      const txn: DemoTxn = {
        id,
        amount: Math.round(input.amount * 100) / 100,
        type: input.type,
        description: input.description.trim(),
        category: input.type === "expense" ? input.category : null,
        date: input.date,
        notes: input.notes.trim(),
        createdBy: user.uid,
        createdAt: now,
        updatedAt: now,
      };
      db = {
        ...db,
        transactions: { ...db.transactions, [walletId]: [...list, txn] },
      };
      persist();
    },

    async updateTransaction(walletId, id, input) {
      const list = db.transactions[walletId] ?? [];
      const existing = list.find((txn) => txn.id === id);
      if (!existing) throw new Error(t("err.txnMissing"));
      const updated: DemoTxn = {
        ...existing,
        amount: Math.round(input.amount * 100) / 100,
        type: input.type,
        description: input.description.trim(),
        category: input.type === "expense" ? input.category : null,
        date: input.date,
        notes: input.notes.trim(),
        updatedAt: Date.now(),
      };
      db = {
        ...db,
        transactions: {
          ...db.transactions,
          [walletId]: list.map((txn) => (txn.id === id ? updated : txn)),
        },
      };
      persist();
    },

    async deleteTransaction(walletId, id) {
      const list = db.transactions[walletId] ?? [];
      db = {
        ...db,
        transactions: {
          ...db.transactions,
          [walletId]: list.filter((txn) => txn.id !== id),
        },
      };
      persist();
    },
  };
}

/** Clears demo data; exposed for the settings screen. */
export function resetDemoData() {
  db = emptyDb();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notify();
}
