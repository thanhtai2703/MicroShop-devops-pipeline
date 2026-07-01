export function LoadingGrid({ count = 8 }) {
  return (
    <div className="product-grid" aria-label="Loading products">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-image shimmer" />
          <div className="skeleton-content">
            <span className="skeleton-line short" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line" />
            <span className="skeleton-button" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="loading-block" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card state-error">
      <div className="state-icon">!</div>
      <h2>Something went sideways</h2>
      <p>{message || 'The service is unavailable right now.'}</p>
      {onRetry && (
        <button className="button button-danger" onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state-card state-empty">
      <div className="state-icon">○</div>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}

