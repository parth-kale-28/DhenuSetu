# Troubleshooting the three protected APIs

If `/api/ai/chat`, `/api/media/sign`, and `/api/notifications/dispatch` all return a session/authentication error, test:

1. `http://localhost:5000/api/health` — verify the Firebase Admin `projectId` is `dhenusetu-eae0c`.
2. `http://localhost:5000/api/health/deep` — verifies Admin Auth and Firestore access.
3. Confirm the service-account JSON in `backend/secrets/serviceAccountKey.json` belongs to `dhenusetu-eae0c`.
4. Sign out of DhenuSetu and sign in again so the frontend obtains a fresh Firebase ID token.
5. Confirm the backend `.env` is named exactly `.env` and is inside `backend/`.

The frontend automatically retries a protected API once with a refreshed Firebase ID token after a 401 response.
