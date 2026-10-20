# Unskinned — Mobile App (Capacitor wrapper)

This folder is a **self-contained Capacitor project** that wraps the live,
server-rendered Unskinned website (`apps/web`) into native iOS and
Android apps so they can be submitted to the **Apple App Store** and **Google
Play**.

It is fully isolated from the monorepo: it is **not** a workspace member, it does
**not** touch the Next.js build, and nothing under `apps/`, `services/`,
`packages/`, or `infra/` is modified by it.

---

## How it works (important)

The web app (`apps/web`) is a **Next.js 15 App Router SSR app** with API routes,
middleware, and Prisma. It **cannot be statically exported**, so we do **not**
bundle a static build inside the app. Instead, the native shell loads the
**hosted** site directly via Capacitor's `server.url`:

```ts
// capacitor.config.ts
server: {
  url: 'https://example.com',
  androidScheme: 'https',
}
```

Consequences:

- **App updates ship by deploying the website.** Any change you deploy to
  `https://example.com` is instantly live inside the installed app.
  You only need to resubmit a new binary to the stores when you change something
  **native** (app name, icon, splash, permissions, Capacitor plugins, native SDK
  versions) — not for normal web/content changes.
- `mobile/www/index.html` is only a **placeholder** required so the Capacitor CLI
  has a valid `webDir`. It just redirects to the hosted site and is essentially
  never shown in practice.

### App identity

| Field            | Value                              |
| ---------------- | ---------------------------------- |
| App ID / Bundle  | `com.example.app`     |
| App name         | `Unskinned`           |
| Background color  | `#080f1e` (navy)                   |
| Hosted URL       | `https://example.com` |
| Capacitor        | v6 (stable)                        |

---

## What is in this folder

```
mobile/
├── capacitor.config.ts     # Capacitor config (appId, server.url, etc.)
├── package.json            # @capacitor/core + ios + android, cli, assets
├── www/index.html          # placeholder webDir (redirect to hosted site)
├── resources/              # source art for @capacitor/assets
│   ├── icon.png            # 512px app icon (from apps/web/public/icon-512.png)
│   ├── icon-foreground.png # maskable foreground (Android adaptive icon)
│   ├── splash.png          # splash source
│   └── splash-dark.png     # dark-mode splash source
├── .gitignore              # ignores node_modules/, ios/, android/
└── README.md               # this file
```

> **Note on art sizes:** `@capacitor/assets` *recommends* a `1024×1024`
> `resources/icon.png` and a `2732×2732` `resources/splash.png`. The icons
> copied here are the existing 512px PWA icons; they will be upscaled (some
> quality loss on iOS large icons). Before store submission, replace
> `resources/icon.png` and `resources/splash.png` with 1024px / 2732px versions
> for crisp results.

---

## ⚠️ What CANNOT be done in this (Windows) environment

The native platforms and store binaries **cannot be created here** and require
the user's own machine and paid developer accounts:

- **`npx cap add ios`** and building/archiving the iOS app require **macOS +
  Xcode** (Apple does not allow iOS builds on Windows/Linux). This step was
  **not** run here.
- **`npx cap add android`** and building the AAB require **Android Studio +
  Android SDK + JDK 17**. This was **not** run here (Android Studio not present).
- **Signing & submission** require:
  - **Apple Developer Program** — **$99/year**.
  - **Google Play Developer account** — **$25 one-time**.

> See `STATUS` at the bottom for exactly which commands were run successfully in
> this environment vs. which were skipped and why.

---

## Setup & build steps (run on YOUR machine)

### 1. Install dependencies

```bash
cd mobile
npm install
```

### 2. Add the native platforms

```bash
# Android — needs Android Studio + Android SDK + JDK 17 (Windows/macOS/Linux):
npx cap add android

# iOS — needs macOS + Xcode + CocoaPods (macOS only):
npx cap add ios
```

These generate the `android/` and `ios/` native project folders (git-ignored).

### 3. Generate icons & splash screens

```bash
npx @capacitor/assets generate
```

This reads `resources/icon.png` / `resources/splash.png` and writes all the
required icon and splash assets into the `ios/` and `android/` projects. To
target a single platform: `npx @capacitor/assets generate --ios` or
`--android`. (Run this **after** `cap add`.)

### 4. Sync config + assets into the native projects

```bash
npx cap sync       # or: npm run sync
```

Run `cap sync` after any change to `capacitor.config.ts`, after adding plugins,
or after regenerating assets.

### 5. Open in the native IDEs

```bash
npm run open:android   # opens Android Studio
npm run open:ios       # opens Xcode (macOS only)
```

---

## Submitting to the stores

### Android (Google Play)

1. In Android Studio, confirm the **Application ID** is
   `com.example.app` (`android/app/build.gradle` →
   `applicationId`).
2. Set a `versionCode` (integer, must increase each upload) and `versionName`.
3. **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**, create
   or reuse an upload keystore, and build a **release** `.aab`.
4. In the **Google Play Console** ($25 one-time), create the app, fill the store
   listing (description, screenshots, privacy policy URL, data-safety form),
   upload the `.aab`, and roll out (internal testing → production).

### iOS (Apple App Store)

1. In Xcode, select the app target → **Signing & Capabilities** → set **Team**
   (from your Apple Developer account) and confirm **Bundle Identifier** is
   `com.example.app`.
2. Set the **Version** and **Build** numbers.
3. Select **Any iOS Device (arm64)** → **Product → Archive** → **Distribute App
   → App Store Connect → Upload**.
4. In **App Store Connect** ($99/year), create the app record, fill metadata,
   screenshots, privacy details, and submit for review.

---

## ⚠️ Apple App Store Guideline 4.2 (Minimum Functionality)

Apple frequently **rejects apps that are just a wrapper around a website** with
no native value ("Guideline 4.2 — Minimum Functionality"). This app currently
loads the hosted site with no native features, so it is at risk.

**Recommended follow-up before/at submission:** add at least one genuinely
native capability. The easiest high-value option is **push notifications**:

```bash
npm install @capacitor/push-notifications
npx cap sync
```

Then register for and handle push tokens in a small bootstrap script, and wire a
sender (e.g. Firebase Cloud Messaging for Android, APNs for iOS). Other options:
offline handling, native share, biometric login, haptics, camera. Treat this as
a **follow-up task** — the wrapper builds and runs without it, but adding one
materially improves the chance of approval.

---

## STATUS — what ran in the build environment

> Filled in automatically when this folder was created. Anything marked SKIPPED
> must be performed by you on a suitable machine.

- `npm install` — **OK** (393 packages installed; Capacitor `6.2.1` resolved for
  core/cli/ios/android). npm reported some advisories in transitive deps of
  `@capacitor/assets`'s tooling — these affect the local asset-generation
  toolchain only, not the shipped app, and can be reviewed with `npm audit`.
- `npx cap --version` — **OK** → `6.2.1`. `npx cap doctor` reads
  `capacitor.config.ts` successfully (config is valid).
- `npx cap add ios` — **SKIPPED** (requires macOS + Xcode; not available on
  Windows).
- `npx cap add android` — **SKIPPED** (Android Studio / Android SDK not present
  in this environment).
- `npx cap sync` — **SKIPPED** (no native platforms added yet; nothing to sync).
- `npx @capacitor/assets generate` — **SKIPPED** (runs after `cap add`).
