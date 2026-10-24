# Local Build & Release Signing

How to build Lokkhyo locally, and how release signing is meant to work.

> The `android/` and `ios/` folders are **not** checked in — they are produced by
> `expo prebuild`. Any edit made directly under `android/` is lost on the next
> `--clean` prebuild. Keep every durable setting outside the generated tree.

---

## Dev build

```bash
npx expo prebuild -p android --clean
sed -i 's/^reactNativeArchitectures=.*/reactNativeArchitectures=arm64-v8a/' android/gradle.properties
npx eas build --profile development --platform android --local
# or straight through Gradle once the native project exists:
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

`-PreactNativeArchitectures=arm64-v8a` restricts the APK to 64-bit ARM only and
must be passed on the command line — `expo prebuild` regenerates
`gradle.properties` and would drop an edit made there.

Output: `android/app/build/outputs/apk/release/app-release.apk`.

---

## Release signing

### Why this matters

Release builds currently fall back to the **debug keystore** because
`android/app/release.jks` does not exist. That is fine for sideloading test
installs, but Play Store uploads **reject** debug-signed artifacts, and a
keystore change later invalidates updates for every installed copy. Generate the
real keystore before the first public install, not after.

### 1. Generate the keystore (once, outside the repo)

Requires a JDK (`keytool` ships with it):

```bash
keytool -genkeypair -v \
  -keystore ~/keystores/lokkhyo-release.jks \
  -alias lokkhyo \
  -keyalg RSA -keysize 2048 -validity 10000
```

It will prompt for two passwords: the **keystore password** and the **key
password**. Answer both with the same value unless you have a reason not to.

Back the file up now — losing it means every installed user must uninstall
before reinstalling. Store it in a password manager or private vault, never in
this repository.

### 2. Store the credentials

- Keystore file: a private location such as `~/keystores/lokkhyo-release.jks`
  (the app's `.gitignore` already excludes `*.jks`, `*.keystore`,
  `credentials.json`, and `google-services.json`).
- Passwords: a password manager, or CI secrets. Never commit them, and never
  put them in `gradle.properties` if that file is tracked.

### 3a. Preferred: sign through EAS credentials

EAS keeps the keystore server-side and injects it into every cloud build, so it
survives prebuilds and needs no repo changes:

```bash
npx eas credentials            # Android → Keystore → "Set up a new keystore"
npx eas build --profile production --platform android --local
```

### 3b. Fallback: sign a pure-Gradle release build

Use this when building without EAS. After `expo prebuild`, point the generated
project at your keystore by patching the two files below. Re-apply after any
`--clean` prebuild.

`android/gradle.properties`:

```properties
RELEASE_STORE_FILE=/home/<you>/keystores/lokkhyo-release.jks
RELEASE_STORE_PASSWORD=<keystore password>
RELEASE_KEY_ALIAS=lokkhyo
RELEASE_KEY_PASSWORD=<key password>
```

`android/app/build.gradle` — replace the debug fallback in the `release` block:

```gradle
signingConfigs {
    debug { /* left as generated */ }
    release {
        storeFile file(RELEASE_STORE_FILE)
        storePassword RELEASE_STORE_PASSWORD
        keyAlias RELEASE_KEY_ALIAS
        keyPassword RELEASE_KEY_PASSWORD
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release   // was signingConfigs.debug
    }
}
```

Then build as usual:

```bash
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Verify the signature before shipping:

```bash
$ANDROID_HOME/build-tools/<version>/apksigner verify --print-certs \
  app/build/outputs/apk/release/app-release.apk
```

The certificate must be yours, not the debug one.

---

## EAS profiles

`eas.json` defines `development`, `preview`, and `production`. The
`production` profile builds an APK (`buildType: "apk"`).

```bash
npx eas build --profile development --platform android --local
npx eas build --profile preview     --platform android --local
npx eas build --profile production  --platform android --local
npx eas build --profile production  --platform ios
```
