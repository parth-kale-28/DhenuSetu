import { getAdminAuth, getDb } from '../config/firebase.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }

    const token = header.slice(7).trim();
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });

    const decoded = await getAdminAuth().verifyIdToken(token, false);
    const snap = await getDb().collection('users').doc(decoded.uid).get();
    if (!snap.exists) {
      return res.status(403).json({ message: 'Your account profile is incomplete. Please register again.' });
    }

    req.firebaseUser = decoded;
    req.profile = { id: snap.id, ...snap.data() };
    next();
  } catch (error) {
    // Keep the response user-friendly, but log the technical reason in the server.
    console.error('[Auth] Firebase ID-token verification failed:', error?.code || error?.message || error);
    return res.status(401).json({
      message: 'Your session could not be verified. Please sign in again.'
    });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.profile?.role)) return next();
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  };
}
