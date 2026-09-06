import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

let app,db,adminAuth,messaging;

function serviceAccountPath(){
  const configured=process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const backendRoot=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
  if(configured){
    if(path.isAbsolute(configured)) return configured;
    return path.resolve(backendRoot,configured);
  }
  return path.resolve(backendRoot,'secrets/serviceAccountKey.json');
}

export function initFirebase(){
  if(app) return {app,db,adminAuth,messaging};
  const projectId=process.env.FIREBASE_PROJECT_ID;
  const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n');
  const filePath=serviceAccountPath();
  console.log(`DhenuSetu Firebase Admin key path: ${filePath}`);
  let options={};
  if(projectId&&clientEmail&&privateKey) options={credential:cert({projectId,clientEmail,privateKey})};
  else if(fs.existsSync(filePath)) options={credential:cert(JSON.parse(fs.readFileSync(filePath,'utf8')))};
  else options={credential:applicationDefault()};
  app=getApps().length?getApps()[0]:initializeApp(options);
  db=getFirestore(app);adminAuth=getAuth(app);messaging=getMessaging(app);
  return {app,db,adminAuth,messaging};
}
export function getDb(){return initFirebase().db}
export function getAdminAuth(){return initFirebase().adminAuth}
export function getAdminMessaging(){return initFirebase().messaging}
