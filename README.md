# Lokkhyo — Academic Progress Tracker

A mobile academic tracker for university students. Track **continuous assessment (CT) marks**, a **weekly class routine**, **attendance per class**, **upcoming CTs/quizzes** with local reminders, and your **official GPA/CGPA and transcript**.

Built with **Expo SDK 54** (React Native 0.81, React 19), **TypeScript**, **expo-router v6** and **TanStack Query v5**. Identity is **Firebase Auth** (`@react-native-firebase/auth`, email/password and Google). All data lives on the **Lokkhyo API** (`../lokkhyo-server`, Next.js + MongoDB). The app no longer uses Firestore.

> Planning the move to Hono/Bun, Expo Push, offline reads, dark mode, and widgets? See [`../TRANSITION.md`](../TRANSITION.md).

---

## Features

| Tab | What it does |
| --- | --- |
| **Home** | Dashboard: greeting, next class from your routine, CT progress summary, attendance |
| **Courses** | Course cards with live CT progress; tap through to a course detail screen |
| **Attendance** | Unified calendar of every class session; mark present / absent / cancelled |
| **Routine** | Weekly class grid (Sat–Fri) with times and rooms; **Upcoming** section for CT/quiz/assignment/labFinal reminders |
| **Profile** | Profile and server CGPA, **Transcript & degree status**, change/profile photo, settings, sign out |

On a course's detail screen you can:
- add and delete assessments (CT, quiz, assignment, lab), each with marks, weights and dates;
- see the client-side **CT progress** toward the course total;
- list **upcoming reminders**: mark-less events that schedule a local notification a few days before the date;
- record the course's **final grade**. The server grades it on the RUET scale and recomputes your GPA/CGPA.

---

## Tech stack

- **Expo SDK 54**, development build (native `@react-native-firebase` modules, so not Expo Go)
- **expo-router v6** — file-based routing with typed routes and protected routes
- **React 19** + **TypeScript** (strict)
- **Firebase Auth** (`@react-native-firebase/auth`), plus Google Sign-In. Identity only.
- **Lokkhyo REST API** for all data. It is called with React Native `fetch` through one wrapper (no axios).
- **TanStack Query v5** for server-state caching, queries, mutations and invalidation
- **expo-notifications** for local reminder scheduling
- **AsyncStorage** for the offline cache of notification preferences
- Inline form validation, with no form or validation libraries

---

## Architecture

Screens never call the network directly. Each layer only talks to the one below it:

```
Screens (app/**)
   │  same hooks as before the API migration
Hooks (hooks/use*.ts)                  thin adapters, unchanged return shapes
   │
Feature modules (services/<feature>/)  one folder per server resource
   ├─ <feature>.types.ts     wire DTOs, mirroring the server's Zod schemas
   ├─ <feature>.api.ts       the only files that call request()
   ├─ <feature>.services.ts  DTO ⇄ app-type mappers, multi-step flows
   └─ <feature>.hooks.ts     TanStack Query: uid-scoped key factory, queries, mutations
   │
lib/api/                               feature-agnostic HTTP plumbing
   ├─ client.ts       request(): base URL, Bearer ID token, JSON, error envelope,
   │                  Idempotency-Key, timeout, one 401 → token refresh → retry
   ├─ auth-token.ts   getIdToken(): the Firebase ID token (force-refresh on 401)
   ├─ config.ts       EXPO_PUBLIC_API_URL, timeout, the API_LOGGING flag
   ├─ logger.ts       [api] request/response/retry/error console trace (gated)
   ├─ pagination.ts   paginateAll(): follows cursors to a full array
   ├─ idempotency.ts  newIdempotencyKey() for POST /results
   └─ error.ts        ApiError { code, status, details }
```

The feature modules are `auth`, `profile`, `semesters`, `courses`, `routine`, `attendance`, `assessments`, `reminders` (server `deadlines`), `grades` (GPA engine and results), `notification-prefs`, and `devices` (FCM registration after sign-in, unregistered on sign-out/delete).

**Mappers own every mismatch between the app and the server.**
- Day of week: the app's 0=Saturday…6=Friday ⇄ `"SATURDAY"`.
- Enums: lowercase ⇄ `UPPER_SNAKE`.
- Assessment type: `labFinal` ⇄ `LAB`.
- Semester length: `totalWeeks` ⇄ `endDate`.
- Reminder date ⇄ `dueAt`.

Screens only ever see the types in `lib/types.ts`.

Pure logic lives in `lib/` (no network): `gpa.ts` (CT progress), `attendance.ts` (session generation and stats), `routine.ts`, `reminders.ts`, `validate.ts`, `constants.ts`.

### Coursework vs. official grade

- **Coursework** (CT, quiz, assignment, lab marks) is stored on each assessment's `marksObtained`. The app turns it into the **CT progress** bar locally.
- **Official grade:** the course's **final grade** is a server `result` against the course's single `FINAL` assessment. GPA, CGPA, transcript and degree status are computed **only on the server** and displayed as returned.

### Query keys and sign-out

- Every key factory is scoped by the Firebase uid, so one user's cached data can never be read under another account.
- `AuthProvider` clears the whole query cache when the signed-in uid changes.

---

## Project structure

```
app/
  _layout.tsx               Providers + protected routes (Stack.Protected)
  (auth)/login.tsx, signup.tsx
  (tabs)/index, courses, attendance, routine, profile
  course/[id].tsx           Course detail: CT progress, reminders, assessments, final grade
  course/new.tsx            Create course
  assessment/new.tsx        Add/edit a mark (supports converting a reminder)
  reminder/new.tsx          Add/edit an upcoming reminder
  routine/new.tsx           Add a class slot
  profile/edit.tsx          Edit profile, change photo, choose/create semester
  profile/transcript.tsx    Transcript + degree status (server GPA engine)
  settings/settings.tsx     Notification toggles/time, delete account
components/                 Themed UI, CourseCard, attendance calendar, grades/FinalGradeCard
hooks/                      Screen-facing adapters over the feature modules
lib/                        Pure logic + lib/api plumbing
providers/                  AuthProvider (session + cache clearing), QueryProvider
services/<feature>/         Feature modules (see Architecture)
services/notifications/     Local notification scheduling (routine + reminders)
```

---

## Data

The server is the source of truth. See [`../lokkhyo-server/SERVER.md`](../lokkhyo-server/SERVER.md) for every endpoint and [`../architecture.md`](../architecture.md) for the reasoning behind it.

| App concept | Server resource |
| --- | --- |
| Profile | `GET/PATCH/DELETE /me`, `PUT/DELETE /me/photo` |
| Semesters (status, target GPA, weeks) | `/semesters`, `POST /semesters/:id/activate` |
| Courses (credits, pass marks, CT weight, lab, teachers) | `/courses` |
| Routine slots | `GET /me/routine/week`, `PUT /courses/:id/routine` (ids are kept) |
| Attendance per class session | `PUT /courses/:id/attendance` on `(date, slotId)` |
| Assessments + CT marks | `/assessments` |
| Upcoming reminders | `/deadlines` of type `ASSESSMENT`, with `assessmentType` |
| Final grade, GPA, CGPA, transcript | `/results`, `/me/cgpa`, `/me/gpa`, `/me/transcript`, `/me/degree-status` |
| Notification preferences | `/me/notification-prefs`, with an AsyncStorage offline cache |

---

## Auth

`AuthProvider` subscribes to `onAuthStateChanged` and exposes `{ user, initializing }`.

- `app/_layout.tsx` keeps the splash screen up until auth (and the first course/routine loads) settle. It then mounts `Stack.Protected` guards: `guard={!!user}` for the app, `guard={!user}` for `(auth)`.
- **Server provisioning:** the first authenticated request (`GET /me`, mounted by `AuthProvider`) creates the server profile.
- **New accounts:** sign-up and sign-in call `ensureLocalAccount`, which creates a default "Semester 1" when the account has none.
- **Deleting an account:** `DELETE /me` purges the server data first, then the Firebase user is deleted.

---

## Upcoming reminders & notifications

- **Separate from marks.** Reminders carry only `type`, `name` and `date`, never marks, so an upcoming test cannot affect progress.
- **Turning one into a mark.** Once the event has happened, **Record marks** turns it into an assessment; the reminder is deleted.
- **Lead time** (`lib/reminders.ts`): `ct`/`assignment` 2 days, `quiz` 3 days, `labFinal` 5 days. Notifications fire at the reminder time set in **Settings** (default 07:00).
- **Delivery is local.** Notifications are scheduled with `expo-notifications`; the server does not send push notifications yet.
- **Preferences** are stored on the server. Toggles write to AsyncStorage first, so scheduling works offline.

---

## Getting started

1. **Run the API.** In `../lokkhyo-server`, run `yarn && npx next dev`. See [`../lokkhyo-server/SERVER.md`](../lokkhyo-server/SERVER.md) for its `.env`.
2. **Use one Firebase project.** The app's `google-services.json` and the server's `FIREBASE_SERVICE_ACCOUNT` must belong to the **same Firebase project**. Otherwise the ID tokens won't verify.
3. **Create `.env`:**

   ```
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
   # Optional. Defaults to http://10.0.2.2:3000 (Android emulator) / http://localhost:3000.
   # A physical device needs your machine's LAN IP, e.g. http://192.168.1.20:3000
   EXPO_PUBLIC_API_URL=...
   # Optional. Request/response logging; on by default in development.
   EXPO_PUBLIC_API_LOG=...
   ```

4. **Install and run.** This is a development build, because the app uses native Firebase modules:

   ```bash
   yarn
   npx expo prebuild --clean   # after native dependency changes
   yarn android                # or: yarn ios
   ```

## Building a release APK

### Locally, with Gradle (arm64-v8a only)

Build a release APK straight through the Android toolchain — no EAS. Needs Java 17, the Android SDK (platform + build-tools + NDK) and `ANDROID_HOME` set:

```bash
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

- Output: `android/app/build/outputs/apk/release/app-release.apk`.
- `-PreactNativeArchitectures=arm64-v8a` restricts the APK to 64-bit ARM only (the default in `android/gradle.properties` builds all four ABIs). Pass it on the command line — `npx expo prebuild` regenerates `gradle.properties` and would drop an edit made there.
- **Signing is debug for now.** `android/app/build.gradle` signs `release` with `signingConfigs.debug` because `android/app/release.jks` does not exist. That is fine for internal/testing installs, but **not** for Play Store uploads — create a real release keystore before shipping.
- No prebuild is needed for the app's native modules here; `expo-image-picker`'s own manifest already merges in the `CAMERA`/media permissions.

### With EAS

The `eas.json` `production` profile builds an APK (`buildType: "apk"`, `:app:assembleRelease`). See the build scripts below.

## Scripts

| Command | Purpose |
| --- | --- |
| `yarn start` | Start the Expo dev server |
| `yarn android` / `yarn ios` | Run on a device or emulator |
| `yarn check:errors` | Type-check + lint (the pre-commit gate) |
| `yarn build:apk` | Prebuild + local EAS release APK (Android) |
| `yarn build:preview` | Prebuild + local EAS preview build (Android) |
| `yarn build:dev` | Local EAS development build (Android) |
| `yarn build:android` / `yarn build:ios` | Cloud EAS production build |
