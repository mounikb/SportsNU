import { Match } from '@scorecard/types';
import { FootballCard } from '../cards/FootballCard';
import { CricketCard } from '../cards/CricketCard';
import { LiveIndicator } from '../ui/LiveIndicator';

interface LiveSectionProps {
  matches: Match[];
}

export function LiveSection({ matches }: LiveSectionProps): JSX.Element | null {
  if (matches.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <LiveIndicator />
        <span className="font-semibold text-sm text-text-muted">Live Now</span>
      </div>
      <div className="space-y-3">
        {matches.map((match, i) =>
          match.sport === 'football' ? (
            <FootballCard key={match.id} match={match} index={i} />
          ) : (
            <CricketCard key={match.id} match={match} index={i} />
          )
        )}
      </div>
    </section>
  );
}
