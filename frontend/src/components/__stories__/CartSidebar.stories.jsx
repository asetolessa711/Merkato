// Tags: @thread:cart @thread:checkout
import React, { useState } from 'react';
import CartSidebar from '../CartSidebar'';

export default {
  title: 'Cart/CartSidebar',
  component: CartSidebar,
};

const sampleItems = [
  { id: '1', name: 'Story Product 1', quantity: 2, price: 15 },
  { id: '2', name: 'Story Product 2', quantity: 1, price: 25 },
];

export const OpenWithItems = () => {
  const [open, setOpen] = useState(true);
  return <CartSidebar isOpen={open} items={sampleItems} onClose={() => setOpen(false)} onRemove={()=>{}} />;
};

export const Empty = () => {
  const [open, setOpen] = useState(true);
  return <CartSidebar isOpen={open} items={[]} onClose={() => setOpen(false)} />;
};
