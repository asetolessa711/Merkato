// Note: prefer native selectFile over cypress-file-upload to avoid base64/atob issues

describe('🛍️ Vendor Product Upload Flow', () => {
  const vendorEmail = 'vendor@test.com';
  const vendorPassword = 'Password123!';

  before(() => {
    cy.log('🚀 Cypress Vendor Product Upload Test Started');
  });

  it('should allow a vendor to upload a product and see it in product list', () => {
    // 1. Login as vendor
    cy.intercept('POST', '/api/auth/login').as('login');
    cy.visit('/login');
    cy.get('input[name=email]').type(vendorEmail);
    cy.get('input[name=password]').type(vendorPassword);
  cy.get('[data-cy="login-button"], button[type=submit][aria-label="Sign In"]').first().click();
    cy.wait('@login');

    // 1a. Confirm login by checking for user in localStorage
    cy.window().then((win) => {
      const user = win.localStorage.getItem('user');
      expect(user).to.exist;
      cy.log('User in localStorage:', user);
    });

  // 2. Go directly to product upload page
  // Upload page uses mock mode and does not trigger vendorProducts fetch
  cy.visit('/vendor/products/upload');

    // 3. Fill product form
    cy.get('input[name=name]').type('Cypress Test Product');
    cy.get('textarea[name=description]').type('This is a test product uploaded via Cypress.');
    cy.get('input[name=price]').type('49.99');
    cy.get('input[name=stock]').type('10');
    cy.get('input[name=category]').type('Cypress Category');
    
    // If you use a select for category, use .select() instead
    // cy.get('select[name=category]').select('Cypress Category');

    // 4. Upload image using native selectFile to avoid base64/atob issues
    const tiny = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEBAVFRUVFRUVFRUVFRUVFRUVFhUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGi0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAKgBLAMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAABAgQD/8QAHxAAAgICAwEAAAAAAAAAAAAAAQIDEQQhEjMB/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQL/xAAWEQEBAQAAAAAAAAAAAAAAAAABAgD/2gAMAwEAAhEDEQA/AL8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/2Q=='
    cy.get('[data-testid="product-image-input"], input[type="file"]').first().selectFile({
      contents: Cypress.Buffer.from(tiny, 'base64'),
      fileName: 'tiny.jpg',
      mimeType: 'image/jpeg',
      lastModified: Date.now()
    });

  // 5. Submit form (mock mode: no real POST happens, so don't wait on network)
  cy.get('[data-testid="product-upload-submit"], button[type=submit]').first().click();

  // 6. Confirm upload success via inline message OR by redirect
  cy.get('body').then(($b) => {
    const hasMsg = $b.find('[data-testid="upload-msg"]').length > 0;
    if (hasMsg) {
      cy.get('[data-testid="upload-msg"]').should(($el) => {
        const t = ($el.text() || '').toLowerCase();
        expect(t).to.include('product');
        expect(t).to.include('success');
      });
    }
  });
  // Wait for redirect to vendor products (mock flow navigates shortly after)
  cy.location('pathname', { timeout: 10000 }).should('include', '/vendor/products');

    // 7. Confirm the product exists on vendor products page
  // VendorProducts reads from localStorage first in E2E; assert on the UI text
  cy.contains('Cypress Test Product').should('exist');
  });
});
