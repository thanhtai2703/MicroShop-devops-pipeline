import { Link } from 'react-router-dom';
import { formatDate, money } from '../utils';
import { ArrowIcon } from './Icons';

export default function OrderCard({ order }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link className="order-card" to={`/orders/${order.id}`}>
      <div>
        <span className="eyebrow">Order #{order.id}</span>
        <h3>{formatDate(order.created_at)}</h3>
        <p>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>
      </div>
      <div className="order-card-total">
        <span className="status-pill">{order.status}</span>
        <strong>{money(order.total)}</strong>
        <ArrowIcon />
      </div>
    </Link>
  );
}

