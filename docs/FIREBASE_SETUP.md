# Firebase setup

Project:
`dhenusetu-eae0c`

## Enable
- Authentication → Email/Password
- Authentication → Phone
- Cloud Firestore
- Cloud Messaging

App Check is recommended after the first successful deployment.

## Firestore
The repository includes rules and indexes:
`firebase/firestore.rules`
`firebase/firestore.indexes.json`

Deploy:
```powershell
firebase login
firebase use dhenusetu-eae0c
firebase deploy --only firestore:rules,firestore:indexes
```

## Service account
For local development put your downloaded JSON at:
`backend/secrets/serviceAccountKey.json`

Never place this file inside `frontend/` and never commit it.

For Cloud Run, Application Default Credentials are supported by the backend so you do not need to ship the JSON key.

## Web push
Generate a Web Push VAPID key:
Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Generate key pair.

Paste the public key into:
`frontend/src/config/firebase.config.js`

## Phone auth
Firebase phone authentication needs an authorized domain and SMS-region configuration. `localhost` is not accepted as a hosted domain for phone sign-in, so use Firebase's test phone numbers for local development or test real SMS on the deployed HTTPS domain.

## Storage
DhenuSetu uses Cloudinary for application media. Firebase Storage is not required by the current implementation.
