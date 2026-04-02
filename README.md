# CarePair — mobile (Expo)

Native **iOS** and **Android** app (Expo SDK 54, Expo Router). This folder is ready to be the **root of its own GitHub repository** for **EAS Build / Submit**, or to live inside a monorepo.

---

## Prerequisites

- [Node.js](https://nodejs.org/) LTS (v20+ recommended)
- [Expo account](https://expo.dev/signup)
- [EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli` (or use `npx eas-cli` per command)
- For store builds: Apple Developer Program + Google Play Console access

---

## Before `eas build` (preflight)

Run locally to catch TypeScript, config, and common Expo issues **before** spending EAS minutes:

```bash
npm run eas:preflight
```

This runs **`typecheck`**, **`expo config --type public`** (ensures `extra.eas.projectId` resolves — fixes [eas-config-mismatch](https://expo.fyi/eas-config-mismatch)), and **`expo-doctor`**.

**Optional native sanity check** (generates `android/` / `ios/`; requires Android SDK and/or Xcode tooling):

```bash
npm run prebuild:android
# macOS only:
npm run prebuild:ios
```

The Expo project ID is set in **`app.config.ts`** and duplicated under each profile’s **`env`** in **`eas.json`** so cloud builds always see the correct UUID. Override with **`EAS_PROJECT_ID`** if you point at a different Expo project.

**Sentry / EAS Android:** If `@sentry/react-native/expo` is enabled but **`SENTRY_ORG`** + **`SENTRY_AUTH_TOKEN`** are not set on EAS, release builds used to fail during `sentry-cli` source map upload. This repo sets **`SENTRY_DISABLE_AUTO_UPLOAD=true`** in **`eas.json`** so builds succeed; runtime reporting still works if **`EXPO_PUBLIC_SENTRY_DSN`** is set. To upload maps, add Sentry secrets and clear that flag (see **`.env.example`**).

**First iOS build — *Distribution Certificate is not validated for non-interactive builds*:** Builds started from **expo.dev** (or any CI) run **`build:internal`**, which is **non-interactive**. EAS may show *Using remote iOS credentials* but still fail until Apple signing is wired for that mode.

1. **Recommended for cloud builds — App Store Connect API key** (lets Expo talk to Apple without an interactive prompt each time). Create a key in [App Store Connect → Users and Access → Integrations](https://appstoreconnect.apple.com/access/users) (save the **.p8**, **Key ID**, **Issuer ID**; role **Admin** is typical). Then from **`mobile/`** with a working `eas login`:
   ```bash
   npx eas-cli@latest credentials --platform ios
   ```
   Select the **`production`** profile → **App Store Connect: Manage your API Key** → register the key for this project (Expo’s [iOS submit — CI/CD](https://docs.expo.dev/submit/ios/#submitting-your-app-using-cicd-services) describes this path). After the key is stored on Expo, trigger the iOS production build again from the dashboard. See also [expo.fyi/creating-asc-api-key](https://expo.fyi/creating-asc-api-key).

2. **Alternative — one interactive local run** (when `eas login` works on your network):  
   `npx eas-cli@latest credentials --platform ios` or `npx eas-cli@latest build --platform ios --profile production` and complete Apple ID / 2FA so distribution cert + App Store provisioning profile are fully validated on Expo’s servers.

3. You can inspect or clear credentials under **[expo.dev](https://expo.dev)** → your project / account **Credentials** if you need to reset a bad state (then repeat step 1 or 2).

**Export compliance:** `app.config.ts` sets **`ITSAppUsesNonExemptEncryption: false`** in `ios.infoPlist` (typical for HTTPS-only apps). If you add custom non-exempt cryptography, set **`true`** and handle compliance in App Store Connect.

---

## Option A — **Mobile-only** GitHub repo (typical for EAS)

Use this when the GitHub remote should contain **only** the app (clean history, simple EAS ↔ GitHub integration).

1. **Create an empty repository** on GitHub (e.g. `carepair-mobile`), **without** a README/license (avoid merge conflicts).

2. In a terminal, from **this directory** (`mobile/`):

   ```bash
   git init
   git add .
   git commit -m "Initial commit: CarePair Expo app"
   git branch -M main
   git remote add origin https://github.com/YOUR_ORG/carepair-mobile.git
   git push -u origin main
   ```

3. **Link Expo / EAS**

   ```bash
   eas login
   eas init
   ```

   The repo already pins **`extra.eas.projectId`** to the **CarePair** Expo project. Use **`eas init`** only if you need to re-link the CLI; if you create a **new** Expo project, update **`EAS_PROJECT_ID_DEFAULT`** in `app.config.ts` and the **`EAS_PROJECT_ID`** entries in **`eas.json`** to match, or set **`EAS_PROJECT_ID`** in EAS environment variables.

4. **Connect GitHub in the Expo dashboard** (optional but useful): Project → **GitHub** → install the Expo GitHub app and select this repo so builds can track commits/branches.

5. **Secrets (never commit real values)**  
   Copy `mobile/.env.example` → `.env` locally. For **EAS Build**, add the same keys in **EAS Secrets** (`eas secret:create` or the Expo website) — especially `EXPO_PUBLIC_API_URL`, Google client IDs, `GOOGLE_MAPS_*` for prebuild, `SENTRY_*` if used, etc.

6. **First cloud build**

   ```bash
   eas build --profile production --platform all
   ```

   Use **`development`** or **`preview`** profiles from `eas.json` for internal testing.

---

## Option B — **Monorepo** (mobile + server + landing in one GitHub repo)

1. Initialize git at the **parent** `CarePair/` folder (not only `mobile/`), add a root `.gitignore`, and push to one GitHub repo.

2. Run all **`eas`** commands from **`mobile/`**:

   ```bash
   cd mobile
   eas build --profile production --platform ios
   ```

3. In **GitHub Actions**, set `defaults.run.working-directory: mobile` for jobs that run `npm ci` / `eas build` (see `.github/workflows/ci.yml` in this folder — adjust if the workflow lives at repo root).

---

## Useful scripts

| Command | Purpose |
|--------|---------|
| `npm start` | Metro / Expo dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npm run eas:build` | `eas build` |

---

## Project config reference

- **App config:** `app.config.ts` (slug `carepair`, scheme `carepair`, ios bundle id `com.camerondeans.carepair`, android bundle slug `com.carepair.app`)
- **EAS profiles:** `eas.json` (`development`, `preview`, `production`)
- **Env template:** `.env.example` — **do not** commit `.env`

---

## Docs

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Submit to stores](https://docs.expo.dev/submit/introduction/)
- [Environment variables in EAS](https://docs.expo.dev/build-reference/variables/)
