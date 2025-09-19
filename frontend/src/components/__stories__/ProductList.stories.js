// Tags: @thread:product-browse @thread:search
import React from 'react';
import ShopPage from '../../pages/ShopPage';

export default {
  title: 'Catalog/ProductList',
  component: ShopPage,
  parameters: { layout: 'fullscreen' }
};

export const Default = () => <ShopPage />;
