import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import { ArrowIcon } from '../components/Icons';
import ProductVisual from '../components/ProductVisual';
import QuantityControl from '../components/QuantityControl';
import { ErrorState, LoadingBlock } from '../components/States';
import { useToast } from '../toast';
import { money, titleCase } from '../utils';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { isAuthenticated } = useAuth();
  const { addProduct, busyProductId } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiRequest(`/products/${id}`, { signal: controller.signal })
      .then(setProduct)
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

  async function addToCart() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    try {
      await addProduct(product, quantity);
      showToast(`${quantity} × ${product.name} added to your cart`);
    } catch (requestError) {
      showToast(requestError.message, 'error');
    }
  }

  if (loading) {
    return <LoadingBlock label="Finding that product…" />;
  }
  if (error || !product) {
    return (
      <div className="narrow-page">
        <ErrorState
          message={error || 'Product not found'}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      </div>
    );
  }

  const soldOut = product.stock <= 0;
  const pending = busyProductId === product.id;

  return (
    <div className="detail-page page-width">
      <div className="breadcrumbs">
        <Link to="/">Catalog</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>
      <div className="product-detail-grid">
        <ProductVisual product={product} />
        <div className="product-detail-copy">
          <span className="eyebrow">{titleCase(product.category)}</span>
          <h1>{product.name}</h1>
          <strong className="detail-price">{money(product.price)}</strong>
          <p className="detail-description">{product.description}</p>
          <div className={`inventory-note ${soldOut ? 'is-sold-out' : ''}`}>
            <span />
            {soldOut
              ? 'Currently unavailable'
              : `${product.stock} ready to ship`}
          </div>

          {!soldOut && (
            <div className="detail-purchase">
              <QuantityControl
                value={quantity}
                onDecrease={() => setQuantity((value) => Math.max(1, value - 1))}
                onIncrease={() =>
                  setQuantity((value) => Math.min(product.stock, value + 1))
                }
                disableIncrease={quantity >= product.stock}
              />
              <button
                className="button button-large"
                type="button"
                disabled={pending}
                onClick={addToCart}
              >
                {pending ? 'Adding…' : 'Add to cart'} <ArrowIcon />
              </button>
            </div>
          )}

          <div className="detail-notes">
            <div>
              <strong>Development edition</strong>
              <span>Simple enough to inspect, real enough to deploy.</span>
            </div>
            <div>
              <strong>Service-backed</strong>
              <span>Stock and pricing come directly from product-service.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

