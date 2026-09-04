# Ship Spare Management System

This is a Firebase web app with an Electron desktop wrapper. Firebase Authentication and Realtime Database provide the shared, real-time data layer when configured. The Electron wrapper also stores a local SQLite copy at the Electron user-data path for offline use.

## Local SQLite

Run the desktop app from the repository root with `npm start`. The first launch creates `ssms.sqlite` automatically. Existing inventory and transaction data in browser storage is migrated into SQLite on first launch. Direct browser use continues to use browser storage because the SQLite bridge is only exposed by Electron.

## Make It Live

1. Create or select a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication > Sign-in method > Email/Password**.
3. Create a **Realtime Database** in the project region you need.
4. Register a Web app in **Project settings** and copy its configuration into `js/firebase.js`, replacing every `REPLACE_WITH_*` value in `defaultFirebaseConfig`.
5. Create the first account in **Authentication > Users**. After signing in once, add `users/<uid>/role` as `admin` in Realtime Database.
6. Install and authenticate the Firebase CLI, then deploy from this folder:

```powershell
cd ship-spare-management
npm install -g firebase-tools
firebase login
firebase use <your-firebase-project-id>
firebase deploy --only hosting,database
```

The deploy command prints the public HTTPS URL. Open that URL on multiple devices to verify that inventory changes appear in real time.

## Important

- The Firebase web configuration is intended to be present in browser code; access is protected by Authentication and Realtime Database rules.
- Keep `database.rules.json` deployed. Do not use public read/write rules for production data.
- The app intentionally stays in skeleton/offline mode until all Firebase placeholders are replaced.