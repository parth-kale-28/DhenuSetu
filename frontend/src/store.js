import React, { useEffect, useState } from 'react';
import {
  collection, doc, getDoc, getDocs, onSnapshot, query, where,
  setDoc, updateDoc, deleteDoc, addDoc, writeBatch, orderBy, limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase.js';
import { apiFetch } from './api.js';

const cache = {
  user: null,
  publicProfiles: {},
  animals: [],
  connections: [],
  vetRecords: [],
  labReports: [],
  messages: [],
  environments: [],
  hardware: [],
  notifications: []
};
const listeners = new Set();
const unsubscribers = [];
let animalUnsubscribers = [];

function notify() { for (const fn of listeners) { try { fn(); } catch {} } }
export function subscribeStore(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function currentCache() { return cache; }

export function animalId() { return `AN-${crypto.randomUUID()}`; }
export function profileId(role, uid) { return `${role === 'Vet' ? 'VT' : 'FR'}-${uid.replace(/-/g,'').slice(0,8).toUpperCase()}`; }
export function pairKey(a,b) { return [a,b].sort().join('__'); }

export async function getProfile(uid) {
  if (!db) throw new Error('Firebase is not configured.');
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function ensureProfile(firebaseUser, role, extra = {}) {
  const uid = firebaseUser.uid;
  const existing = await getProfile(uid);
  const data = {
    id: uid,
    profileId: existing?.profileId || profileId(role, uid),
    name: extra.name || existing?.name || firebaseUser.displayName || '',
    email: firebaseUser.email || extra.email || existing?.email || '',
    phone: firebaseUser.phoneNumber || extra.phone || existing?.phone || '',
    role: existing?.role || role,
    farm: extra.farm ?? existing?.farm ?? '',
    license: extra.license ?? existing?.license ?? '',
    clinic: extra.clinic ?? existing?.clinic ?? '',
    state: extra.state ?? existing?.state ?? '',
    district: extra.district ?? existing?.district ?? '',
    village: extra.village ?? existing?.village ?? '',
    language: extra.language ?? existing?.language ?? 'English',
    updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  await setDoc(doc(db,'users',uid),data,{merge:true});
  await setDoc(doc(db,'publicProfiles',uid),{
    id:uid, profileId:data.profileId, name:data.name, role:data.role,
    farm:data.farm, clinic:data.clinic, updatedAt:data.updatedAt
  },{merge:true});
  cache.user = data;
  cache.publicProfiles[uid] = data;
  notify();
  return data;
}

export async function findPublicProfileById(pId) {
  if (!db) throw new Error('Firebase is not configured.');
  const snap = await getDocs(query(collection(db,'publicProfiles'), where('profileId','==',String(pId).trim().toUpperCase()), limit(1)));
  if (snap.empty) return null;
  return { id:snap.docs[0].id, ...snap.docs[0].data() };
}

export function users() { return Object.values(cache.publicProfiles); }
export function findUser(id) { return cache.publicProfiles[id] || null; }
export function animalsFor(user) { return (cache.animals||[]).filter(a=>a&&a.ownerId===user.id); }
export function connections() { return cache.connections; }
export function isConnected(a,b) { return cache.connections.some(c=>c.status==='approved' && ((c.fromId===a.id && c.toId===b.id)||(c.fromId===b.id&&c.toId===a.id))); }
export function connectionPairsFor(user) { return cache.connections.filter(c=>c.status==='approved'&&(c.fromId===user.id||c.toId===user.id)); }
export function pendingFor(user) { return cache.connections.filter(c=>c.status==='pending'&&c.toId===user.id); }
export function vetRecordsFor(user) { return (cache.vetRecords||[]).filter(r=>r&&(r.farmerId===user.id||r.vetId===user.id)); }
export function labReportsFor(user) { return (cache.labReports||[]).filter(r=>r&&(r.farmerId===user.id||r.vetId===user.id)); }
export function messagesFor(user) { return (cache.messages||[]).filter(m=>m&&(m.fromId===user.id||m.toId===user.id)); }
export function farmEnvironmentFor(user) { return cache.environments.find(e=>e.ownerId===user.id)||{ownerId:user.id,zone:'',ambientTemp:null,humidity:null,housing:'',hygiene:'',milking:'',history:[],observations:{}}; }

export async function saveAnimal(user, animal) {
  const ref = doc(db,'animals',animal.id||animalId());
  const value={...animal,id:ref.id,ownerId:user.id,updatedAt:new Date().toISOString(),createdAt:animal.createdAt||new Date().toISOString()};
  await setDoc(ref,value,{merge:true});
  const i=cache.animals.findIndex(a=>a.id===value.id); if(i>=0) cache.animals[i]=value; else cache.animals.push(value); notify(); return value;
}
export async function removeAnimal(user,id) {
  const a=cache.animals.find(x=>x.id===id); if(!a||a.ownerId!==user.id) throw new Error('Animal not found.');
  await deleteDoc(doc(db,'animals',id)); cache.animals=cache.animals.filter(x=>x.id!==id); notify();
}
export async function saveEnvironment(user,data) {
  const existing=cache.environments.find(e=>e.ownerId===user.id); const ref=existing?doc(db,'environments',existing.id):doc(collection(db,'environments'));
  const value={...data,id:ref.id,ownerId:user.id,updatedAt:new Date().toISOString()}; await setDoc(ref,value,{merge:true});
  cache.environments=cache.environments.filter(e=>e.id!==ref.id); cache.environments.push(value); notify(); return value;
}
export async function sendConnection(user,targetProfile) {
  const key=pairKey(user.id,targetProfile.id);
  const value={id:key,pairKey:key,fromId:user.id,toId:targetProfile.id,fromRole:user.role,toRole:targetProfile.role,status:'pending',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  await setDoc(doc(db,'connections',key),value,{merge:true}); return value;
}
export async function decideConnection(user,connection,status) {
  if(connection.toId!==user.id) throw new Error('Only the recipient can approve or reject this request.');
  await updateDoc(doc(db,'connections',connection.id),{status,updatedAt:new Date().toISOString()});
}
export async function saveVetRecord(user,value) {
  const ref=doc(collection(db,'vetRecords'));const row={...value,id:ref.id,vetId:user.id,createdAt:new Date().toISOString()};await setDoc(ref,row);return row;
}
export async function saveLabReport(user,value) {
  const ref=doc(collection(db,'labReports'));const row={...value,id:ref.id,farmerId:user.id,status:value.status||'Submitted',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await setDoc(ref,row);return row;
}
export async function recordAnimalDailyObservation(user,animal,observation){if(!animal?.id)throw new Error('Animal ID is missing.');if(!db)throw new Error('Firebase is not configured.');const current=Array.isArray(animal.history)?animal.history.filter(Boolean):[];const day=String(observation.d||'').slice(0,10);const history=current.filter(h=>String(h?.d||'').slice(0,10)!==day);history.push(observation);history.sort((a,b)=>String(a?.d||'').localeCompare(String(b?.d||'')));const now=new Date();const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;const patch={history,updatedAt:new Date().toISOString()};if(day===today){Object.assign(patch,{milk:observation.milk??animal.milk,scc:observation.scc??animal.scc,temp:observation.temp??animal.temp,conductivity:observation.conductivity??animal.conductivity,pH:observation.pH??animal.pH,activity:observation.activity??animal.activity,rumination:observation.rumination??animal.rumination,risk:observation.risk??animal.risk,level:observation.level??animal.level})}await updateDoc(doc(db,'animals',animal.id),patch);const i=cache.animals.findIndex(a=>a?.id===animal.id);if(i>=0)cache.animals[i]={...cache.animals[i],...patch};notify();return cache.animals[i]||{...animal,...patch}}
export async function updateLabReport(user,id,patch) {
  if(!id) throw new Error('Lab report ID is missing.');
  const target=cache.labReports.find(r=>r?.id===id);
  if(target && user.role==='Vet' && target.vetId && target.vetId!==user.id){ throw new Error('You are not authorized to update this lab report.'); }
  await updateDoc(doc(db,'labReports',id),{...patch,updatedAt:new Date().toISOString()});
}
export async function sendMessage(user,toId,text,imageUrl='') {
  if(!isConnected(user,findUser(toId))) throw new Error('You are not connected to this user.');
  const ref=doc(collection(db,'messages')); const row={id:ref.id,fromId:user.id,toId,text,imageUrl,createdAt:new Date().toISOString()}; await setDoc(ref,row); return row;
}
export async function updateUserProfile(user,patch) {
  const value={...user,...patch,updatedAt:new Date().toISOString()};
  await setDoc(doc(db,'users',user.id),value,{merge:true});
  await setDoc(doc(db,'publicProfiles',user.id),{id:user.id,profileId:value.profileId,name:value.name,role:value.role,farm:value.farm,clinic:value.clinic,updatedAt:value.updatedAt},{merge:true});
  cache.user=value;cache.publicProfiles[user.id]=value;notify();return value;
}

export async function dispatchNotification(payload) {
  return apiFetch('/api/notifications/dispatch',{method:'POST',body:JSON.stringify(payload)});
}

async function ensureDailyObservationReminder(user,rows){if(user?.role!=='Farmer'||!(rows||[]).length)return;const d=new Date();const today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const needs=(rows||[]).some(a=>!(Array.isArray(a?.history)?a.history:[]).some(h=>String(h?.d||'').slice(0,10)===today));if(!needs)return;const already=(cache.notifications||[]).some(n=>n?.userId===user.id&&n?.kind==='daily-data'&&String(n.createdAt||'').slice(0,10)===today);if(already)return;try{await apiFetch('/api/notifications/dispatch',{method:'POST',body:JSON.stringify({recipientId:user.id,title:'Daily animal update reminder',body:'Please enter today’s milk and health observations for your animals in “Update today’s info”.',kind:'daily-data',data:{type:'daily-data',path:'/animals'}})}); }catch{}}

function addUserAndSubs(user) {
  const uid=user.id;
  unsubscribers.splice(0).forEach(fn=>{try{fn()}catch{}});
  animalUnsubscribers.splice(0).forEach(fn=>{try{fn()}catch{}});
  if(!db||!uid) return;
  const listen=(q,handler)=>{const u=onSnapshot(q,snap=>handler(snap.docs.map(d=>({id:d.id,...d.data()}))));unsubscribers.push(u)};
  listen(query(collection(db,'publicProfiles'), limit(200)), rows=>{cache.publicProfiles=Object.fromEntries(rows.map(r=>[r.id,r])); notify();});
  listen(query(collection(db,'animals'),where('ownerId','==',uid)), rows=>{cache.animals=(rows||[]).filter(Boolean);notify();if(user.role==='Farmer')ensureDailyObservationReminder(user,cache.animals);});
  const watchVetRelated=()=>{
    if(user?.role!=='Vet') return;
    animalUnsubscribers.splice(0).forEach(fn=>{try{fn()}catch{}});
    const farmerIds=cache.connections.filter(c=>c.status==='approved'&&(c.fromId===uid||c.toId===uid)).map(c=>c.fromId===uid?c.toId:c.fromId).filter(id=>id!==uid);
    if(!farmerIds.length){cache.animals=[];cache.vetRecords=[];cache.labReports=[];notify();return;}
    const maps={animals:new Map(),vetRecords:new Map(),labReports:new Map()};
    for(const farmerId of farmerIds){
      animalUnsubscribers.push(onSnapshot(query(collection(db,'animals'),where('ownerId','==',farmerId)),snap=>{for(const d of snap.docs)maps.animals.set(d.id,{id:d.id,...d.data()});cache.animals=Array.from(maps.animals.values());notify()}));
      animalUnsubscribers.push(onSnapshot(query(collection(db,'vetRecords'),where('farmerId','==',farmerId)),snap=>{for(const d of snap.docs)maps.vetRecords.set(d.id,{id:d.id,...d.data()});cache.vetRecords=Array.from(new Map([...cache.vetRecords.filter(r=>r?.id).map(r=>[r.id,r]),...maps.vetRecords]).values());notify()}));
      animalUnsubscribers.push(onSnapshot(query(collection(db,'labReports'),where('farmerId','==',farmerId)),snap=>{for(const d of snap.docs)maps.labReports.set(d.id,{id:d.id,...d.data()});cache.labReports=Array.from(new Map([...cache.labReports.filter(r=>r?.id).map(r=>[r.id,r]),...maps.labReports]).values());notify()}));
    }
  };
  listen(query(collection(db,'connections'),where('fromId','==',uid)), rows=>{mergeConnections(rows);watchVetRelated()});
  listen(query(collection(db,'connections'),where('toId','==',uid)), rows=>{mergeConnections(rows);watchVetRelated()});
  listen(query(collection(db,'vetRecords'),where('farmerId','==',uid)), rows=>mergeById('vetRecords',rows));
  listen(query(collection(db,'vetRecords'),where('vetId','==',uid)), rows=>mergeById('vetRecords',rows));
  listen(query(collection(db,'labReports'),where('farmerId','==',uid)), rows=>mergeById('labReports',rows));
  listen(query(collection(db,'labReports'),where('vetId','==',uid)), rows=>mergeById('labReports',rows));
  listen(query(collection(db,'messages'),where('fromId','==',uid)), rows=>mergeById('messages',rows));
  listen(query(collection(db,'messages'),where('toId','==',uid)), rows=>mergeById('messages',rows));
  listen(query(collection(db,'environments'),where('ownerId','==',uid)), rows=>{cache.environments=rows;notify();});
  listen(query(collection(db,'hardware'),where('ownerId','==',uid)), rows=>{cache.hardware=rows;notify();});
  listen(query(collection(db,'notifications'),where('userId','==',uid)), rows=>{cache.notifications=(rows||[]).filter(Boolean).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));notify();});
}
function mergeById(key,rows){const safe=(rows||[]).filter(r=>r&&r.id);const others=(cache[key]||[]).filter(x=>x&&!safe.some(r=>r.id===x.id));cache[key]=[...others,...safe];notify();}
function mergeConnections(rows){const safe=(rows||[]).filter(r=>r&&r.id);const others=(cache.connections||[]).filter(x=>x&&!safe.some(r=>r.id===x.id));cache.connections=[...others,...safe];notify();}
export function startLiveSync(user){ cache.user=user; addUserAndSubs(user); return ()=>{unsubscribers.splice(0).forEach(fn=>{try{fn()}catch{}});animalUnsubscribers.splice(0).forEach(fn=>{try{fn()}catch{}})}; }

export function useCloudVersion(){const[,setV]=useState(0);useEffect(()=>subscribeStore(()=>setV(v=>v+1)),[]);return currentCache();}

export function useUserProfile(user){const [profile,setProfile]=useState(user);useEffect(()=>{if(!user?.id||!db)return;getProfile(user.id).then(p=>{if(p)setProfile(p)}).catch(()=>{});return subscribeStore(()=>setProfile(currentCache().user||user));},[user?.id]);return profile;}
