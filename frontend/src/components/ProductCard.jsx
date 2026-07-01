import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { useToast } from '../toast';
import { money, titleCase } from '../utils';
import ProductVisual from './ProductVisual';

export default function ProductCard({ product }) {
  const { isAuthenticated } = useAuth();
  const { addProduct, busyProductId } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [added, setAdded] = useState(false);
  const pending = busyProductId === product.id;
  const soldOut = product.stock <= 0;

  async function handleAdd() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    try {
      await addProduct(product);
      setAdded(true);
      showToast(`${product.name} added to your cart`);
      setTimeout(() => setAdded(false), 1200);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-image-link">
        <ProductVisual product={product} />
        <span className="product-tag">{titleCase(product.category)}</span>
        {soldOut && <span className="stock-badge sold-out">Sold out</span>}
        {!soldOut && product.stock <= 8 && (
          <span className="stock-badge low-stock">Only {product.stock} left</span>
        )}
      </Link>
      <div className="product-card-content">
        <Link to={`/products/${product.id}`} className="product-title">
          {product.name}
        </Link>
        <p>{product.description}</p>
        <div className="product-card-footer">
          <strong>{money(product.price)}</strong>
          <button
            className="button button-small"
            type="button"
            onClick={handleAdd}
            disabled={soldOut || pending}
          >
            {soldOut ? 'Unavailable' : pending ? 'Adding…' : added ? 'Added' : '+ Add'}
          </button>
        </div>
      </div>
    </article>
  );
}

