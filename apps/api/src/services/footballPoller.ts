import cron from 'node-cron';
import axios from 'axios';
import { getCache } from '../cache';
import { normalizeFootballMatch } from './matchNormalizer';
import { mockFootballMatches } from './mockData';
import { Match } from '@scorecard/types';

export const FOOTBALL_CACHE_KEYS = {
  live: 'football:live',
  upcoming: 'football:upcoming',
  recent: 'football:recent',
  lastUpdated: 'football:lastUpdated',
};

const COMPETITION_IDS = [2021, 2014, 2019, 2002, 2015, 2001]; // PL, LaLiga, SerieA, Bundesliga, Ligue1, UCL
const FOOTBALL_API_BASE = 'https://api.football-data.org/v4';

async function fetchAndCache(): Promise<void> {
  const cache = getCache();
  const apiKey = process.env.FOOTBALL_API_KEY;

  // Mock mode
  if (!apiKey) {
    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.live, mockFootballMatches.filter(m => m.status === 'LIVE'), 60);
    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.upcoming, mockFootballMatches.filter(m => m.status === 'UPCOMING'), 900);
    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.recent, mockFootballMatches.filter(m => m.status === 'FINISHED'), 900);
    await cache.set<string>(FOOTBALL_CACHE_KEYS.lastUpdated, new Date().toISOString(), 900);
    return;
  }

  const headers = { 'X-Auth-Token': apiKey };

  try {
    const liveMatches: Match[] = [];
    const upcomingMatches: Match[] = [];
    const recentMatches: Match[] = [];

    for (const id of COMPETITION_IDS) {
      const { data } = await axios.get(`${FOOTBALL_API_BASE}/competitions/${id}/matches`, {
        headers,
        params: { status: 'IN_PLAY,SCHEDULED,FINISHED', limit: 10 },
      });

      for (const raw of data.matches ?? []) {
        const match = normalizeFootballMatch(raw);
        if (match.status === 'LIVE') liveMatches.push(match);
        else if (match.status === 'UPCOMING') upcomingMatches.push(match);
        else recentMatches.push(match);
      }

      // Respect 10 req/min rate limit
      await new Promise(r => setTimeout(r, 6500));
    }

    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.live, liveMatches, 60);
    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.upcoming, upcomingMatches.slice(0, 30), 900);
    await cache.set<Match[]>(FOOTBALL_CACHE_KEYS.recent, recentMatches.slice(0, 30), 900);
    await cache.set<string>(FOOTBALL_CACHE_KEYS.lastUpdated, new Date().toISOString(), 3600);
  } catch (err) {
    console.error('[FootballPoller] Fetch failed:', err instanceof Error ? err.message : err);
  }
}

export function startFootballPoller(): void {
  // Run immediately on start
  void fetchAndCache();

  // Live: every 60 seconds
  cron.schedule('*/1 * * * *', () => void fetchAndCache());

  console.log('[FootballPoller] Started');
}
