import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import CheckoutHeader from "../components/checkout/CheckoutHeader.jsx";
import CheckoutFooter from "../components/checkout/CheckoutFooter.jsx";

export default function CartPage() {
  const { items, setQty, remove, clear, subtotal, totalQty, distinctCount } = useCart();
  const nav = useNavigate();

  // optional “free shipping at $50” example
  const FREE_AT = 50;
  const progress = Math.min(100, Math.round((subtotal / FREE_AT) * 100));
  const remaining = Math.max(0, FREE_AT - subtotal);

  const EmptyState = (
    <main className="container" style={{ padding: "24px 16px" }}>
      <h1 className="h2">Your Cart</h1>
      <div className="card card--p" style={{ maxWidth: 560 }}>
        <p className="text-muted">Your cart is empty.</p>
        <Link to="/shop" className="btn btn-primary" style={{ marginTop: 8 }}>Start shopping</Link>
      </div>
    </main>
  );

  const FilledState = (
    <main className="container" style={{ padding: "24px 16px" }}>
      <h1 className="h2">Your Cart</h1>

      <div className="cart-grid">
        {/* LEFT: line items */}
        <section className="cart-items card card--p">
          {/* Free shipping note / progress */}
          <div className="freebar">
            {remaining > 0 ? (
              <span>Spend <strong>${remaining.toFixed(2)}</strong> more to get <strong>free shipping</strong>.</span>
            ) : (
              <span>🎉 You unlocked <strong>free shipping</strong>!</span>
            )}
            <div className="freebar__track"><div className="freebar__fill" style={{ width: `${progress}%` }} /></div>
          </div>

          {/* header (desktop) */}
          <div className="line line--head">
            <div className="line__main">Product</div>
            <div className="line__qty">Qty</div>
            <div className="line__price">Price</div>
            <div className="line__total">Total</div>
            <div className="line__rmv"> </div>
          </div>

          {items.map((it) => {
            const lineTotal = it.qty * it.price;
            return (
              <div key={it.sku} className="line">
                <div className="line__main">
                  {it.image && (<img className="line__img" src={it.image} alt="" />)}
                  <div className="line__info">
                    <div className="line__title">{it.title}</div>
                    <div className="line__meta">SKU: {it.sku}</div>
                    {/* mobile price inline */}
                    <div className="line__price--m">${it.price.toFixed(2)}</div>
                  </div>
                </div>

                <div className="line__qty">
                  <div className="qty">
                    <button aria-label="Decrease quantity" className="qty__btn" onClick={() => setQty(it.sku, Math.max(1, it.qty - 1))}>−</button>
                    <input
                      aria-label="Quantity"
                      className="qty__input"
                      value={it.qty}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        v === 0 ? remove(it.sku) : setQty(it.sku, v);
                      }}
                    />
                    <button aria-label="Increase quantity" className="qty__btn" onClick={() => setQty(it.sku, it.qty + 1)}>＋</button>
                  </div>
                </div>

                <div className="line__price">${it.price.toFixed(2)}</div>
                <div className="line__total">${lineTotal.toFixed(2)}</div>

                <div className="line__rmv">
                  <button className="btn btn-ghost" onClick={() => remove(it.sku)}>Remove</button>
                </div>
              </div>
            );
          })}

          <div className="cart-actions">
            <button className="btn btn-ghost" onClick={clear}>Clear cart</button>
            <Link to="/shop" className="btn btn-ghost">Continue shopping</Link>
          </div>
        </section>

        {/* RIGHT: summary / checkout */}
        <aside className="cart-summary card card--p">
          <h3 className="card-title">Order Summary</h3>

          <div className="sumrow"><span>Items</span><span>{totalQty}</span></div>
          <div className="sumrow"><span>Distinct products</span><span>{distinctCount}</span></div>
          <div className="sumrow"><span>Subtotal</span><span className="sumrow__val">${subtotal.toFixed(2)}</span></div>

          {/* Coupon (optional stub) */}
          <div className="coupon">
            <input className="input coupon__input" placeholder="Promo code" aria-label="Promo code"/>
            <button className="btn btn-ghost coupon__btn">Apply</button>
          </div>

          <p className="text-muted text-sm">Taxes and shipping calculated at checkout.</p>

          <button
            className="btn btn-primary w-full"
            data-testid="checkout-btn"
            onClick={() => nav("/checkout")}
            style={{ marginTop: 8 }}
          >
            Checkout
          </button>

          {/* trust row */}
          <div className="trust">
            <span>🔒 Secure checkout</span>
            <span>↺ Free returns</span>
            <span>⭐ Buyer protection</span>
          </div>
        </aside>
      </div>
    </main>
  );

  const country = (() => { try { return localStorage.getItem('merkato-region') || 'Ethiopia'; } catch { return 'Ethiopia'; } })();

  return (
    <>
      <CheckoutHeader country={country} step={0} />
      {items.length ? FilledState : EmptyState}
      <CheckoutFooter />
    </>
  );
}
