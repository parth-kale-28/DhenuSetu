import express from 'express';
import { getDb } from '../config/firebase.js';
import { requireAuth } from '../middleware/auth.js';

const router=express.Router();
router.get('/animals',requireAuth,async(req,res)=>{const db=getDb();const snap=req.profile.role==='Farmer'?await db.collection('animals').where('ownerId','==',req.firebaseUser.uid).get():await db.collection('animals').get();res.json({items:snap.docs.map(d=>({id:d.id,...d.data()}))})});
router.get('/connections',requireAuth,async(req,res)=>{const db=getDb();const[a,b]=await Promise.all([db.collection('connections').where('fromId','==',req.firebaseUser.uid).get(),db.collection('connections').where('toId','==',req.firebaseUser.uid).get()]);const map=new Map();[...a.docs,...b.docs].forEach(d=>map.set(d.id,{id:d.id,...d.data()}));res.json({items:[...map.values()]})});
export default router;
