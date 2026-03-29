import { Match } from '@scorecard/types';
import { FootballCard } from '../cards/FootballCard';
import { CricketCard } from '../cards/CricketCard';
import { EmptyState } from '../ui/EmptyState';

interface RecentSectionProps {
  matches: Match[];
}

export function RecentSection({ matches }: RecentSectionProps): JSX.Element {
  return (
    <section>
      <h2 className="font-semibold text-sm text-text-muted mb-3 flex items-center gap-2">
        <span>✅</span> Recent Results
      </h2>
      {matches.length === 0 ? (
        <EmptyState message="No recent results for your teams" icon="✅" />
      ) : (
        <div className="space-y-3">
          {matches.map((match, i) =>
            match.sport === 'football' ? (
              <FootballCard key={match.id} match={match} index={i} />
            ) : (
              <CricketCard key={match.id} match={match} index={i} />
            )
          )}
        </div>
      )}
    </section>
  );
}
