import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Team } from '@scorecard/types';
import api from '../lib/api';
import { useTeamStore } from '../store/teamStore';

export function TeamPicker(): JSX.Element {
  const navigate = useNavigate();
  const { followedTeams, addTeam, removeTeam } = useTeamStore();
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<'all' | 'football' | 'cricket'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ teams: Team[] }>('/teams')
      .then(({ data }) => setAllTeams(data.teams))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = allTeams.filter((t) => {
    const matchesSport = sportFilter === 'all' || t.sport === sportFilter;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchesSport && matchesSearch;
  });

  const isFollowing = (id: string): boolean => followedTeams.some(t => t.id === id);

  async function toggleTeam(team: Team): Promise<void> {
    if (isFollowing(team.id)) {
      await api.delete(`/teams/follow/${team.id}`);
      removeTeam(team.id);
    } else {
      await api.post('/teams/follow', { teamId: team.id });
      addTeam(team);
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-text mb-1">Pick Your Teams</h1>
        <p className="text-text-muted text-sm mb-6">Follow at least 1 team to get started.</p>

        <input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-card-border rounded-card px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent mb-4"
        />

        <div className="flex gap-2 mb-6">
          {(['all', 'football', 'cricket'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                sportFilter === s ? 'bg-accent text-bg' : 'bg-card text-text-muted border border-card-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-text-muted text-sm text-center py-8">Loading teams...</p>
        ) : (
          <div className="space-y-2 mb-8">
            {filtered.map((team) => (
              <div
                key={team.id}
                onClick={() => void toggleTeam(team)}
                className={`flex items-center justify-between p-3.5 rounded-card border cursor-pointer transition-all ${
                  isFollowing(team.id)
                    ? 'bg-accent/10 border-accent/40'
                    : 'bg-card border-card-border hover:border-accent/30'
                }`}
              >
                <div>
                  <p className="font-medium text-sm text-text">{team.name}</p>
                  <p className="text-xs text-text-muted capitalize">{team.sport}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isFollowing(team.id) ? 'bg-accent border-accent' : 'border-card-border'
                }`}>
                  {isFollowing(team.id) && (
                    <svg className="w-3 h-3 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          disabled={followedTeams.length === 0}
          className="w-full bg-accent text-bg font-semibold py-3 rounded-card disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          Done {followedTeams.length > 0 && `(${followedTeams.length} selected)`}
        </button>
      </div>
    </div>
  );
}
