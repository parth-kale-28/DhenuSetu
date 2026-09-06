# DhenuSetu local run

## 1. Put secrets in place
- Firebase Admin JSON: `backend/secrets/serviceAccountKey.json`
- Backend secrets/config: `backend/.env`

The backend loads its `.env` relative to the backend project, so it works whether you start it from the root or from `backend`.

## 2. Install
From the DhenuSetu root (the folder containing `package.json`):
```powershell
npm run install:all
```

## 3. Start backend
Terminal 1:
```powershell
npm run dev:backend
```
Then open `http://localhost:5000/api/health`. It should show `firebaseAdmin.initialized: true` and `firebaseAdmin.projectId: dhenusetu-eae0c` when the service-account JSON is correct.

## 4. Start frontend
Terminal 2:
```powershell
npm run dev:frontend
```
Open `http://localhost:5173`.

## 5. Test API-dependent features
After logging in:
- Add/edit animal image → Cloudinary
- Ask assistant a normal question → Gemini
- Change vet lab report status → Firestore + optional push/email
- Pair ESP32 later → hardware endpoint

## 6. Phone authentication
Firebase phone auth requires an authorized domain and SMS-region policy. For local testing use Firebase fictional phone numbers; test real SMS on your deployed HTTPS domain.
