import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiRequest } from './api';
import { useAuth } from './auth';

const EMPTY_CART = { items: [], total_items: 0 };
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { token } = useAuth();
  const [cart, setCart] = useState(EMPTY_CART);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyProductId, setBusyProductId] = useState(null);
  const [error, setError] = useState('');

  const applyCart = useCallback(async (nextCart) => {
    const safeCart = nextCart || EMPTY_CART;
    const hydrated = await Promise.all(
      (safeCart.items || []).map(async (item) => {
        try {
          const product = await apiRequest(`/products/${item.product_id}`);
          return { ...item, product, unavailable: false };
        } catch {
          return {
            ...item,
            product: {
              id: item.product_id,
              name: `Product #${item.product_id}`,
              price: 0,
              stock: 0,
              category: 'unavailable',
            },
            unavailable: true,
          };
        }
      }),
    );

    setCart(safeCart);
    setLines(hydrated);
    return hydrated;
  }, []);

  const refreshCart = useCallback(async () => {
    if (!token) {
      setCart(EMPTY_CART);
      setLines([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const nextCart = await apiRequest('/cart');
      await applyCart(nextCart);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [applyCart, token]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const setQuantity = useCallback(
    async (productId, quantity) => {
      setBusyProductId(productId);
      setError('');
      try {
        const nextCart = await apiRequest('/cart/items', {
          method: 'POST',
          body: { product_id: productId, quantity },
        });
        await applyCart(nextCart);
      } catch (requestError) {
        setError(requestError.message);
        throw requestError;
      } finally {
        setBusyProductId(null);
      }
    },
    [applyCart],
  );

  const addProduct = useCallback(
    async (product, quantity = 1) => {
      const existing =
        cart.items.find((item) => item.product_id === product.id)?.quantity || 0;
      const nextQuantity = Math.min(existing + quantity, product.stock);
      await setQuantity(product.id, Math.max(nextQuantity, 1));
    },
    [cart.items, setQuantity],
  );

  const removeItem = useCallback(
    async (productId) => {
      setBusyProductId(productId);
      setError('');
      try {
        await apiRequest(`/cart/items/${productId}`, { method: 'DELETE' });
        await refreshCart();
      } catch (requestError) {
        setError(requestError.message);
        throw requestError;
      } finally {
        setBusyProductId(null);
      }
    },
    [refreshCart],
  );

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + Number(line.product.price) * line.quantity,
        0,
      ),
    [lines],
  );

  const value = useMemo(
    () => ({
      addProduct,
      busyProductId,
      cartCount: cart.total_items || 0,
      error,
      lines,
      loading,
      refreshCart,
      removeItem,
      setQuantity,
      subtotal,
    }),
    [
      addProduct,
      busyProductId,
      cart.total_items,
      error,
      lines,
      loading,
      refreshCart,
      removeItem,
      setQuantity,
      subtotal,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
}

