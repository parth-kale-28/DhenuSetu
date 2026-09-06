import { auth, appCheck } from './firebase.js';
import { getToken as getAppCheckToken } from 'firebase/app-check';

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type','application/json');
  }
  const user = auth?.currentUser;
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  if (appCheck) {
    try { const token = await getAppCheckToken(appCheck); if(token?.token) headers.set('X-Firebase-AppCheck', token.token); } catch {}
  }
  let response = await fetch(path, {...options, headers});
  if(response.status===401 && user){
    try{headers.set('Authorization', `Bearer ${await user.getIdToken(true)}`);response=await fetch(path,{...options,headers});}catch{}
  }
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message:text }; }
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data;
}

export const aiChat = (prompt, context={}, history=[]) => apiFetch('/api/ai/chat',{method:'POST',body:JSON.stringify({prompt,context,history})});
export const signMedia = (payload) => apiFetch('/api/media/sign',{method:'POST',body:JSON.stringify(payload)});
export const dispatchNotification = (payload) => apiFetch('/api/notifications/dispatch',{method:'POST',body:JSON.stringify(payload)});
export const emailTest = (payload) => apiFetch('/api/notifications/email-test',{method:'POST',body:JSON.stringify(payload)});
export const health = () => apiFetch('/api/health');
