# 📱 Midlex Mobile App (Flutter)

A cross-platform legal portal application for clients of Midlex LLP.

## ⚙️ Backend API
- **Live Endpoint**: `https://midlex-new.onrender.com`
- **Configuration**: Defined in `lib/config/api_config.dart`
- **Release APK**: `build/app/outputs/flutter-apk/app-release.apk` (and `Midlex_LawFirm_New.apk`)

## 🔑 Test Client Logins
- **Demo Client**:
  - **Email**: `client@midlex.com`
  - **Password**: `client123`
  - **Name**: Demo Client (John Doe)
  - **Role**: `CLIENT`
  - **Phone**: `08033334444`

- **Standard User**:
  - **Email**: `user@midlex.com`
  - **Password**: `user123`
  - **Name**: Standard User (Jane Doe)
  - **Role**: `CLIENT`

> Note: The mobile app is designed specifically for clients. Admin and Lawyer accounts will be prompted to access their designated web portals.

## 🚀 Building & Running
```bash
flutter pub get
flutter run
# Build Release APK
flutter build apk --release
# Build Release Web
flutter build web --release
```
