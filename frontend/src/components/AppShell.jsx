import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../auth';
import { useCart } from '../cart';
import CartDrawer from './CartDrawer';
import { CartIcon, SearchIcon } from './Icons';

function HeaderSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = new URLSearchParams(location.search).get('search') || '';
  const [query, setQuery] = useState(location.pathname === '/' ? current : '');

  useEffect(() => {
    if (location.pathname === '/') {
      setQuery(current);
    }
  }, [current, location.pathname]);

  function submit(event) {
    event.preventDefault();
    const params =
      location.pathname === '/'
        ? new URLSearchParams(location.search)
        : new URLSearchParams();

    if (query.trim()) {
      params.set('search', query.trim());
    } else {
      params.delete('search');
    }
    navigate(`/?${params.toString()}`);
  }

  function clearSearch() {
    setQuery('');
    if (location.pathname === '/') {
      const params = new URLSearchParams(location.search);
      params.delete('search');
      navigate(`/?${params.toString()}`);
    }
  }

  return (
    <form className="header-search" onSubmit={submit}>
      <SearchIcon />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search useful things…"
        aria-label="Search products"
      />
      {query && (
        <button
          className="search-clear"
          type="button"
          onClick={clearSearch}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </form>
  );
}

export default function AppShell() {
  const { isAuthenticated, logout, user } = useAuth();
  const { cartCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <span />
            </span>
            <span>MicroShop</span>
          </Link>

          <HeaderSearch />

          <nav className="header-actions" aria-label="Main navigation">
            {!isAuthenticated ? (
              <>
                <NavLink className="nav-link" to="/login">
                  Log in
                </NavLink>
                <NavLink className="button register-button" to="/register">
                  Register
                </NavLink>
              </>
            ) : (
              <details className="account-menu">
                <summary>
                  <span className="avatar">
                    {(user?.name || user?.email || 'M')[0].toUpperCase()}
                  </span>
                  <span className="account-name">{user?.name || 'Account'}</span>
                </summary>
                <div className="account-popover">
                  <div className="account-identity">
                    <strong>{user?.name || 'MicroShop member'}</strong>
                    <span>{user?.email}</span>
                  </div>
                  <Link to="/profile">Profile</Link>
                  <Link to="/orders">Order history</Link>
                  <button type="button" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              </details>
            )}

            <button
              className="cart-button"
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Cart with ${cartCount} items`}
            >
              <CartIcon />
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div>
          <Link className="brand footer-brand" to="/">
            MicroShop
          </Link>
          <span>A little shop for people who make things work.</span>
        </div>
        <span>Development edition · 2026</span>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
