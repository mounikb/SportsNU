import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';
import { usePolling } from '../hooks/usePolling';
import { SportTabs } from '../components/ui/SportTabs';
import { LiveSection } from '../components/sections/LiveSection';
import { UpcomingSection } from '../components/sections/UpcomingSection';
import { RecentSection } from '../components/sections/RecentSection';
import { Match } from '@scorecard/types';
import api from '../lib/api';

interface MatchResponse {
  matches: Match[];
  stale: boolean;
  lastUpdated: string;
}

export function Dashboard(): JSX.Element {
  const navigate = useNavigate();
  const {
    liveMatches, upcomingMatches, recentMatches,
    sportFilter, stale, lastUpdated,
    setLiveMatches, setUpcomingMatches, setRecentMatches,
  } = useMatchStore();

  usePolling(async () => {
    const { data } = await api.get<MatchResponse>('/matches/live');
    setLiveMatches(data.matches, { stale: data.stale, lastUpdated: data.lastUpdated });
  }, 30_000);

  usePolling(async () => {
    const { data } = await api.get<MatchResponse>('/matches/upcoming');
    setUpcomingMatches(data.matches);
  }, 5 * 60_000);

  usePolling(async () => {
    const { data } = await api.get<MatchResponse>('/matches/recent');
    setRecentMatches(data.matches);
  }, 10 * 60_000);

  function filterBySport(matches: Match[]): Match[] {
    if (sportFilter === 'all') return matches;
    return matches.filter(m => m.sport === sportFilter);
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-card-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">
            Score<span className="text-accent">card</span>
          </h1>
          <div className="flex items-center gap-3">
            <SportTabs />
            <button
              onClick={() => navigate('/settings')}
              className="text-text-muted hover:text-text transition-colors"
              aria-label="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {stale && lastUpdated && (
        <div className="bg-card border-b border-card-border px-4 py-2 text-center">
          <p className="text-xs text-text-muted">
            Last updated {new Date(lastUpdated).toLocaleTimeString()} — data may be stale
          </p>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <LiveSection matches={filterBySport(liveMatches)} />
        <UpcomingSection matches={filterBySport(upcomingMatches)} />
        <RecentSection matches={filterBySport(recentMatches)} />
      </main>
    </div>
  );
}
