const request = require('supertest');
const app = require('../app'); // Adjust if needed

// Uncomment and configure if using direct DB operations
// const { ProductModel } = require('../models');

/**
 * Creates a new product for testing.
 * @param {Object} product - Product fields (name, price, category, etc.)
 * @param {Object} [options]
 * @param {boolean} [options.useDb=false] - Set to true for direct DB seeding.
 * @param {string} [options.token] - Optional Bearer token for authenticated API access.
 * @returns {Promise<Object>} Created product data (e.g., with `_id`).
 */
async function seedProduct(product = {}, { useDb = false, token } = {}) {
  const defaultProduct = {
    name: 'Test Product',
    price: 0,
    category: 'Test Category'
  };
  const productData = { ...defaultProduct, ...product };

  if (useDb) {
    // Optional: Uncomment and implement direct DB seeding
    // const created = await ProductModel.create(productData);
    // return created.toJSON ? created.toJSON() : created;
    throw new Error('Direct DB seeding not implemented — configure ProductModel.');
  } else {
    // API-based product creation
    let req = request(app).post('/api/products').send(productData);
    if (token) req = req.set('Authorization', token);
    const res = await req;

    if (![200, 201].includes(res.statusCode)) {
      throw new Error(`❌ Failed to seed product: ${res.statusCode} — ${res.text}`);
    }

    return res.body;
  }
}

/**
 * Deletes a test product.
 * @param {string} productId
 * @param {Object} [options]
 * @param {boolean} [options.useDb=false] - Use direct DB deletion if true.
 * @param {string} [options.token] - Optional Bearer token for authenticated API deletion.
 * @returns {Promise<boolean>} True if deleted; false otherwise.
 */
async function deleteProduct(productId, { useDb = false, token } = {}) {
  if (!productId) return false;

  if (useDb) {
    // Optional: Uncomment and implement direct DB deletion
    // const result = await ProductModel.destroy({ where: { id: productId } });
    // return !!result;
    throw new Error('Direct DB deletion not implemented — configure ProductModel.');
  } else {
    let req = request(app).delete(`/api/products/${productId}`);
    if (token) req = req.set('Authorization', token);
    const res = await req;

    if (![200, 204].includes(res.statusCode)) {
      console.warn(`⚠️ Failed to delete product ${productId} — Status: ${res.statusCode}`);
      return false;
    }

    return true;
  }
}

module.exports = {
  seedProduct,
  deleteProduct
};