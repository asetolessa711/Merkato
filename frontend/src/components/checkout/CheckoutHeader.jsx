export default function CheckoutHeader({ country = "Ethiopia", step = 1 }) {
  return (
    <header className="co-head">
      <div className="co-head__inner">
        <a href="/" className="co-brand" aria-label="Merkato Home">
          <img src="/brand/merkato-logo.svg" alt="" onError={(e)=>{e.currentTarget.style.display='none'}} />
          <span className="co-brand__text">Merkato</span>
        </a>

        <div className="co-secure">🔒 Secure checkout</div>

        <div className="co-deliver">
          Deliver to <strong>{country}</strong>
        </div>
      </div>

      <nav className="co-steps" aria-label="Checkout steps">
        <ol>
          <li className={step>=1 ? "active" : ""} aria-current={step===1?"step":undefined}>
            <span className="num" aria-hidden>1</span>
            <span>Shipping</span>
          </li>
          <li className={step>=2 ? "active" : ""} aria-current={step===2?"step":undefined}>
            <span className="num" aria-hidden>2</span>
            <span>Payment</span>
          </li>
          <li className={step>=3 ? "active" : ""} aria-current={step===3?"step":undefined}>
            <span className="num" aria-hidden>3</span>
            <span>Review</span>
          </li>
        </ol>
        <div className="co-progress" aria-hidden>
          <div className="co-progress__bar" style={{ width: `${Math.min(100, Math.max(0, (step-1) * 50))}%` }} />
        </div>
      </nav>
    </header>
  );
}
