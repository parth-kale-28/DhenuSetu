import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { askAI } from '../services/ai.js';
const router=express.Router();
router.post('/chat',requireAuth,async(req,res)=>{try{const text=await askAI(req.body||{});res.json({text})}catch(e){res.status(502).json({message:e.message})}});
export default router;
