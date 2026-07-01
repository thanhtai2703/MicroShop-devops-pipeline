import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { ErrorState, LoadingBlock } from '../components/States';
import { formatDate, money } from '../utils';

export default function OrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    apiRequest(`/orders/${id}`, { signal: controller.signal })
      .then(setOrder)
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
  }, [id, reloadKey]);

  if (loading && !order) {
    return <LoadingBlock label="Loading order…" />;
  }
  if (error && !order) {
    return (
      <div className="narrow-page">
        <ErrorState
          message={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      </div>
    );
  }
  if (!order) {
    return null;
  }

  return (
    <div className="page-width standard-page order-detail-page">
      {location.state?.justPlaced && (
        <div className="success-banner">
          <span>✓</span>
          <div>
            <strong>Order placed</strong>
            <p>The mock charge was approved and your cart was cleared.</p>
          </div>
        </div>
      )}

      <div className="order-detail-heading">
        <div>
          <span className="eyebrow">Order #{order.id}</span>
          <h1>{formatDate(order.created_at)}</h1>
          <p>Owned by user #{order.user_id}</p>
        </div>
        <span className="status-pill large">{order.status}</span>
      </div>

      <div className="order-detail-grid">
        <section className="order-items-card">
          <h2>Items</h2>
          {order.items.map((item) => (
            <div className="order-item" key={`${item.product_id}-${item.quantity}`}>
              <div>
                <strong>Product #{item.product_id}</strong>
                <span>Quantity {item.quantity}</span>
              </div>
              <div>
                <span>{money(item.price)} each</span>
                <strong>{money(Number(item.price) * item.quantity)}</strong>
              </div>
            </div>
          ))}
        </section>
        <aside className="summary-card">
          <span className="eyebrow">Paid total</span>
          <strong className="order-total">{money(order.total)}</strong>
          <p>
            Prices shown here are the snapshots captured during checkout.
          </p>
          <Link className="button button-full" to="/">
            Back to catalog
          </Link>
          <Link className="text-link centered" to="/orders">
            All orders
          </Link>
        </aside>
      </div>
    </div>
  );
}

