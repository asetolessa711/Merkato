import React from 'react';
import ProductCard from './ProductCard';

/**
 * Reusable horizontally scrollable product row section with title.
 * @param {string} title - Section title
 * @param {Array} products - Array of product objects
 * @param {string} [type] - Card type (optional)
 * @param {string} [size] - Card size (optional)
 * @param {string} [emptyText] - Text to show if no products
 */
function ProductRowSection({ title, products, type = 'standard', size = 'md', emptyText }) {
  return (
    <section className="best-sellers">
      <div className="section-header">
        <h2>{title}</h2>
      </div>
      <div className="products-row-scroll">
        {products && products.length > 0 ? (
          products.map(product => (
            <ProductCard
              key={product._id}
              product={product}
              type={type}
              size={size}
              colorOptions={product.colors || []}
            />
          ))
        ) : (
          <p style={{ padding: '16px', color: '#888' }}>{emptyText || 'No products to display.'}</p>
        )}
      </div>
    </section>
  );
}

export default ProductRowSection;
