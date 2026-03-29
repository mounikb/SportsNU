import { CricketMatch } from '@scorecard/types';
import { LiveIndicator } from '../ui/LiveIndicator';

interface CricketCardProps {
  match: CricketMatch;
  index?: number;
}

export function CricketCard({ match, index = 0 }: CricketCardProps): JSX.Element {
  const delay = `${index * 60}ms`;

  return (
    <div
      className="bg-card border border-card-border rounded-card p-4 animate-card-in hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{match.competition}</span>
          <span className="text-xs bg-card-border text-text-muted px-1.5 py-0.5 rounded">
            {match.format}
          </span>
        </div>
        {match.status === 'LIVE' ? (
          <LiveIndicator />
        ) : match.status === 'UPCOMING' ? (
          <span className="text-xs text-text-muted">
            {new Date(match.startTime).toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <span className="text-xs text-text-muted">Result</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="font-semibold text-sm">{match.homeTeam.shortName}</p>
        <span className="text-text-muted text-sm">vs</span>
        <p className="font-semibold text-sm">{match.awayTeam.shortName}</p>
      </div>

      {match.status !== 'UPCOMING' && (
        <div className="mt-2 space-y-1">
          {match.innings.map((inning, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-xs text-text-muted">{inning.team}</span>
              <span className={`text-sm font-semibold tabular-nums ${
                match.status === 'LIVE' && i === match.currentInnings ? 'text-accent' : 'text-text'
              }`}>
                {inning.runs}/{inning.wickets}
                <span className="text-xs text-text-muted ml-1">({inning.overs} ov)</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {match.summary && (
        <p className="text-xs text-text-muted mt-2 line-clamp-1">{match.summary}</p>
      )}
    </div>
  );
}
