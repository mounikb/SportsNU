import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Team } from '@scorecard/types';
import api from '../lib/api';
import { useTeamStore } from '../store/teamStore';
import { useAuthStore } from '../store/authStore';

export function Settings(): JSX.Element {
  const navigate = useNavigate();
  const { followedTeams, setFollowedTeams, removeTeam, addTeam } = useTeamStore();
  const logout = useAuthStore((s) => s.logout);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.get<{ teams: Team[] }>('/teams/mine')
      .then(({ data }) => setFollowedTeams(data.teams))
      .catch(console.error);

    api.get<{ teams: Team[] }>('/teams')
      .then(({ data }) => setAllTeams(data.teams))
      .catch(console.error);
  }, [setFollowedTeams]);

  async function handleUnfollow(teamId: string): Promise<void> {
    await api.delete(`/teams/follow/${teamId}`);
    removeTeam(teamId);
  }

  async function handleFollow(team: Team): Promise<void> {
    await api.post('/teams/follow', { teamId: team.id });
    addTeam(team);
  }

  function handleLogout(): void {
    logout();
    navigate('/');
  }

  const isFollowing = (id: string): boolean => followedTeams.some(t => t.id === id);

  const searchResults = allTeams.filter(
    t => !isFollowing(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-card-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-text-muted hover:text-text">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-bold text-lg">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-text-muted mb-3">Your Teams</h2>
          {followedTeams.length === 0 ? (
            <p className="text-text-muted text-sm">No teams followed yet.</p>
          ) : (
            <div className="space-y-2">
              {followedTeams.map((team) => (
                <div key={team.id} className="flex items-center justify-between bg-card border border-card-border rounded-card px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-xs text-text-muted capitalize">{team.sport}</p>
                  </div>
                  <button
                    onClick={() => void handleUnfollow(team.id)}
                    className="text-text-muted hover:text-live text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-accent text-sm font-medium"
          >
            + Add more teams
          </button>

          {showAdd && (
            <div className="mt-3 space-y-3">
              <input
                type="text"
                placeholder="Search teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card border border-card-border rounded-card px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <div className="space-y-2">
                {searchResults.slice(0, 8).map((team) => (
                  <div
                    key={team.id}
                    onClick={() => void handleFollow(team)}
                    className="flex items-center justify-between bg-card border border-card-border rounded-card px-4 py-3 cursor-pointer hover:border-accent/40 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{team.name}</p>
                      <p className="text-xs text-text-muted capitalize">{team.sport}</p>
                    </div>
                    <span className="text-accent text-xs">+ Follow</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <button
            onClick={handleLogout}
            className="text-sm text-text-muted hover:text-live transition-colors"
          >
            Sign out
          </button>
        </section>
      </main>
    </div>
  );
}
