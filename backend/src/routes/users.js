import express from 'express';
import { getDb } from '../config/firebase.js';
import { requireAuth } from '../middleware/auth.js';

const router=express.Router();
router.get('/me',requireAuth,(req,res)=>res.json({profile:req.profile}));
router.put('/me',requireAuth,async(req,res)=>{const allowed=['name','farm','license','clinic','state','district','village','language'];const patch=Object.fromEntries(Object.entries(req.body||{}).filter(([k])=>allowed.includes(k)));patch.updatedAt=new Date().toISOString();await getDb().collection('users').doc(req.firebaseUser.uid).set(patch,{merge:true});const snap=await getDb().collection('users').doc(req.firebaseUser.uid).get();res.json({profile:{id:snap.id,...snap.data()}})});
export default router;
