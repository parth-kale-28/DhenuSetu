import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initFirebase } from './config/firebase.js';
import health from './routes/health.js';
import ai from './routes/ai.js';
import media from './routes/media.js';
import notifications from './routes/notifications.js';
import hardware from './routes/hardware.js';
import users from './routes/users.js';
import data from './routes/data.js';
import { notFound,errorHandler } from './middleware/error.js';
import { requireAppCheck } from './middleware/appCheck.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
dotenv.config({path:path.resolve(__dirname,'..','.env')});
const app=express();
const PORT=Number(process.env.PORT||5000);
const origins=(process.env.FRONTEND_ORIGINS||'http://localhost:5173').split(',').map(x=>x.trim()).filter(Boolean);

app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(cors({origin:(origin,cb)=>{if(!origin||origins.includes(origin))return cb(null,true);cb(new Error('Origin not allowed.'))},credentials:false}));
app.use(rateLimit({windowMs:60_000,max:120,standardHeaders:true,legacyHeaders:false}));
app.use(express.json({limit:'2mb'}));
app.get('/',(_req,res)=>res.json({service:'DhenuSetu API',status:'running',health:'/api/health'}));
app.use('/api/health',health);
app.use('/api/ai',requireAppCheck,ai);
app.use('/api/media',requireAppCheck,media);
app.use('/api/notifications',requireAppCheck,notifications);
app.use('/api/users',requireAppCheck,users);
app.use('/api/data',requireAppCheck,data);
app.use('/api/hardware',hardware);
app.use(notFound);app.use(errorHandler);

try{initFirebase();}catch(e){console.warn('Firebase Admin is not initialized yet:',e.message)}
app.listen(PORT,()=>console.log(`DhenuSetu API listening on ${PORT}`));
