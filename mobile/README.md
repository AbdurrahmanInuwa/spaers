# SPAERS — Citizen Mobile App (Flutter)

Native mobile port of the SPAERS citizen-side web app. Full parity with the web at `/frontend`:
public home with anonymous SOS, authenticated dashboard with live emergency map, family management
with SPAERS-ID member lookup and call-alert configuration, volunteer registration with government-ID
upload, profile with avatar/password/2FA/account-deletion, and a placeholder for hardware pairing.

## Stack

- Flutter 3.10+ / Dart 3
- `provider` for state management
- `http` + cookie-based session via `flutter_secure_storage` (mirrors the web app's
  `credentials: 'include'` session)
- `google_maps_flutter` for the live emergency map
- `geolocator` for device location
- `image_picker` for avatar uploads, `file_picker` for volunteer-ID uploads
- `shared_preferences` for persistent SOS state across app restarts

## Project layout

```
lib/
  main.dart                            # App entry, MaterialApp routing
  theme.dart                           # SPAERS colors / spacing / typography
  api/
    api.dart                           # HTTP client + session cookie storage + S3 uploads
    auth_provider.dart                 # /auth/me hydration, login/logout state
    emergency_provider.dart            # Authenticated SOS state + persistence
  models/
    user.dart, family.dart, emergency.dart, volunteer.dart
  utils/
    countries.dart                     # ISO 3166-1 + ITU-T dial codes
    geometry.dart                      # Haversine + point-in-polygon
    location.dart                      # Permission + getCurrentPosition wrapper
  widgets/
    buttons.dart, info_card.dart, inputs.dart, otp_input.dart,
    sos_button.dart, sos_type_sheet.dart, eyebrow.dart, toast.dart
  screens/
    splash_screen.dart                 # /auth/me boot → route to home or dashboard
    public_home_screen.dart            # Anonymous SOS + map + nearby help cards
    anonymous_emergency_screen.dart    # Live anonymous emergency map overlay
    signin_screen.dart                 # Email + password + optional 2FA OTP
    signup_screen.dart                 # Citizen registration + email OTP
    forgot_password_screen.dart        # Email + OTP + new password
    dashboard_shell.dart               # Bottom-nav + drawer for the 5 dashboard tabs
    dashboard_emergency_screen.dart    # Type chips + SOS button, full-bleed map when triggered
    family_screen.dart                 # Ack gate, member grid, add/remove, call-alert config
    volunteer_screen.dart              # Field picker + government-ID upload + status banner
    profile_screen.dart                # Avatar, personal/medical/security sections + danger zone
    change_password_screen.dart        # 2-step: passwords → OTP confirm
    two_factor_screen.dart             # Toggle 2FA with current-password confirm
    delete_account_screen.dart         # "Delete my account" typed confirmation
    hardware_screen.dart               # Coming-soon placeholder for wearables/panic buttons
```

## API URL

The mobile app talks to the same backend as `/frontend` (the express server at `/backend`).
By default it points at:

- iOS simulator: `http://localhost:5000`
- Android emulator: `http://10.0.2.2:5000` (the loopback alias to the host machine)
- A real device: pass `--dart-define=API_URL=http://YOUR_LAN_IP:5000`

To override:

```bash
flutter run --dart-define=API_URL=https://staging.spaers.example.com
```

The client appends `/api` automatically if it isn't already in the URL.

## Google Maps API key

The map screens require Google Maps SDK keys for both platforms.

### Android

Edit `android/app/src/main/res/values/strings.xml`:

```xml
<string name="google_maps_key">YOUR_ANDROID_MAPS_API_KEY</string>
```

### iOS

Edit `ios/Runner/AppDelegate.swift`:

```swift
GMSServices.provideAPIKey("YOUR_IOS_MAPS_API_KEY")
```

Until valid keys are provided the map will render as a blank tile, but the rest of the app
works fine.

## Permissions

| Platform | Permission                              | Used for                                            |
| -------- | --------------------------------------- | --------------------------------------------------- |
| Android  | `ACCESS_FINE_LOCATION` / `_COARSE_LOC.` | SOS location, nearby-help summary                   |
| Android  | `READ_MEDIA_IMAGES`                     | Avatar picker, volunteer-ID upload                  |
| iOS      | `NSLocationWhenInUseUsageDescription`   | SOS location, nearby-help summary                   |
| iOS      | `NSPhotoLibraryUsageDescription`        | Avatar picker, volunteer-ID upload                  |
| iOS      | `NSCameraUsageDescription`              | Volunteer-ID capture (camera path)                  |

## Run

```bash
cd mobile
flutter pub get

# Simulator / emulator
flutter run

# Real device, custom API host
flutter run --dart-define=API_URL=http://192.168.1.42:5000

# Debug APK
flutter build apk --debug
```

## Backend dependency

Boot the SPAERS backend first:

```bash
cd ../backend
npm install
npm start
```

It serves on `http://localhost:5000` by default. The mobile app expects the express session
cookie to come back on `/auth/login`; `flutter_secure_storage` persists it across launches so
users stay signed in.

## Notes on parity

- Live dispatcher position is currently fetched via the `GET /public/position/:id`
  fallback (HTTP polling at 4 s) — the web app's `socket.io` channel can be added later
  with `socket_io_client`.
- The Google "compute routes" driving-distance call is omitted; the matched-institution list
  shows straight-line (`haversine`) distance instead.
- Anonymous SOS state survives app restarts via `shared_preferences` with the same 4-hour
  expiry window as `localStorage` in the web app.
