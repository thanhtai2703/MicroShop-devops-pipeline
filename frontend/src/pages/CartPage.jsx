import { Link } from 'react-router-dom';
import { useCart } from '../cart';
import CartLine from '../components/CartLine';
import { ArrowIcon } from '../components/Icons';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';
import { money } from '../utils';

export default function CartPage() {
  const { error, lines, loading, refreshCart, subtotal } = useCart();

  if (loading) {
    return <LoadingBlock label="Loading your cart…" />;
  }

  return (
    <div className="page-width standard-page">
      <div className="page-heading">
        <span className="eyebrow">Your selection</span>
        <h1>Shopping cart</h1>
        <p>Quantities are saved to Redis as soon as you change them.</p>
      </div>

      {error && lines.length === 0 ? (
        <ErrorState message={error} onRetry={refreshCart} />
      ) : lines.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          message="The catalog is right there, looking useful."
          action={
            <Link className="button" to="/">
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="cart-page-grid">
          <div className="cart-page-lines">
            {error && <p className="form-error">{error}</p>}
            {lines.map((line) => (
              <CartLine line={line} key={line.product_id} />
            ))}
          </div>
          <aside className="summary-card sticky-card">
            <span className="eyebrow">Order summary</span>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="summary-row muted">
              <span>Shipping</span>
              <span>Not modeled</span>
            </div>
            <div className="summary-row muted">
              <span>Tax</span>
              <span>Not modeled</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <Link className="button button-full" to="/checkout">
              Continue to checkout <ArrowIcon />
            </Link>
            <Link className="text-link centered" to="/">
              Keep browsing
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

