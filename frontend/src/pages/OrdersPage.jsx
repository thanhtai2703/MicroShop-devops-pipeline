import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import OrderCard from '../components/OrderCard';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiRequest('/orders', { signal: controller.signal })
      .then((data) => setOrders(data.items || []))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [reloadKey]);

  if (loading) {
    return <LoadingBlock label="Loading order history…" />;
  }

  return (
    <div className="page-width standard-page narrow-content">
      <div className="page-heading">
        <span className="eyebrow">Recorded in PostgreSQL</span>
        <h1>Order history</h1>
        <p>Newest orders appear first.</p>
      </div>
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          message="Your first checkout will appear here."
          action={
            <Link className="button" to="/">
              Visit the catalog
            </Link>
          }
        />
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <OrderCard order={order} key={order.id} />
          ))}
        </div>
      )}
    </div>
  );
}

