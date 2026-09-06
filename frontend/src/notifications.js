import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getFirebaseMessaging, db, auth } from './firebase.js';
import { fcmVapidKey } from './config/firebase.config.js';
import { getToken, onMessage } from 'firebase/messaging';
import { hashCode } from './utils.js';

export async function registerPushNotifications() {
  if (!auth?.currentUser || !db) return false;
  if (!('Notification' in window)) throw new Error('This browser does not support notifications.');
  if (!fcmVapidKey) throw new Error('Browser push notifications are not configured. Add the Firebase Web Push VAPID public key.');
  if (!window.isSecureContext && !['localhost','127.0.0.1'].includes(location.hostname)) throw new Error('Browser push notifications require HTTPS in production.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const messaging = await getFirebaseMessaging(); if(!messaging) return false;
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  let token;
  try { token = await getToken(messaging,{vapidKey:fcmVapidKey,serviceWorkerRegistration:registration}); } catch (e) { throw new Error(`Push notification setup failed. ${e?.message||e?.code||''}`.trim()); }
  if(!token) return false;
  await setDoc(doc(db,'notificationTokens',auth.currentUser.uid,'tokens',hashCode(token)),{
    token,updatedAt:new Date().toISOString(),platform:'web'
  },{merge:true});
  return true;
}

export async function listenForegroundNotifications(handler) {
  const messaging = await getFirebaseMessaging();
  if(!messaging) return ()=>{};
  return onMessage(messaging,payload=>handler(payload));
}


export async function disablePushNotifications(){
  if(!auth?.currentUser||!db) return false;
  const messaging=await getFirebaseMessaging(); if(!messaging) return false; if(!fcmVapidKey) return false;
  try{
    const token=await getToken(messaging,{vapidKey:fcmVapidKey});
    if(token) await deleteDoc(doc(db,'notificationTokens',auth.currentUser.uid,'tokens',hashCode(token)));
  }catch{}
  return true;
}
