import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { prisma } from '../db/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; firebaseUid: string };
    }
  }
}

let firebaseInitialized = false;

function getFirebaseApp(): admin.app.App | null {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return null;
  }

  if (!firebaseInitialized) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    firebaseInitialized = true;
  }

  return admin.app();
}

const DEV_USER = {
  id: 'dev-user-id',
  email: 'dev@scorecard.local',
  firebaseUid: 'dev-firebase-uid',
};

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const firebaseApp = getFirebaseApp();

  // Dev bypass: no Firebase config + development env
  if (!firebaseApp && process.env.NODE_ENV === 'development') {
    req.user = DEV_USER;
    next();
    return;
  }

  if (!firebaseApp) {
    res.status(500).json({ error: 'Firebase not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    let user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email ?? '',
          displayName: decoded.name ?? null,
        },
      });
    }

    req.user = { id: user.id, email: user.email, firebaseUid: user.firebaseUid };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
