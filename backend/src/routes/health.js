import express from 'express';
import { getApps } from 'firebase-admin/app';
import { getDb, getAdminAuth } from '../config/firebase.js';
import { emailConfigured } from '../services/email.js';

const router = express.Router();

router.get('/', (_req, res) => {
  const fb = getApps()[0];
  res.json({
    status: 'ok',
    service: 'DhenuSetu API',
    time: new Date().toISOString(),
    firebaseAdmin: {
      initialized: Boolean(fb),
      projectId: fb?.options?.projectId || null
    },
    integrations: {
      email: emailConfigured(),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    }
  });
});

router.get('/deep', async (_req, res) => {
  const checks = {
    firebaseAuth: false,
    firestore: false
  };
  const errors = [];

  try {
    await getAdminAuth().listUsers(1);
    checks.firebaseAuth = true;
  } catch (e) {
    errors.push(`Firebase Auth: ${e.message}`);
  }

  try {
    await getDb().collection('users').limit(1).get();
    checks.firestore = true;
  } catch (e) {
    errors.push(`Firestore: ${e.message}`);
  }

  const allGood = checks.firebaseAuth && checks.firestore;
  res.status(allGood ? 200 : 503).json({
    status: allGood ? 'ok' : 'error',
    checks,
    projectId: getApps()[0]?.options?.projectId || null,
    errors
  });
});

export default router;
