import React from "react";

const CartCtx = React.createContext(null);
const LS_KEY = "cart:v1";

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { items: [], updatedAt: Date.now() };
    const data = JSON.parse(raw);
    if (!Array.isArray(data.items)) return { items: [], updatedAt: Date.now() };
    return { items: data.items, updatedAt: data.updatedAt ?? Date.now() };
  } catch {
    return { items: [], updatedAt: Date.now() };
  }
}

function save(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

export function CartProvider({ children }) {
  const [state, setState] = React.useState(() => load());

  // cross-tab sync
  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEY && e.newValue) {
        try {
          const next = JSON.parse(e.newValue);
          setState((prev) => (next.updatedAt > prev.updatedAt ? next : prev));
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const totalQty = React.useMemo(() => state.items.reduce((n, it) => n + (it.qty || 0), 0), [state.items]);
  const distinctCount = state.items.length;
  const subtotal = React.useMemo(() => state.items.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0), [state.items]);

  const add = (item, qty = 1) => {
    setState((prev) => {
      const idx = prev.items.findIndex((it) => it.sku === item.sku);
      const items = [...prev.items];
      if (idx >= 0) items[idx] = { ...items[idx], qty: (items[idx].qty || 0) + qty };
      else items.push({ ...item, qty: Math.max(1, qty) });
      const next = { items, updatedAt: Date.now() };
      save(next);
      return next;
    });
  };

  const setQty = (sku, qty) => {
    setState((prev) => {
      const items = prev.items
        .map((it) => (it.sku === sku ? { ...it, qty: Math.max(0, qty) } : it))
        .filter((it) => (it.qty || 0) > 0);
      const next = { items, updatedAt: Date.now() };
      save(next);
      return next;
    });
  };

  const remove = (sku) => setQty(sku, 0);
  const clear = () => { const next = { items: [], updatedAt: Date.now() }; save(next); setState(next); };

  const value = { ...state, add, setQty, remove, clear, totalQty, distinctCount, subtotal };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
