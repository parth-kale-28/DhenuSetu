import express from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
const router=express.Router();
function cleanPart(v){return String(v||'').replace(/[^a-zA-Z0-9_\/-]/g,'').replace(/\/+/g,'/').replace(/^\/+|\/+$/g,'')||'general'}
router.post('/sign',requireAuth,(req,res)=>{
  const {CLOUDINARY_CLOUD_NAME,CLOUDINARY_API_KEY,CLOUDINARY_API_SECRET}=process.env;
  if(!CLOUDINARY_CLOUD_NAME||!CLOUDINARY_API_KEY||!CLOUDINARY_API_SECRET)return res.status(503).json({message:'Image upload service is not configured yet.'});
  let requested=cleanPart(req.body?.folder||'general');
  if(requested.toLowerCase().startsWith('dhenusetu/')) requested=requested.slice(9);
  const folder=`dhenusetu/${req.firebaseUser.uid}/${requested}`;
  const timestamp=Math.floor(Date.now()/1000);
  const publicId=crypto.randomUUID();
  const params=`folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature=crypto.createHash('sha1').update(params+CLOUDINARY_API_SECRET).digest('hex');
  res.json({cloudName:CLOUDINARY_CLOUD_NAME,apiKey:CLOUDINARY_API_KEY,timestamp,signature,folder,publicId});
});
export default router;
