import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getCache } from '../cache';
import { prisma } from '../db/prisma';
import { FOOTBALL_CACHE_KEYS } from '../services/footballPoller';
import { CRICKET_CACHE_KEYS } from '../services/cricketPoller';
import { Match } from '@scorecard/types';

const router = Router();

router.use(authMiddleware);

async function getMatchesForUser(userId: string): Promise<{ teamIds: Set<string>; sports: Set<string> }> {
  const follows = await prisma.teamFollow.findMany({
    where: { userId },
    include: { team: true },
  });
  const teamIds = new Set(follows.map(f => f.teamId));
  const sports = new Set(follows.map(f => f.team.sport));
  return { teamIds, sports };
}

function filterByUserTeams(matches: Match[], teamIds: Set<string>): Match[] {
  return matches.filter(
    m => teamIds.has(m.homeTeam.id) || teamIds.has(m.awayTeam.id)
  );
}

async function getMatchesByStatus(
  status: 'live' | 'upcoming' | 'recent',
  sports: Set<string>
): Promise<{ matches: Match[]; stale: boolean; lastUpdated: string }> {
  const cache = getCache();

  const footballKey = FOOTBALL_CACHE_KEYS[status];
  const cricketKey = CRICKET_CACHE_KEYS[status];

  const [
    footballMatches,
    cricketMatches,
    footballLastUpdated,
    cricketLastUpdated,
  ] = await Promise.all([
    sports.has('football') ? cache.get<Match[]>(footballKey) : Promise.resolve([]),
    sports.has('cricket') ? cache.get<Match[]>(cricketKey) : Promise.resolve([]),
    cache.get<string>(FOOTBALL_CACHE_KEYS.lastUpdated),
    cache.get<string>(CRICKET_CACHE_KEYS.lastUpdated),
  ]);

  const matches: Match[] = [
    ...(footballMatches ?? []),
    ...(cricketMatches ?? []),
  ];

  const lastUpdated = footballLastUpdated ?? cricketLastUpdated ?? new Date().toISOString();
  const stale = !footballLastUpdated && !cricketLastUpdated;

  return { matches, stale, lastUpdated };
}

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamIds, sports } = await getMatchesForUser(req.user!.id);
    const [live, upcoming, recent] = await Promise.all([
      getMatchesByStatus('live', sports),
      getMatchesByStatus('upcoming', sports),
      getMatchesByStatus('recent', sports),
    ]);
    res.json({
      live: filterByUserTeams(live.matches, teamIds),
      upcoming: filterByUserTeams(upcoming.matches, teamIds),
      recent: filterByUserTeams(recent.matches, teamIds),
      stale: live.stale || upcoming.stale || recent.stale,
      lastUpdated: live.lastUpdated,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/live', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamIds, sports } = await getMatchesForUser(req.user!.id);
    const { matches, stale, lastUpdated } = await getMatchesByStatus('live', sports);
    res.json({ matches: filterByUserTeams(matches, teamIds), stale, lastUpdated });
  } catch (err) {
    next(err);
  }
});

router.get('/upcoming', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamIds, sports } = await getMatchesForUser(req.user!.id);
    const { matches, stale, lastUpdated } = await getMatchesByStatus('upcoming', sports);
    res.json({ matches: filterByUserTeams(matches, teamIds), stale, lastUpdated });
  } catch (err) {
    next(err);
  }
});

router.get('/recent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { teamIds, sports } = await getMatchesForUser(req.user!.id);
    const { matches, stale, lastUpdated } = await getMatchesByStatus('recent', sports);
    res.json({ matches: filterByUserTeams(matches, teamIds), stale, lastUpdated });
  } catch (err) {
    next(err);
  }
});

export default router;
