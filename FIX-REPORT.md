# T7 PrintHub Fix Report

## Fixed

- Fixed service booking form resolution so explicit service title/category wins over stale `bookingFormType`.
- `Certificates & Flyers`, certificates, flyers, document printing, and printing services now resolve to the printing form.
- Removed the generic `Brand / Make` + `Model / Serial No.` fallback from the booking wizard. Unknown services now get a generic requirements form instead of hardware fields.
- Fixed undefined `normalizePrice` usage by importing it from `utils/formatters.js`.
- Fixed undefined `StorageService.uploadServiceDoc()` call by using `uploadFileResumable()`.
- File upload no longer falls back to IndexedDB/Data URLs; upload failures stop the booking and show an error.
- Removed hardcoded frontend admin passwords and automatic admin authentication.
- Admin access is now verified against Firebase Authentication plus the Firestore `users/{uid}` role.
- Admin routes use the verified async authorization check.
- Removed unused Supabase configuration.
- Firebase initialization no longer silently enters DEMO mode.
- Application displays an online-service error instead of silently continuing after Firebase initialization failure.
- Tightened Firestore rules so catalog/settings writes and administrative data access require an admin role.
- Tightened Storage deletion/admin paths.
- Refined the legacy service-request page so printing services cannot be classified as computer repair merely because their category contains the word `repair`.
- Removed hardcoded Chennai from the booking wizard.

## Verification

- JavaScript syntax check: PASS for all project JS files outside `node_modules`.
- Booking wizard method definitions: one each.
- `uploadServiceDoc`: removed.
- Hardcoded admin passwords: removed.
- Auto admin login: removed.
- DEMO mode string: removed from active Firebase configuration.
