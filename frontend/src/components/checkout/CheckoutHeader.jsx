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
          <li className={step>=1 ? "active" : ""}>Shipping</li>
          <li className={step>=2 ? "active" : ""}>Payment</li>
          <li className={step>=3 ? "active" : ""}>Review</li>
        </ol>
      </nav>
    </header>
  );
}
