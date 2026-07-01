import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { money } from '../utils';
import CartLine from './CartLine';
import { ArrowIcon, CartIcon, CloseIcon } from './Icons';
import { LoadingBlock } from './States';

export default function CartDrawer({ open, onClose }) {
  const { isAuthenticated } = useAuth();
  const { cartCount, error, lines, loading, subtotal } = useCart();
  const location = useLocation();

  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        className="drawer-backdrop"
        type="button"
        onClick={onClose}
        aria-label="Close cart"
      />
      <aside className="cart-drawer" aria-label="Shopping cart">
        <div className="drawer-header">
          <h2>
            Your cart <span>({cartCount})</span>
          </h2>
          <button className="icon-button" onClick={onClose} type="button">
            <CloseIcon />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="drawer-empty">
            <span className="empty-cart-icon">
              <CartIcon size={26} />
            </span>
            <h3>Sign in to start a cart</h3>
            <p>Your cart follows your MicroShop account.</p>
            <Link className="button" to="/login">
              Log in
            </Link>
          </div>
        ) : loading ? (
          <LoadingBlock label="Opening your cart…" />
        ) : lines.length === 0 ? (
          <div className="drawer-empty">
            <span className="empty-cart-icon">
              <CartIcon size={26} />
            </span>
            <h3>Your cart is empty</h3>
            <p>Add something useful to get started.</p>
            <Link className="button" to="/">
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <div className="drawer-lines">
              {lines.map((line) => (
                <CartLine line={line} compact key={line.product_id} />
              ))}
            </div>
            <div className="drawer-summary">
              {error && <p className="form-error">{error}</p>}
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <p>Shipping and taxes are omitted in this development shop.</p>
              <Link className="button button-full" to="/checkout">
                Checkout <ArrowIcon />
              </Link>
              <Link className="text-link centered" to="/cart">
                View full cart
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

