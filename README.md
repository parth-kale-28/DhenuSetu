# DhenuSetu — Complete Application

This repository contains the current DhenuSetu web application and Node.js backend.

## Stack
- React + Vite
- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Messaging
- Node.js + Express
- Cloudinary for media
- Gemini or OpenAI through the backend
- Nodemailer/Gmail for email
- ESP32 ingestion endpoint
- Offline Firestore persistence

## Data rule
Application data is not stored in browser `localStorage`. Firestore is the source of truth, with Firestore's persistent web cache used for offline operation.

## Main folders
- `frontend/` — React web app
- `backend/` — Express API
- `firebase/` — Firestore rules and indexes
- `hardware/` — ESP32 example
- `docs/` — setup/deployment documentation

## Run locally
From this root:
```powershell
npm run install:all
```

Create backend env:
```powershell
Copy-Item backend/.env.example backend/.env
New-Item -ItemType Directory backend/secrets -Force
```

Put the downloaded Firebase Admin JSON at:
`backend/secrets/serviceAccountKey.json`

Fill in `backend/.env` with your Gemini, Cloudinary, optional Gmail and device token values.

Then open two terminals from this root.

Terminal 1:
```powershell
npm run dev:backend
```

Terminal 2:
```powershell
npm run dev:frontend
```

Open:
`http://localhost:5173`

Backend:
`http://localhost:5000/api/health`

## Production hosting
See:
`docs/HOST_FIREBASE.md`

## Firebase setup
See:
`docs/FIREBASE_SETUP.md`

## Email
See:
`docs/EMAIL_SETUP.md`

## Cloudinary
See:
`docs/CLOUDINARY_SETUP.md`

## Final configuration files
Frontend Firebase web config:
`frontend/src/config/firebase.config.js`

Backend environment/secrets:
`backend/.env`
`backend/secrets/serviceAccountKey.json`


## Final release notes
- Existing animal edit keeps identity/medical/hardware pairing functionality. Existing sensor/ESP fields are shown read-only; use **Update today’s info** for daily readings.
- Daily readings are stored under each animal's Firestore `history` with one record per animal/day and update the current animal summary.
- Reports deduplicate by animal/day; monthly view aggregates daily values.
- Vet lab workflow is sequential: Submitted → Sample collected → Processing → Results ready → Reviewed → Closed. Closure requires a doctor review note.
- Risk-alert counters are scoped to the current user/connected animals.
