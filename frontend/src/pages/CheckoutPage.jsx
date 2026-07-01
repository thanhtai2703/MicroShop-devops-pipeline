import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { useCart } from '../cart';
import { ArrowIcon } from '../components/Icons';
import { EmptyState, LoadingBlock } from '../components/States';
import { money } from '../utils';

export default function CheckoutPage() {
  const { lines, loading, refreshCart, subtotal } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function placeOrder() {
    setSubmitting(true);
    setError('');
    try {
      const order = await apiRequest('/orders/checkout', { method: 'POST' });
      await refreshCart();
      navigate(`/orders/${order.id}`, {
        replace: true,
        state: { justPlaced: true, order },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingBlock label="Preparing checkout…" />;
  }

  return (
    <div className="page-width standard-page">
      <div className="page-heading">
        <span className="eyebrow">Final review</span>
        <h1>Checkout</h1>
        <p>Totals are recalculated by order-service before payment.</p>
      </div>

      {lines.length === 0 ? (
        <EmptyState
          title="Nothing to check out"
          message="Add a product before asking the services to do their dance."
          action={
            <Link className="button" to="/">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="checkout-grid">
          <section className="checkout-review">
            <h2>Your items</h2>
            {lines.map((line) => (
              <div className="checkout-line" key={line.product_id}>
                <div>
                  <strong>{line.product.name}</strong>
                  <span>
                    {line.quantity} × {money(line.product.price)}
                  </span>
                </div>
                <strong>
                  {money(Number(line.product.price) * line.quantity)}
                </strong>
              </div>
            ))}
          </section>

          <aside className="summary-card sticky-card">
            <span className="eyebrow">Mock payment</span>
            <h2>No card required</h2>
            <p>
              payment-service approves this request unless its deliberate
              decline flag is enabled.
            </p>
            <div className="mock-card" aria-hidden="true">
              <span>MICRO / TEST</span>
              <strong>•••• •••• •••• 0000</strong>
              <small>NOT A REAL PAYMENT METHOD</small>
            </div>
            <div className="summary-total">
              <span>Charge total</span>
              <strong>{money(subtotal)}</strong>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button
              className="button button-full"
              type="button"
              disabled={submitting}
              onClick={placeOrder}
            >
              {submitting ? 'Processing…' : 'Place order'}
              {!submitting && <ArrowIcon />}
            </button>
            <Link className="text-link centered" to="/cart">
              Return to cart
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

