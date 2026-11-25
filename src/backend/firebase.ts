import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { randomInviteCode } from "../lib/ids";
import { t } from "../lib/strings";
import {
  CATEGORIES,
  type AccountUser,
  type Backend,
  type Category,
  type Txn,
  type TxnInput,
  type Wallet,
  type WalletPatch,
} from "./types";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.id));

function toAccountUser(user: FirebaseUser | null): AccountUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName || (user.email ?? "").split("@")[0] || "Member",
  };
}

function millis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return null;
}

function toTxn(id: string, data: Record<string, unknown>, pending: boolean): Txn {
  const category =
    typeof data.category === "string" && VALID_CATEGORIES.has(data.category)
      ? (data.category as Category)
      : null;
  return {
    id,
    amount: Number(data.amount ?? 0),
    type: data.type === "income" ? "income" : "expense",
    description: typeof data.description === "string" ? data.description : "",
    category: data.type === "income" ? null : category,
    date: typeof data.date === "string" ? data.date : "",
    notes: typeof data.notes === "string" ? data.notes : "",
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    createdAt: millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
    pending,
  };
}

function toWallet(id: string, data: Record<string, unknown>): Wallet {
  const members = Array.isArray(data.members)
    ? data.members.filter((m): m is string => typeof m === "string")
    : [];
  const memberNames =
    data.memberNames && typeof data.memberNames === "object"
      ? (data.memberNames as Record<string, string>)
      : {};
  return {
    id,
    name: typeof data.name === "string" ? data.name : "Shared wallet",
    currency: typeof data.currency === "string" ? data.currency : "RSD",
    initialBalance: Number(data.initialBalance ?? 0),
    members,
    memberNames,
    inviteCode: typeof data.inviteCode === "string" ? data.inviteCode : "",
  };
}

/** Firestore rejects `undefined`, so every optional field is written as null. */
function txnPayload(input: TxnInput) {
  return {
    amount: Math.round(input.amount * 100) / 100,
    type: input.type,
    description: input.description.trim(),
    category: input.type === "expense" ? input.category : null,
    date: input.date,
    notes: input.notes.trim(),
  };
}

function transactionOrder(a: Txn, b: Txn): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const aTime = a.createdAt ?? Number.MAX_SAFE_INTEGER;
  const bTime = b.createdAt ?? Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return bTime - aTime;
  return a.id < b.id ? 1 : -1;
}

export function createFirebaseBackend(config: FirebaseConfig): Backend {
  const app: FirebaseApp = initializeApp(config);
  const auth: Auth = getAuth(app);

  let db: Firestore;
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Persistence can be unavailable (private mode, unsupported browser).
    db = initializeFirestore(app, {});
  }

  return {
    kind: "firebase",

    auth: {
      subscribe(cb, onError) {
        return onAuthStateChanged(
          auth,
          (user) => cb(toAccountUser(user)),
          (error) => onError?.(error),
        );
      },
      async signUp(email, password, name) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        const displayName = name.trim();
        if (displayName) {
          await updateProfile(credential.user, { displayName });
          await setDoc(
            doc(db, "users", credential.user.uid),
            { name: displayName, email: credential.user.email },
            { merge: true },
          );
        }
      },
      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async signOut() {
        await fbSignOut(auth);
      },
    },

    async createWallet(user, input) {
      const walletRef = doc(collection(db, "wallets"));
      const inviteCode = randomInviteCode();
      await setDoc(walletRef, {
        name: input.name.trim() || "Our wallet",
        currency: input.currency,
        initialBalance: Math.round(input.initialBalance * 100) / 100,
        members: [user.uid],
        memberNames: { [user.uid]: user.name },
        inviteCode,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      await setDoc(
        doc(db, "invites", inviteCode),
        { walletId: walletRef.id, createdBy: user.uid, createdAt: serverTimestamp() },
      );
      await setDoc(
        doc(db, "users", user.uid),
        { name: user.name, email: user.email, walletId: walletRef.id },
        { merge: true },
      );
      return walletRef.id;
    },

    async joinWallet(user, rawCode) {
      const code = rawCode.trim().toUpperCase();
      const inviteSnap = await getDoc(doc(db, "invites", code));
      if (!inviteSnap.exists()) {
        throw new Error(t("err.inviteInvalid"));
      }
      const walletId = String(inviteSnap.data().walletId ?? "");
      if (!walletId) throw new Error(t("err.inviteInvalid"));

      await updateDoc(doc(db, "wallets", walletId), {
        members: arrayUnion(user.uid),
        [`memberNames.${user.uid}`]: user.name,
      });
      await setDoc(
        doc(db, "users", user.uid),
        { name: user.name, email: user.email, walletId },
        { merge: true },
      );
      return walletId;
    },

    subscribeMembership(uid, cb, onError) {
      return onSnapshot(
        doc(db, "users", uid),
        (snap) => {
          const walletId = snap.data()?.walletId;
          cb(typeof walletId === "string" && walletId ? walletId : null);
        },
        (error) => onError?.(error),
      );
    },

    subscribeWallet(walletId, cb, onError) {
      return onSnapshot(
        doc(db, "wallets", walletId),
        (snap) => {
          if (!snap.exists()) return;
          cb(toWallet(snap.id, snap.data()));
        },
        (error) => onError?.(error),
      );
    },

    subscribeTransactions(walletId, cb, onError) {
      const transactions = query(
        collection(db, "wallets", walletId, "transactions"),
        orderBy("date", "desc"),
      );
      return onSnapshot(
        transactions,
        { includeMetadataChanges: true },
        (snap) => {
          const list = snap.docs.map((item) =>
            toTxn(item.id, item.data(), item.metadata.hasPendingWrites),
          );
          list.sort(transactionOrder);
          cb(list);
        },
        (error) => onError?.(error),
      );
    },

    async updateWallet(walletId, patch: WalletPatch) {
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (patch.name !== undefined) payload.name = patch.name.trim();
      if (patch.currency !== undefined) payload.currency = patch.currency;
      if (patch.initialBalance !== undefined) {
        payload.initialBalance = Math.round(patch.initialBalance * 100) / 100;
      }
      await updateDoc(doc(db, "wallets", walletId), payload);
    },

    async saveTransaction(walletId, input, id) {
      const ref = doc(db, "wallets", walletId, "transactions", id);
      const user = auth.currentUser;
      if (!user) throw new Error(t("err.signedOut"));
      // setDoc with a caller-generated id is idempotent: a retry after a lost
      // acknowledgement rewrites the same document instead of adding a second one.
      await setDoc(ref, {
        ...txnPayload(input),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },

    async updateTransaction(walletId, id, input) {
      await updateDoc(doc(db, "wallets", walletId, "transactions", id), {
        ...txnPayload(input),
        updatedAt: serverTimestamp(),
      });
    },

    async deleteTransaction(walletId, id) {
      await deleteDoc(doc(db, "wallets", walletId, "transactions", id));
    },
  };
}

