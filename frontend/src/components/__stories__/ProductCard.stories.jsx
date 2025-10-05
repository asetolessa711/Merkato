// Tags: @thread:product-browse @thread:cart @thread:checkout (add-to-cart button present leads into checkout funnel)
import React from 'react';
import ProductCard from '../ProductCard'';

export default {
  title: 'Catalog/ProductCard',
  component: ProductCard,
};

const base = {
  _id: 'p1',
  name: 'Sample Product',
  price: 29.99,
  currency: 'USD',
  vendor: { name: 'Vendor One' },
  promotion: { isPromoted: true },
};

export const Promoted = () => <ProductCard product={base} onAddToCart={()=>{}} />;
export const Regular = () => <ProductCard product={{ ...base, promotion: null, name: 'Regular Product' }} onAddToCart={()=>{}} />;
