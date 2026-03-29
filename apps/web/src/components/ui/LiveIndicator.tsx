export function LiveIndicator(): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-live animate-live-pulse" />
      <span className="text-live text-xs font-semibold uppercase tracking-wider">Live</span>
    </span>
  );
}
