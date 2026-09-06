# DhenuSetu final setup checklist

## Required before the first live run
1. Firebase Web config is already in `frontend/src/config/firebase.config.js`.
2. Put your downloaded Firebase Admin service-account JSON at:
   `backend/secrets/serviceAccountKey.json`
3. Copy:
   `backend/.env.example` → `backend/.env`
4. Add your Gemini API key to `backend/.env`.
5. Create a Cloudinary account and add its three keys to `backend/.env` for image/document upload.
6. If you need email alerts, enable 2-Step Verification on `dhenusetu@gmail.com`, create a Google App Password, and put it in `GMAIL_APP_PASSWORD`.
7. Generate an FCM Web Push VAPID key and paste it into `frontend/src/config/firebase.config.js`.
8. For production phone authentication, add your Firebase Hosting domain to Firebase Authentication → Settings → Authorized domains and configure the SMS region policy.

## Optional
- Add a reCAPTCHA Enterprise App Check site key.
- Add an OpenAI key instead of Gemini.
- Add Flutter/mobile FCM tokens later.

## No Firebase Storage required
DhenuSetu uses Cloudinary for application media, so the Firebase Storage bucket is not part of the normal image upload path.
