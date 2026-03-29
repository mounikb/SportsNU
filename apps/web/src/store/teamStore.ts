import { create } from 'zustand';
import { Team } from '@scorecard/types';

interface TeamState {
  followedTeams: Team[];
  setFollowedTeams: (teams: Team[]) => void;
  addTeam: (team: Team) => void;
  removeTeam: (teamId: string) => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  followedTeams: [],
  setFollowedTeams: (teams) => set({ followedTeams: teams }),
  addTeam: (team) =>
    set((state) => ({
      followedTeams: state.followedTeams.find(t => t.id === team.id)
        ? state.followedTeams
        : [...state.followedTeams, team],
    })),
  removeTeam: (teamId) =>
    set((state) => ({
      followedTeams: state.followedTeams.filter(t => t.id !== teamId),
    })),
}));
