export function hashCode(value){let h=0;for(let i=0;i<value.length;i++)h=((h<<5)-h+value.charCodeAt(i))|0;return Math.abs(h).toString(36)}
export function escapeCsvValue(v){return `"${String(v??'').replaceAll('"','""')}"`}
export function exportCsv(rows,filename){if(!rows.length)return;const flat=rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='object'?JSON.stringify(v):v])));const keys=[...new Set(flat.flatMap(r=>Object.keys(r)))];const csv=[keys.join(','),...flat.map(r=>keys.map(k=>escapeCsvValue(r[k])).join(','))].join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}

export function riskFromAnimal(a){
  const has=['scc','temp','conductivity','pH','milk','activity','rumination'].some(k=>a[k]!==undefined&&a[k]!==null&&a[k]!=='');
  if(!has)return{risk:null,level:'Insufficient Data'};
  const nums=[['temp',30,42],['milk',0,100],['scc',0,5000],['conductivity',0,20],['pH',0,14]];
  for(const[k,min,max]of nums){if(a[k]!==undefined&&a[k]!==null&&a[k]!==''&&(Number(a[k])<min||Number(a[k])>max))return{risk:null,level:'Insufficient Data'}}
  let score=0;
  const scc=Number(a.scc),temp=Number(a.temp),ec=Number(a.conductivity),ph=Number(a.pH);
  if(Number.isFinite(scc)){if(scc>=500)score+=45;else if(scc>=310)score+=35;else if(scc>=200)score+=22;else if(scc>=150)score+=8;}
  if(Number.isFinite(temp)){if(temp>=40)score+=30;else if(temp>=39.5)score+=20;else if(temp>=39)score+=10;}
  if(Number.isFinite(ec)){if(ec>=7)score+=20;else if(ec>=6)score+=12;else if(ec>=5.5)score+=6;}
  if(Number.isFinite(ph)){if(ph<6||ph>7.2)score+=15;else if(ph<6.3||ph>7)score+=7;}
  if(a.activity==='Low')score+=10;else if(a.activity==='Reduced')score+=5;
  if(a.rumination==='Low')score+=10;else if(a.rumination==='Reduced')score+=5;
  score=Math.min(100,Math.round(score));
  return{risk:score,level:score>=70?'High':score>=40?'Moderate':score>=20?'Low':'No Risk'};
}

export function friendlyError(err){
  const code=String(err?.code||''); const msg=String(err?.message||'');
  const map={
    'auth/invalid-credential':'Email/phone or password is incorrect.',
    'auth/invalid-email':'Please enter a valid email address.',
    'auth/email-already-in-use':'An account with this email already exists. Try signing in instead.',
    'auth/weak-password':'Password is too weak. Use at least 6 characters.',
    'auth/user-not-found':'No account was found with these details.',
    'auth/wrong-password':'The password is incorrect.',
    'auth/too-many-requests':'Too many attempts. Please wait a while and try again.',
    'auth/invalid-verification-code':'The OTP is incorrect. Please try again.',
    'auth/code-expired':'The OTP has expired. Please request a new one.',
    'auth/quota-exceeded':'The service limit was reached. Please try again later.',
    'auth/network-request-failed':'Network connection failed. Check your internet connection.',
    'auth/operation-not-allowed':'This sign-in method is not enabled in Firebase Authentication.',
    'auth/captcha-check-failed':'Security verification failed. Please try again.',
    'auth/invalid-phone-number':'Please enter a valid mobile number with country code.',
    'auth/missing-phone-number':'Please enter your mobile number.',
    'auth/requires-recent-login':'Please sign in again and retry this action.',
    'permission-denied':'You do not have permission to perform this action.',
    'failed-precondition':'This operation is not available yet. Please check the setup.'
  };
  if(map[code]) return map[code];
  if(msg.includes('Your session could not be verified')||msg.includes('Invalid or expired authentication token'))return 'Your session could not be verified. Please sign in again. If it keeps happening, verify that the backend Firebase service-account belongs to the same Firebase project as the website.';
  if(msg.includes('Cloudinary')||msg.includes('Media upload'))return 'The image service could not upload this file. Check the Cloudinary settings and try again.';
  if(msg.includes('Gemini')||msg.includes('AI assistant'))return 'The AI assistant is temporarily unavailable. Check the Gemini API key and backend settings.';
  if(msg.includes('Origin not allowed'))return 'The server is rejecting this website address. Check the backend allowed origins.';
  if(msg.includes('permission-denied'))return 'You do not have permission to perform this action.';
  return msg || 'Something went wrong. Please try again.';
}
