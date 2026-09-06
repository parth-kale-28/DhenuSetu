import { getAppCheck } from 'firebase-admin/app-check';
export async function requireAppCheck(req,res,next){
  if(process.env.ENFORCE_APP_CHECK!=='true') return next();
  try{const token=req.headers['x-firebase-appcheck'];if(!token)return res.status(401).json({message:'App Check token required.'});await getAppCheck().verifyToken(token);next()}catch{return res.status(401).json({message:'Invalid App Check token.'})}
}
