import { create } from 'zustand';
import { Match } from '@scorecard/types';

type SportFilter = 'all' | 'football' | 'cricket';

interface MatchState {
  liveMatches: Match[];
  upcomingMatches: Match[];
  recentMatches: Match[];
  sportFilter: SportFilter;
  stale: boolean;
  lastUpdated: string | null;
  setLiveMatches: (matches: Match[], meta?: { stale: boolean; lastUpdated: string }) => void;
  setUpcomingMatches: (matches: Match[], meta?: { stale: boolean; lastUpdated: string }) => void;
  setRecentMatches: (matches: Match[], meta?: { stale: boolean; lastUpdated: string }) => void;
  setSportFilter: (filter: SportFilter) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  liveMatches: [],
  upcomingMatches: [],
  recentMatches: [],
  sportFilter: 'all',
  stale: false,
  lastUpdated: null,
  setLiveMatches: (matches, meta) =>
    set({ liveMatches: matches, stale: meta?.stale ?? false, lastUpdated: meta?.lastUpdated ?? null }),
  setUpcomingMatches: (matches) => set({ upcomingMatches: matches }),
  setRecentMatches: (matches) => set({ recentMatches: matches }),
  setSportFilter: (filter) => set({ sportFilter: filter }),
}));
