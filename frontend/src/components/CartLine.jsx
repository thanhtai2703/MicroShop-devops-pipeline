import { useCart } from '../cart';
import { money } from '../utils';
import ProductVisual from './ProductVisual';
import QuantityControl from './QuantityControl';
import { TrashIcon } from './Icons';

export default function CartLine({ line, compact = false }) {
  const { busyProductId, removeItem, setQuantity } = useCart();
  const pending = busyProductId === line.product_id;
  const maxed = line.quantity >= line.product.stock;

  function swallow(promise) {
    promise.catch(() => {});
  }

  return (
    <div className={`cart-line ${compact ? 'cart-line-compact' : ''}`}>
      <ProductVisual product={line.product} compact />
      <div className="cart-line-body">
        <div className="cart-line-heading">
          <div>
            <strong>{line.product.name}</strong>
            <span>{money(line.product.price)} each</span>
          </div>
          <button
            className="icon-button danger-link"
            type="button"
            aria-label={`Remove ${line.product.name}`}
            disabled={pending}
            onClick={() => swallow(removeItem(line.product_id))}
          >
            <TrashIcon />
          </button>
        </div>
        {line.unavailable && (
          <small className="inline-warning">
            Product details are currently unavailable.
          </small>
        )}
        <div className="cart-line-actions">
          <QuantityControl
            value={line.quantity}
            disabled={pending || line.unavailable}
            disableIncrease={maxed}
            onDecrease={() =>
              swallow(setQuantity(line.product_id, line.quantity - 1))
            }
            onIncrease={() =>
              swallow(setQuantity(line.product_id, line.quantity + 1))
            }
          />
          <strong>{money(Number(line.product.price) * line.quantity)}</strong>
        </div>
      </div>
    </div>
  );
}

