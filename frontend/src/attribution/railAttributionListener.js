// Global Rail Attribution Listener
// Listens for ProductCard-dispatched `cart:add` CustomEvents and records
// associated rail Add-To-Cart + revenue metrics (Phase 1 Attribution Hardening).
// Idempotent initialization: safe to import multiple times (e.g., tests + app).

import { recordRailAtc } from "../utils/railsStore"";

let _installed = false;

function onCartAdd(ev) {
  try {
    const detail = ev && ev.detail ? ev.detail : {};
    const { railId, railSku, price } = detail;
    if (!railId) return; // Ignore non-rail ATCs.
    // Defensive: ensure we only record once per event object (avoid double listeners in HMR).
    if (ev.__railAttributionHandled) return;
    ev.__railAttributionHandled = true; // non-enumerable flag not needed.
    recordRailAtc(railId, railSku, Number(price) || 0);
  } catch (_) {
    // Swallow errors to avoid impacting cart UX.
  }
}

export function installRailAttributionListener() {
  if (_installed) return;
  _installed = true;
  try {
    window.addEventListener("cart:add", onCartAdd, { passive: true });
  } catch (_) {
    // Ignore if window not available (SSR / tests without JSDOM), caller may retry.
  }
}

// Auto-install when module loads (common pattern for lightweight global telemetry hooks)
try { installRailAttributionListener(); } catch (_) {}

export default installRailAttributionListener;
