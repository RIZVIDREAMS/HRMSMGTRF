# RIZVI IMPMS Firebase Login Fix — 2026-08-29

- Firebase Authentication is now the primary production login path.
- Removed the blocking `For production login configure API Base in Settings` behavior.
- Email/password login uses the Firebase project already configured in this package.
- Added Firebase Sign up.
- Added Firebase password-reset email.
- Added user profile document creation in Firestore.
- Admin mode checks Firebase role from custom claims or `users/{uid}`.
- Legacy Node API login remains as fallback when an API Base is configured.
- Updated Firestore rules to protect user profiles.
- Patched both the root Hosting frontend and `backend/public/index.html`.
