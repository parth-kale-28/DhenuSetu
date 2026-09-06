import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getMessaging, isSupported as messagingSupported } from 'firebase/messaging';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { firebaseConfig, appCheckSiteKey } from './config/firebase.config.js';

const invalid = !firebaseConfig.projectId || firebaseConfig.projectId.startsWith('PASTE_');
export const firebaseConfigured = !invalid;

let app = null;
let auth = null;
let db = null;
let appCheck = null;

if (!invalid) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  try {
    auth = initializeAuth(app, {
      persistence: indexedDBLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch {
    auth = getAuth(app);
  }
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch {
    db = getFirestore(app);
  }
  if (appCheckSiteKey) {
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true
      });
    } catch {
      appCheck = null;
    }
  }
}

export async function getFirebaseMessaging() {
  if (!app || !(await messagingSupported())) return null;
  try { return getMessaging(app); } catch { return null; }
}

export { app, auth, db, appCheck };
