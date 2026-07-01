import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import ProductCard from '../components/ProductCard';
import { EmptyState, ErrorState, LoadingGrid } from '../components/States';
import { titleCase } from '../utils';

const CATEGORIES = [
  'all',
  'clothing',
  'home',
  'stationery',
  'electronics',
  'accessories',
];

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (search) {
      query.set('search', search);
    }
    if (category !== 'all') {
      query.set('category', category);
    }

    setLoading(true);
    setError('');
    apiRequest(`/products${query.size ? `?${query}` : ''}`, {
      signal: controller.signal,
    })
      .then((data) => setProducts(data.items || []))
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
  }, [category, reloadKey, search]);

  function chooseCategory(nextCategory) {
    const next = new URLSearchParams(searchParams);
    if (nextCategory === 'all') {
      next.delete('category');
    } else {
      next.set('category', nextCategory);
    }
    setSearchParams(next);
  }

  function clearFilters() {
    setSearchParams({});
  }

  return (
    <>
      <section className="hero page-width">
        <div className="hero-copy">
          <span className="eyebrow">Built for curious operators</span>
          <h1>Useful things for people who ship software.</h1>
          <p>
            A deliberately small shop for learning deliberately big systems.
            Browse the catalog, make a cart, and send one tiny order through the
            whole stack.
          </p>
          <div className="hero-pills">
            <span>SMALL-BATCH CATALOG</span>
            <span>MOCK PAYMENTS</span>
            <span>VERY REAL PIPELINES</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="hero-grid" />
          <span className="hero-disc" />
          <span className="hero-cube">MS</span>
          <span className="hero-label">development goods · 2026</span>
        </div>
      </section>

      <section className="catalog-heading page-width">
        <div>
          <span className="eyebrow">The catalog</span>
          <h2>{search ? `Results for “${search}”` : 'Shop all products'}</h2>
        </div>
        <span className="catalog-count">
          {loading
            ? 'Loading…'
            : `${products.length} ${products.length === 1 ? 'product' : 'products'}`}
        </span>
      </section>

      <section className="category-bar page-width" aria-label="Categories">
        {CATEGORIES.map((item) => (
          <button
            className={item === category ? 'active' : ''}
            key={item}
            type="button"
            onClick={() => chooseCategory(item)}
          >
            {titleCase(item)}
          </button>
        ))}
      </section>

      <section className="catalog-results page-width">
        {loading ? (
          <LoadingGrid />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        ) : products.length === 0 ? (
          <EmptyState
            title="Nothing on this shelf"
            message="No products match those filters. Try another search or clear everything."
            action={
              <button className="button" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

