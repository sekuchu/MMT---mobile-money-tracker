interface EmptyStateProps {
  title: string;
  text?: string;
  children?: React.ReactNode;
}

export function EmptyState({ title, text, children }: EmptyStateProps) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {text ? <p className="empty-text">{text}</p> : null}
      {children}
    </div>
  );
}
