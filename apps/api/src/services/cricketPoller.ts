import cron from 'node-cron';
import axios from 'axios';
import { getCache } from '../cache';
import { normalizeCricketMatch } from './matchNormalizer';
import { mockCricketMatches } from './mockData';
import { Match } from '@scorecard/types';

export const CRICKET_CACHE_KEYS = {
  live: 'cricket:live',
  upcoming: 'cricket:upcoming',
  recent: 'cricket:recent',
  lastUpdated: 'cricket:lastUpdated',
};

const CRICKET_API_BASE = 'https://api.cricapi.com/v1';

async function fetchAndCache(): Promise<void> {
  const cache = getCache();
  const apiKey = process.env.CRICKET_API_KEY;

  // Mock mode
  if (!apiKey) {
    await cache.set<Match[]>(CRICKET_CACHE_KEYS.live, mockCricketMatches.filter(m => m.status === 'LIVE'), 180);
    await cache.set<Match[]>(CRICKET_CACHE_KEYS.upcoming, mockCricketMatches.filter(m => m.status === 'UPCOMING'), 900);
    await cache.set<Match[]>(CRICKET_CACHE_KEYS.recent, mockCricketMatches.filter(m => m.status === 'FINISHED'), 900);
    await cache.set<string>(CRICKET_CACHE_KEYS.lastUpdated, new Date().toISOString(), 900);
    return;
  }

  try {
    const { data: currentData } = await axios.get(`${CRICKET_API_BASE}/currentMatches`, {
      params: { apikey: apiKey, offset: 0 },
    });

    const { data: allData } = await axios.get(`${CRICKET_API_BASE}/matches`, {
      params: { apikey: apiKey, offset: 0 },
    });

    const liveMatches: Match[] = [];
    const upcomingMatches: Match[] = [];
    const recentMatches: Match[] = [];

    for (const raw of currentData.data ?? []) {
      const match = normalizeCricketMatch(raw);
      if (match.status === 'LIVE') liveMatches.push(match);
    }

    for (const raw of allData.data ?? []) {
      const match = normalizeCricketMatch(raw);
      if (match.status === 'UPCOMING') upcomingMatches.push(match);
      else if (match.status === 'FINISHED') recentMatches.push(match);
    }

    await cache.set<Match[]>(CRICKET_CACHE_KEYS.live, liveMatches, 180);
    await cache.set<Match[]>(CRICKET_CACHE_KEYS.upcoming, upcomingMatches.slice(0, 20), 900);
    await cache.set<Match[]>(CRICKET_CACHE_KEYS.recent, recentMatches.slice(0, 20), 900);
    await cache.set<string>(CRICKET_CACHE_KEYS.lastUpdated, new Date().toISOString(), 3600);
  } catch (err) {
    console.error('[CricketPoller] Fetch failed:', err instanceof Error ? err.message : err);
  }
}

export function startCricketPoller(): void {
  void fetchAndCache();

  // Every 3 minutes (rate limit: ~100 req/day)
  cron.schedule('*/3 * * * *', () => void fetchAndCache());

  console.log('[CricketPoller] Started');
}
