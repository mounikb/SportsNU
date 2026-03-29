import { useMatchStore } from '../../store/matchStore';

type Tab = 'all' | 'football' | 'cricket';

const TABS: { label: string; value: Tab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Football', value: 'football' },
  { label: 'Cricket', value: 'cricket' },
];

export function SportTabs(): JSX.Element {
  const { sportFilter, setSportFilter } = useMatchStore();

  return (
    <div className="flex gap-1 bg-card rounded-full p-1 border border-card-border">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setSportFilter(tab.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            sportFilter === tab.value
              ? 'bg-accent text-bg'
              : 'text-text-muted hover:text-text'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
