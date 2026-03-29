import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sport = req.query['sport'] as string | undefined;
    const where = sport ? { sport } : {};
    const teams = await prisma.team.findMany({ where });
    res.json({ teams });
  } catch (err) {
    next(err);
  }
});

router.get('/mine', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const follows = await prisma.teamFollow.findMany({
      where: { userId: req.user!.id },
      include: { team: true },
    });
    res.json({ teams: follows.map(f => f.team) });
  } catch (err) {
    next(err);
  }
});

router.post('/follow', async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.body as { teamId?: string };
  if (!teamId) {
    res.status(400).json({ error: 'Missing teamId' });
    return;
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  try {
    const follow = await prisma.teamFollow.create({
      data: { userId: req.user!.id, teamId },
    });
    res.status(201).json({ follow });
  } catch {
    res.status(409).json({ error: 'Already following' });
  }
});

router.delete('/follow/:teamId', async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.params;
  await prisma.teamFollow.deleteMany({
    where: { userId: req.user!.id, teamId },
  });
  res.status(204).send();
});

export default router;
