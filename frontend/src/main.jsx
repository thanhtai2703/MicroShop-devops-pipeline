import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';
import { AuthProvider } from './auth';
import { CartProvider } from './cart';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import CartPage from './pages/CartPage';
import CatalogPage from './pages/CatalogPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrdersPage from './pages/OrdersPage';
import ProductPage from './pages/ProductPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import { ToastProvider } from './toast';
import './styles.css';

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<CatalogPage />} />
                <Route path="products/:id" element={<ProductPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route
                  path="cart"
                  element={
                    <Protected>
                      <CartPage />
                    </Protected>
                  }
                />
                <Route
                  path="checkout"
                  element={
                    <Protected>
                      <CheckoutPage />
                    </Protected>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <Protected>
                      <OrdersPage />
                    </Protected>
                  }
                />
                <Route
                  path="orders/:id"
                  element={
                    <Protected>
                      <OrderDetailPage />
                    </Protected>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <Protected>
                      <ProfilePage />
                    </Protected>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

