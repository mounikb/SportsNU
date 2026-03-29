import { FootballMatch } from '@scorecard/types';
import { LiveIndicator } from '../ui/LiveIndicator';

interface FootballCardProps {
  match: FootballMatch;
  index?: number;
}

export function FootballCard({ match, index = 0 }: FootballCardProps): JSX.Element {
  const delay = `${index * 60}ms`;

  return (
    <div
      className="bg-card border border-card-border rounded-card p-4 animate-card-in hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">{match.competition}</span>
        {match.status === 'LIVE' ? (
          <LiveIndicator />
        ) : match.status === 'UPCOMING' ? (
          <span className="text-xs text-text-muted">
            {new Date(match.startTime).toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="text-xs text-text-muted">FT</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-right">
          <p className="font-semibold text-sm truncate">{match.homeTeam.shortName}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {match.status === 'UPCOMING' ? (
            <span className="text-text-muted text-sm font-medium">vs</span>
          ) : (
            <span className={`text-lg font-bold tabular-nums ${match.status === 'LIVE' ? 'text-accent' : 'text-text'}`}>
              {match.score.home} – {match.score.away}
            </span>
          )}
          {match.status === 'LIVE' && match.minute && (
            <span className="text-xs text-live font-medium">{match.minute}&apos;</span>
          )}
        </div>

        <div className="flex-1 text-left">
          <p className="font-semibold text-sm truncate">{match.awayTeam.shortName}</p>
        </div>
      </div>
    </div>
  );
}
