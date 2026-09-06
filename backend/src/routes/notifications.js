import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../config/firebase.js';
import { dispatchUserNotification } from '../services/notificationDispatcher.js';

const router=express.Router();

async function canNotify(callerUid,recipientId){
  if(callerUid===recipientId)return true;
  const db=getDb();
  const key=[callerUid,recipientId].sort().join('__');
  const snap=await db.collection('connections').doc(key).get();
  return snap.exists&&snap.data().status==='approved';
}

router.post('/dispatch',requireAuth,async(req,res)=>{
  try{
    const p=req.body||{};
    if(!p.recipientId||!p.title||!p.body)return res.status(400).json({message:'recipientId, title and body are required.'});
    if(!(await canNotify(req.firebaseUser.uid,p.recipientId)))return res.status(403).json({message:'You are not authorized to notify this user.'});
    res.json(await dispatchUserNotification(p));
  }catch(e){res.status(500).json({message:e.message})}
});

router.post('/welcome',requireAuth,async(req,res)=>{try{const result=await dispatchUserNotification({recipientId:req.firebaseUser.uid,title:'Welcome to DhenuSetu',body:'Your account has been created successfully.',kind:'welcome',emailTemplate:'welcome',data:{role:req.body?.role||'user'}});res.json(result)}catch(e){res.status(500).json({message:e.message})}});
router.post('/email-test',requireAuth,async(req,res)=>{
  try{
    res.json(await dispatchUserNotification({
      recipientId:req.firebaseUser.uid,
      title:'DhenuSetu email test',
      body:'This is a test email from DhenuSetu.'
    }));
  }catch(e){res.status(500).json({message:e.message})}
});

export default router;
