importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBHPXjV0jWeJyzmUmH3NjECSPKy09QrJOU',
  authDomain: 'dhenusetu-eae0c.firebaseapp.com',
  projectId: 'dhenusetu-eae0c',
  storageBucket: 'dhenusetu-eae0c.firebasestorage.app',
  messagingSenderId: '20987898176',
  appId: '1:20987898176:web:0566d1a6506ed308a7b2a5'
});

const messaging=firebase.messaging();

messaging.onBackgroundMessage(payload=>{
  const n=payload.notification||{};
  self.registration.showNotification(n.title||'DhenuSetu',{
    body:n.body||'',
    icon:'/dhenusetu-logo-icon.png',
    data:payload.data||{}
  });
});

self.addEventListener('notificationclick',event=>{
  const target=event.notification?.data?.path||'/alerts';
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if('focus' in c){c.focus();try{c.postMessage({type:'NAVIGATE',target:target.replace(/^\//,'')})}catch{}return}}
    return clients.openWindow(new URL('/',self.location.origin).href);
  }));
});
