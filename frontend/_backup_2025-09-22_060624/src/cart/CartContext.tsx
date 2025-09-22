import React from "react";

export type CartItem = { sku: string; title: string; price: number; qty: number; image?: string };
type CartState = { items: CartItem[]; updatedAt: number };
type CartContextType = CartState & {
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  totalQty: number;          // sum of quantities
  distinctCount: number;     // number of lines
  subtotal: number;
};

const CartCtx = React.createContext<CartContextType | null>(null);
const LS_KEY = "cart:v1";

function load(): CartState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { items: [], updatedAt: Date.now() };
    const data = JSON.parse(raw);
    if (!Array.isArray(data.items)) return { items: [], updatedAt: Date.now() };
    return { items: data.items, updatedAt: data.updatedAt ?? Date.now() };
  } catch { return { items: [], updatedAt: Date.now() }; }
}

function save(state: CartState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  catch { /* ignore */ }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<CartState>(() => load());

  // cross-tab sync
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue) {
        try {
          const next = JSON.parse(e.newValue);
          setState((prev) => (next.updatedAt > prev.updatedAt ? next : prev));
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // derived values
  const totalQty = React.useMemo(() => state.items.reduce((n, it) => n + (it.qty || 0), 0), [state.items]);
  const distinctCount = state.items.length;
  const subtotal = React.useMemo(() => state.items.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0), [state.items]);

  const add = (item: Omit<CartItem, "qty">, qty = 1) => {
    setState((prev) => {
      const idx = prev.items.findIndex((it) => it.sku === item.sku);
      const items = [...prev.items];
      if (idx >= 0) items[idx] = { ...items[idx], qty: (items[idx].qty || 0) + qty };
      else items.push({ ...item, qty: Math.max(1, qty) });
      const next = { items, updatedAt: Date.now() };
      save(next); return next;
    });
  };

  const setQty = (sku: string, qty: number) => {
    setState((prev) => {
      const items = prev.items
        .map((it) => (it.sku === sku ? { ...it, qty: Math.max(0, qty) } : it))
        .filter((it) => (it.qty || 0) > 0);
      const next = { items, updatedAt: Date.now() };
      save(next); return next;
    });
  };

  const remove = (sku: string) => setQty(sku, 0);
  const clear = () => { const next = { items: [], updatedAt: Date.now() }; save(next); setState(next); };

  const value: CartContextType = { ...state, add, setQty, remove, clear, totalQty, distinctCount, subtotal };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
