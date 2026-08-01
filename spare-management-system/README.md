# Spare Management System

A production-oriented Spare Management System built with HTML, CSS, JavaScript (ES Modules), and Firebase Realtime Database.

## Highlights

- Responsive dashboard with left sidebar navigation
- Dark and Light themes
- Firebase Authentication + Realtime Database
- Realtime synchronization across clients
- Role-based access control (RBAC)
- Inventory search, sorting, filtering, pagination
- Excel import/export (SheetJS)
- PDF report export (jsPDF + AutoTable)
- Analytics chart (Chart.js)
- Audit logging for critical actions
- Automatic low-stock alerts
- QR code generation per spare
- Camera-based QR/barcode scanner support

## Folder Structure

```text
spare-management-system/
  index.html
  styles/
    base.css            # core tokens/reset
    layout.css          # grid/sidebar/topbar/responsive layout
    components.css      # shared controls/tables/cards/forms/toasts
    themes.css          # light theme overrides
  src/
    app.js              # bootstrap, auth lifecycle, realtime listeners, render loop
    router.js           # module routing and access gate
    config/
      firebase-config.js
    services/
      firebase.js       # firebase initialization + API exports
      auth.js           # login/logout/auth and role observers
      database.js       # generic realtime CRUD/subscription helpers
      rbac.js           # role permission matrix
      audit.js          # audit log service
      inventory.js      # spare save/receive/issue + low-stock alert automation
      file.js           # excel import/export
      reports.js        # pdf reporting
      qr.js             # QR generation helper
      scanner.js        # camera scanner helper
    ui/
      sidebar.js        # sidebar nav configuration + rendering
      table.js          # sorting/filter/pagination utility
      toast.js          # toast notifications
    modules/
      dashboard.js      # KPI cards + low stock overview
      inventory.js      # inventory CRUD + import/export + table controls
      receive.js        # receive stock transaction flow
      issue.js          # issue stock transaction flow
      purchase.js       # purchase request lifecycle (create + list)
      vendors.js        # vendor management
      analytics.js      # chart visualizations
      reports.js        # one-click report exports
      qr-management.js  # QR generation + camera scan module
      audit-log.js      # audit history viewer
      settings.js       # theme and environment settings
```

## Module Overview

1. Dashboard
- Presents inventory KPIs and live low-stock table.

2. Inventory
- Add/update/delete spare records.
- Search all fields, sort columns, and paginate results.
- Import spares from Excel and export inventory to Excel/PDF.

3. Receive Spares
- Increase stock for selected spare and log transaction.

4. Issue Spares
- Decrease stock with validation.
- Automatically triggers low-stock alert entries when threshold is reached.

5. Purchase Requests
- Create and track procurement requests.

6. Vendors
- Maintain vendor master data.

7. Analytics
- Category-based stock visualization with Chart.js.

8. Reports
- Export inventory and transactions for sharing and compliance.

9. QR Code Management
- Generate QR for selected spare.
- Scan QR/barcode using device camera.

10. Audit Log
- Displays operation history (create/update/delete/receive/issue/import).

11. Settings
- Theme switch and runtime environment details.

## Firebase Setup

1. Create a Firebase project and enable:
- Authentication: Email/Password
- Realtime Database

2. Update configuration:
- Edit `src/config/firebase-config.js` with real Firebase credentials.

3. Apply database security rules:
- Publish `firebase.database.rules.json` to Firebase Realtime Database rules.

4. Add user role records in Realtime Database:
- `users/{uid}/role` with values: `admin`, `manager`, `operator`, or `viewer`

Example:

```json
{
  "users": {
    "<uid>": {
      "role": "admin",
      "displayName": "Admin User"
    }
  }
}
```

## Run Locally

Use any static server (recommended for camera access and module imports):

```powershell
cd spare-management-system
# Example with Python if available
python -m http.server 8080
```

Then open `http://localhost:8080`.

Note: Camera scanning usually requires HTTPS or localhost.

## Production Notes

- Apply strict Firebase Realtime Database security rules by role.
- Add server-side validation with Cloud Functions for high-security environments.
- Consider indexing frequently queried database paths.
- Keep audit logs immutable for compliance.
- Add CI lint/test/build checks before deployment.
