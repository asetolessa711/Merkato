// Navigate to product detail and add to cart
describe('📄 Product Detail Add to Cart', () => {
  const productName = 'Cypress Test Product';

  it('adds from product detail and shows in cart', () => {
    cy.task('db:seed');
    const API = Cypress.env('API_URL') || 'http://localhost:5000';
    cy.request('GET', `${API.replace(/\/$/, '')}/api/products`).then((res) => {
      const prod = (res.body || []).find(p => (p.name || '').toLowerCase() === productName.toLowerCase());
      expect(prod, `find ${productName} in /api/products`).to.exist;
      cy.visit(`/product/${prod._id}`);
      cy.get('[data-testid="add-to-cart-btn"]').click({ force: true });
      cy.get('[data-testid="cart-link"]').click();
      cy.contains('Your Cart').should('be.visible');
      cy.contains(productName).should('be.visible');
    });
  });
});
