import React from 'react';

const paths = {
  overview: 'M3 12l7-9 7 9v9H3v-9z',
  performance: 'M4 14h3V10H4v4zm5 0h3V6H9v8zm5 0h3V8h-3v6z',
  storefront: 'M3 8l2-3h14l2 3v10H3V8zm4 0v10m10-10v10',
  trust: 'M12 3l6 3v5c0 3.866-2.239 7.164-6 8-3.761-.836-6-4.134-6-8V6l6-3z',
  products: 'M4 7h16v10H4V7zm0-3h16v3H4V4z',
  add: 'M12 5v14M5 12h14',
  drafts: 'M5 5h10l4 4v10H5V5zm10 0v4h4',
  reviews: 'M4 5h16v10H7l-3 3V5z',
  orders: 'M4 7h16v10H4V7zm0-3h16v3H4V4z',
  fulfillment: 'M4 9h16M4 13h16M4 17h16',
  returns: 'M12 5v4l3-3M12 19v-4l-3 3',
  business: 'M4 20h16V8L12 4 4 8v12z',
  bank: 'M3 9l9-5 9 5v2H3V9zm0 3h18v8H3v-8z',
  verification: 'M20 7l-9 9-5-5',
  upload: 'M12 16V6m0 0l-4 4m4-4l4 4M4 20h16',
  bulk: 'M4 6h16v4H4V6zm0 6h16v6H4v-6z',
  media: 'M4 6h16v12H4V6zm3 3l4 4 3-3 4 5',
  video: 'M5 6h10v12H5V6zm10 3l4-2v10l-4-2V9z',
  analytics: 'M4 18h16M6 18V8m6 10V6m6 12V12',
  productPerf: 'M4 18h16M6 18V10m6 8V8m6 10V6',
  customers: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H5z',
  payouts: 'M4 12h16M8 8h8m-8 8h8',
  invoices: 'M6 4h12v16H6V4zm0 4h12',
  tax: 'M7 7l10 10M17 7L7 17',
  help: 'M12 18h.01M9 9a3 3 0 116 0c0 2-3 2-3 4',
  contact: 'M4 6h16v12H4V6zm2 2l6 4 6-4',
  policy: 'M6 4h12v14l-6 2-6-2V4z',
};

export default function Icon({ name, size = 15, color = 'currentColor', strokeWidth = 1.7 }) {
  const d = paths[name];
  if (!d) return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
  // heuristic: fill if it looks like a solid path, else stroke
  const useStroke = ['verification','customers','returns','analytics','productPerf','help'].includes(name);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {useStroke ? (
        <path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d={d} fill={color} />
      )}
    </svg>
  );
}
