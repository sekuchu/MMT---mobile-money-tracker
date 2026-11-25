# MMT

A small money tracker I built for me and my partner. There's one shared balance
and one list of transactions, and both of us see the same thing on our phones.
Nothing fancy, it just does what we needed.

Built with React, TypeScript and Vite. Firebase handles login and the database
(Firestore), and Capacitor wraps it into an Android app.

## How it works

- The balance isn't saved anywhere, it's calculated every time:
  opening balance + income - expenses. That way editing or deleting an entry
  can never leave the total wrong.
- Changes show up on both phones right away (Firestore listeners, no refreshing).
- It works offline. Entries made without internet are marked "Pending" and sync
  when the connection comes back.
- Only two people can ever be in a wallet. This is enforced in the Firestore
  rules, not just in the UI.

## Running it

```bash
npm install
npm run dev
```

If there are no Firebase keys in `.env` the app starts in demo mode. It stores
everything in the browser's localStorage, which is handy for trying things out,
but it's not a real backend (and it saves passwords in plain text, so don't
use a real one).

Other commands:

```bash
npm run build       # typecheck + production build
npm run typecheck
```

## Setting up Firebase

1. Make a project at https://console.firebase.google.com
2. Authentication -> Sign-in method -> turn on Email/Password
3. Firestore Database -> Create database (production mode)
4. Project settings -> add a Web app and copy the config into a `.env` file
   next to `package.json`:

   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

   These keys aren't secret, the security comes from `firestore.rules`.
   Just never put an admin or service account key in here.

5. Deploy the rules:

   ```bash
   firebase deploy --only firestore:rules
   ```

6. If you host the web version somewhere other than localhost, add the domain
   under Authentication -> Settings -> Authorized domains.

## Pairing two phones

1. The first person signs up and creates the wallet (currency + opening balance).
2. In Settings they copy the 6 character invite code, or the invite link.
3. The second person signs up and enters the code (or opens the link) and
   they're in.

Once there are two people the invite is used up. A third account can't join.

## Data

```
users/{userId}                            name, email, walletId
wallets/{walletId}                        name, currency, initialBalance, members, ...
wallets/{walletId}/transactions/{txnId}   amount, type, description, category, date, notes, ...
invites/{code}                            walletId, createdBy
```

Transaction ids are generated on the phone, so if a save gets retried it
overwrites the same entry instead of making a duplicate. Amounts are handled
in cents internally to avoid rounding problems.

## Security rules

- Only the two members can read or write a wallet and its transactions.
- Membership can only go from one to two people, and only by using a valid invite.
- Either of us can edit or delete the other's entries, but who created an entry
  and when can't be changed.
- Profiles can only be read by their owner.
- Wallets can't be deleted.

## Language and currency

The app is in Serbian by default and can be switched to English in Settings
(or on the sign-in screen). The text is all in `src/lib/strings.ts`.

When adding an entry you can choose a different currency than the wallet's.
It gets converted to the wallet currency before saving, using fixed rates in
`src/lib/rates.ts` (for example 1 BAM = 58 RSD). They're not live rates, so
update them by hand if they drift.

## Android and updates

The Android app is a Capacitor wrapper around the built web app. The `android/`
folder isn't in the repo, so if you want the app you have to build it yourself:

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

`cap add` creates the Android project from `capacitor.config.ts`, then Android
Studio builds and runs it (you need JDK 21). After that, every time the web code
changes just run `npm run build` and `npx cap sync android` again.

A few things you won't get from a fresh clone:

- **App icon:** you get the default Capacitor one. To use your own, put a
  source image in `assets/` and run `npx @capacitor/assets generate --android`.
- **Firebase keys:** `.env` isn't in the repo, so make your own (see above).
- **Updates:** the updater points at my hosting. Set `VITE_UPDATE_BASE_URL` to
  your own, or ignore it.
- **My Android settings:** version code, signing and so on. Set those yourself.

I don't want to reinstall the APK every time I change something, so it uses
`@capgo/capacitor-updater`. To push an update:

```bash
npm run build
npm run updates:publish             # zips dist/ and writes updates/latest.json
npx firebase deploy --only hosting
```

The app checks `latest.json` when it opens and when it comes back to the
foreground. If there's a newer version it downloads it and uses it on the next
start. There's also a manual check in Settings. The update URL defaults to
`https://<projectId>.web.app/latest.json`, and `VITE_UPDATE_BASE_URL` changes it.

Hosting has to be enabled in the Firebase project first, and the phone needs an
APK that already includes the updater. Anything native (new plugins,
permissions, appId, versionCode) still needs a fresh APK.

On the phone, swiping left/right switches between Home, Activity and Settings,
and the back button returns to Home before it closes the app.

## Folders

```
src/backend/       backend interface, Firestore version, demo version
src/app/           hooks, wallet provider, calculations
src/components/    sheet, transaction rows, nav, icons
src/screens/       auth, setup, home, activity, settings
src/lib/           money, dates, ids, error messages, strings, rates
firestore.rules    security rules
```
