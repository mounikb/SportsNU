interface EmptyStateProps {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon = '📭' }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-text-muted">
      <span className="text-3xl mb-3">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}
