import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadCart, saveCart, clearCart as storageClearCart } from '../utils/cartStorage';

// useCart: simple cart manager backed by localStorage via cartStorage utils
// API:
// - items: [{ id|_id, name?, price?, quantity }]
// - total: number
// - add(item): push or increment quantity
// - inc(id): increment quantity
// - dec(id): decrement quantity (min 0; remove if reaches 0)
// - remove(id): remove line
// - clear(): empty cart
export default function useCart({ isAuthed = false } = {}) {
	const [items, setItems] = useState(() => {
		try { return (loadCart().items || []); } catch { return []; }
	});
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		// on mount, try to refresh from storage once
		try {
			const loaded = loadCart();
			if (loaded && Array.isArray(loaded.items)) setItems(loaded.items);
		} catch {}
		return () => { mounted.current = false; };
	}, []);

	const persist = useCallback((next) => {
		try { saveCart(next, isAuthed); } catch (e) { /* quota or JSON errors ignored intentionally */ }
	}, [isAuthed]);

	const add = useCallback((item) => {
		setItems((prev) => {
			const key = item._id || item.id;
			const idx = prev.findIndex((p) => (p._id || p.id) === key);
			let next;
			if (idx >= 0) {
				next = prev.map((p, i) => i === idx ? { ...p, quantity: (p.quantity || 1) + (item.quantity || 1) } : p);
			} else {
				next = [...prev, { ...item, quantity: item.quantity || 1 }];
			}
			// persist side-effect
			persist(next);
			return next;
		});
	}, [persist]);

	const inc = useCallback((id) => {
		setItems((prev) => {
			const next = prev.map((p) => (p._id || p.id) === id ? { ...p, quantity: (p.quantity || 1) + 1 } : p);
			persist(next);
			return next;
		});
	}, [persist]);

	const dec = useCallback((id) => {
		setItems((prev) => {
			const next = prev
				.map((p) => (p._id || p.id) === id ? { ...p, quantity: Math.max(0, (p.quantity || 1) - 1) } : p)
				.filter((p) => (p.quantity || 0) > 0); // drop if reaches 0
			persist(next);
			return next;
		});
	}, [persist]);

	const remove = useCallback((id) => {
		setItems((prev) => {
			const next = prev.filter((p) => (p._id || p.id) !== id);
			persist(next);
			return next;
		});
	}, [persist]);

	const clear = useCallback(() => {
		setItems([]);
		try { storageClearCart(); } catch {}
	}, []);

	const total = useMemo(() => items.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.quantity || 1), 0), [items]);

	return { items, total, add, inc, dec, remove, clear };
}
