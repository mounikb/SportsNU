import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { prisma } from '../db/prisma';

const router = Router();

router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body as { token?: string };

  // Dev bypass: no token needed
  if (process.env.NODE_ENV === 'development' && !process.env.FIREBASE_PROJECT_ID) {
    const devUser = await prisma.user.upsert({
      where: { firebaseUid: 'dev-firebase-uid' },
      update: {},
      create: {
        id: 'dev-user-id',
        firebaseUid: 'dev-firebase-uid',
        email: 'dev@scorecard.local',
        displayName: 'Dev User',
      },
    });
    res.json({ user: devUser });
    return;
  }

  if (!token) {
    res.status(400).json({ error: 'Missing token' });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: { displayName: decoded.name ?? null },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? '',
        displayName: decoded.name ?? null,
      },
    });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
