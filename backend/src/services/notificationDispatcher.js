import { getAdminMessaging, getDb } from '../config/firebase.js';
import { sendEmail, templates, emailConfigured } from './email.js';

export async function dispatchUserNotification({recipientId,title,body,data={},kind='general',emailTemplate,animalName,status,details={}}){
  const defaultPaths={risk:'/risk',lab:'/lab',connection:'/vet',message:'/vet',general:'/alerts'};
const payloadData={...data,path:data.path||defaultPaths[kind]||'/alerts'};
const db=getDb(); const snap=await db.collection('users').doc(recipientId).get();
  if(!snap.exists) throw new Error('Recipient not found.');
  const profile=snap.data(); const now=new Date().toISOString();
  const note=db.collection('notifications').doc();
  await note.set({id:note.id,userId:recipientId,title,body,data:payloadData,kind,read:false,createdAt:now});
  let pushSent=0;
  const tokens=await db.collection('notificationTokens').doc(recipientId).collection('tokens').get();
  for(const d of tokens.docs){try{await getAdminMessaging().send({token:d.data().token,notification:{title,body},data:Object.fromEntries(Object.entries(payloadData).map(([k,v])=>[k,String(v)]))});pushSent++}catch{}}
  let emailSent=false;
  if(profile.email&&emailConfigured()){
    let mail={subject:title,html:`<div style="font-family:Arial,sans-serif"><h2>${title}</h2><p>${body}</p></div>`};
    if(emailTemplate==='risk')mail=templates.risk(profile.name,animalName||'Animal',{...(details||{}),...(data.details||{}),risk:details?.risk??data.details?.risk??data.risk,level:details?.level??data.details?.level??data.level,animalTag:details?.animalTag??data.details?.animalTag,farm:details?.farm??data.details?.farm,milk:details?.milk??data.details?.milk,scc:details?.scc??data.details?.scc,temp:details?.temp??data.details?.temp,conductivity:details?.conductivity??data.details?.conductivity,pH:details?.pH??data.details?.pH,activity:details?.activity??data.details?.activity,rumination:details?.rumination??data.details?.rumination,hygiene:details?.hygiene??data.details?.hygiene,recommendation:details?.recommendation??data.details?.recommendation??body});
    if(emailTemplate==='lab')mail=templates.lab(profile.name,animalName||'Animal',status||'Updated',{...(details||{}),...(data.details||{}),animalTag:details?.animalTag??data.details?.animalTag??data.animalTag,testName:details?.testName??data.details?.testName??data.testName,labName:details?.labName??data.details?.labName??data.labName,sampleDate:details?.sampleDate??data.details?.sampleDate??data.sampleDate,result:details?.result??data.details?.result??data.result,farmerName:details?.farmerName??data.details?.farmerName??data.farmerName,farm:details?.farm??data.details?.farm??data.farm,closureComment:details?.closureComment||data.details?.closureComment||data.closureComment||''});
    if(emailTemplate==='connection')mail=templates.connection(profile.name,String(data.fromName||'DhenuSetu user'),body,{role:data.role||data.details?.role,status:data.status||data.details?.status});
    if(emailTemplate==='message')mail=templates.message(profile.name,{from:String(data.fromName||'DhenuSetu user'),message:String(data.messageText||body||''),time:String(data.messageTime||new Date().toLocaleString()),hasAttachment:Boolean(data.hasAttachment)});if(emailTemplate==='welcome')mail=templates.welcome(profile.name,String(data.role||'user'));
    try{await sendEmail({to:profile.email,...mail});emailSent=true}catch{}
  }
  return {ok:true,pushSent,emailSent,notificationId:note.id};
}
