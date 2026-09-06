# Firebase hosting: frontend + backend

Yes, DhenuSetu can be hosted in the same Firebase project, but the normal Express backend runs on Cloud Run and Firebase Hosting serves the React frontend. Firebase Hosting rewrites `/api/**` to the Cloud Run service.

The repository already contains `firebase.json` with:
- Hosting directory: `frontend/dist`
- API rewrite: service `dhenusetu-api`
- Region: `asia-south1`

## Build frontend
From the DhenuSetu root:
```powershell
npm run build
```

## Deploy backend
Install/authenticate `gcloud`, then:
```powershell
gcloud config set project dhenusetu-eae0c
gcloud run deploy dhenusetu-api --source backend --region asia-south1 --allow-unauthenticated
```

Set backend environment variables/secrets in Cloud Run. For production, use Secret Manager for Gemini, Cloudinary, Gmail and other secrets.

Cloud Run requires a Google Cloud Billing account; linking billing moves the Firebase project to Blaze. Review Cloud Run/Firebase costs and set budget alerts.

## Deploy Firebase Hosting
```powershell
firebase login
firebase use dhenusetu-eae0c
npm run build
firebase deploy --only hosting
```

After deployment, update `FRONTEND_ORIGINS` on Cloud Run to include:
- `https://dhenusetu-eae0c.web.app`
- `https://dhenusetu-eae0c.firebaseapp.com`
and your final custom domain if you add one.

## Important
Firebase Hosting does not run a normal long-lived Node/Express server itself. The current architecture keeps the Node backend on Cloud Run and connects it through Hosting rewrites.
