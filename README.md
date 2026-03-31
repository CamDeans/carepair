# CarePair — mobile (Expo)

Native **iOS** and **Android** app (Expo SDK 54, Expo Router). This folder is ready to be the **root of its own GitHub repository** for **EAS Build / Submit**, or to live inside a monorepo.

---

## Prerequisites

- [Node.js](https://nodejs.org/) LTS (v20+ recommended)
- [Expo account](https://expo.dev/signup)
- [EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli` (or use `npx eas-cli` per command)
- For store builds: Apple Developer Program + Google Play Console access

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

3. **Link Expo / EAS** (creates or selects an Expo project and writes `EAS_PROJECT_ID` into your local env for builds):

   ```bash
   eas login
   eas init
   ```

   - If prompted, create a new project or link to an existing one with slug **`carepair`** (must match `app.config.ts` `slug` unless you change it).
   - Set **`EAS_PROJECT_ID`** for EAS cloud builds: add it under **Project → Environment variables** (or **Secrets**) on [expo.dev](https://expo.dev) so `app.config.ts` can read it at build time, **or** rely on `eas init` updating your local `.env` / docs — see [Expo: Configure EAS Project ID](https://docs.expo.dev/eas/json/#easprojectid).

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

- **App config:** `app.config.ts` (slug `carepair`, scheme `carepair`, bundle id `com.carepair.app`)
- **EAS profiles:** `eas.json` (`development`, `preview`, `production`)
- **Env template:** `.env.example` — **do not** commit `.env`

---

## Docs

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Submit to stores](https://docs.expo.dev/submit/introduction/)
- [Environment variables in EAS](https://docs.expo.dev/build-reference/variables/)
