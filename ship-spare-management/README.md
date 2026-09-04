# Ship Spare Management System

This is a local-first ship spare management app with an Electron desktop wrapper. The Electron app stores data in SQLite, while direct browser use falls back to browser storage.

## Local SQLite

Run the desktop app from the repository root with `npm start`. The first launch creates `ssms.sqlite` automatically. Existing inventory and transaction data in browser storage is migrated into SQLite on first launch. Direct browser use continues to use browser storage because the SQLite bridge is only exposed by Electron.

The SQLite file is stored in Electron's user-data directory. The renderer accesses it only through the restricted API exposed by `preload.js`.