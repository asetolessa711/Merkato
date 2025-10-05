// Robust currency utilities: operate in integer minor units (cents) to avoid float drift.
// Defaults to USD if not specified.

// Convert a numeric price (possibly float) in major units to integer cents safely
export function toCents(value) {
	if (value == null || isNaN(Number(value))) return 0;
	// Round to nearest cent to avoid 1.005 -> 100.499... issues
	return Math.round(Number(value) * 100);
}

// Compute discounted cents given base cents and percentage (0..100)
export function applyDiscountCents(baseCents, percent) {
	const p = Number(percent) || 0;
	if (p <= 0) return baseCents;
	if (p >= 100) return 0;
	return Math.round(baseCents * (1 - p / 100));
}

// Format integer cents as currency string
export function formatCurrency(cents, currency = 'USD', locale = 'en-US') {
	const amount = (Number(cents) || 0) / 100;
	try {
		return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
	} catch (_) {
		// Fallback basic formatting
		return `${currency} ${amount.toFixed(2)}`;
	}
}

// Convert between currencies using provided rates map of base -> USD factor or relative mapping.
// rates example: { USD: 1, ETB: 144, EUR: 0.91 }
// Interpreted as: 1 USD -> ETB 144, 1 USD -> EUR 0.91
export function convertCents(cents, from = 'USD', to = 'USD', rates = { USD: 1 }) {
	if (from === to) return cents;
	const usdPerFrom = 1 / (rates[from] || 1); // from -> USD
	const toPerUSD = rates[to] || 1; // USD -> to
	const majorFrom = (Number(cents) || 0) / 100;
	const majorTo = majorFrom * usdPerFrom * toPerUSD;
	return toCents(majorTo);
}

export default { toCents, applyDiscountCents, formatCurrency, convertCents };

