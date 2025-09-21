import React from "react";

function format(n, cur){ return new Intl.NumberFormat(undefined, { style:"currency", currency:cur }).format(n); }

export default function OrderSummary({
  lines = [],
  subtotal = 0,
  shipping = 0,
  tax = 0,
  discount = 0,
  currency = "USD",
  onCheckout,
  submitFormId,
  submitting = false,
  disabled = false,
  titleTestId,
  title = 'Order Summary'
}){
  const total = Math.max(0, subtotal + shipping + tax - discount);

  return (
    <aside className="os card card--p" data-testid="sidebar-order-summary">
      <h3 className="card-title" data-testid={titleTestId || undefined}>{title}</h3>
      <div className="os-table" role="table" aria-label="Order items">
        <div className="os-row os-row--head" role="row">
          <div className="os-col os-col--idx" role="columnheader">Qty</div>
          <div className="os-col os-col--desc" role="columnheader">Item</div>
          <div className="os-col os-col--unit" role="columnheader">Unit</div>
          <div className="os-col os-col--total" role="columnheader">Total</div>
        </div>

        {lines.map((l, i) => (
          <div className="os-row" role="row" key={l.sku||i}>
            <div className="os-col os-col--idx" role="cell">{l.qty}</div>
            <div className="os-col os-col--desc" role="cell">
              <div className="os-item">
                {l.image && <img src={l.image} alt="" className="os-thumb" />}
                <div className="os-text">
                  <div className="os-title">{l.title}</div>
                  {l.sku && <div className="os-meta">SKU: {l.sku}</div>}
                </div>
              </div>
            </div>
            <div className="os-col os-col--unit" role="cell">{format(l.unitPrice, currency)}</div>
            <div className="os-col os-col--total" role="cell">{format((l.qty||0)*(l.unitPrice||0), currency)}</div>
          </div>
        ))}
      </div>

      <div className="os-breakdown">
        <div className="os-rowp"><span>Subtotal</span><span>{format(subtotal, currency)}</span></div>
        <div className="os-rowp"><span>Shipping</span><span>{shipping ? format(shipping,currency) : "—"}</span></div>
        <div className="os-rowp"><span>Tax (est.)</span><span>{tax ? format(tax,currency) : "—"}</span></div>
        {discount>0 && <div className="os-rowp os-rowp--discount"><span>Discount</span><span>−{format(discount,currency)}</span></div>}
        <div className="os-rowp os-rowp--total"><span>Total</span><span>{format(total,currency)}</span></div>
      </div>

      <div className="os-cta">
        {submitFormId ? (
          <button className="btn btn-primary w-full" type="submit" form={submitFormId} disabled={disabled} aria-disabled={disabled} data-testid="submit-order-btn">
            {submitting ? 'Placing order…' : 'Place Order'}
          </button>
        ) : (
          <button className="btn btn-primary w-full" onClick={onCheckout} disabled={disabled} aria-disabled={disabled} data-testid="submit-order-btn">
            {submitting ? 'Placing order…' : 'Place Order'}
          </button>
        )}
        <div className="os-trust">
          <span>🔒 Secure checkout</span><span>↺ Free returns</span><span>⭐ Buyer protection</span>
        </div>
      </div>
    </aside>
  );
}
