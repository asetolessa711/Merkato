import 'cypress-file-upload';

describe('🛍️ Vendor Product Upload Flow', () => {
  const vendorEmail = 'vendor@test.com';
  const vendorPassword = 'Password123!';

  before(() => {
    cy.log('🚀 Cypress Vendor Product Upload Test Started');
  });

  it('should allow a vendor to upload a product and see it in product list', () => {
    // 1. Login as vendor
    cy.visit('/login');
    cy.get('input[name=email]').type(vendorEmail);
    cy.get('input[name=password]').type(vendorPassword);
    cy.get('button[type=submit]').click();

    // 1a. Confirm login by checking for user in localStorage
    cy.window().then((win) => {
      const user = win.localStorage.getItem('user');
      expect(user).to.exist;
      cy.log('User in localStorage:', user);
    });

    // 2. Go directly to product upload page (Check URL)
    cy.visit('/vendor/products/upload'); // Update URL if necessary

    // 3. Fill product form
    cy.get('input[name=name]').type('Cypress Test Product');
    cy.get('textarea[name=description]').type('This is a test product uploaded via Cypress.');
    cy.get('input[name=price]').type('49.99');
    cy.get('input[name=stock]').type('10');
    cy.get('input[name=category]').type('Cypress Category');
    
    // If you use a select for category, use .select() instead
    // cy.get('select[name=category]').select('Cypress Category');

    // 4. Upload image (Check if fixture file exists)
    cy.fixture('test-product.jpg', 'base64').then(fileContent => {
      cy.get('[data-testid="product-image-input"]').attachFile({
        fileContent,
        fileName: 'test-product.jpg',
        mimeType: 'image/jpeg',
        encoding: 'base64'
      });
    });

    // 5. Submit form
    cy.get('button[type=submit]').click();

    // 6. Confirm upload success and check vendor product list
  cy.get('[data-testid="upload-msg"]').should('contain', 'Product').and('contain', 'successfully');

    // 7. Visit vendor products page to confirm the product exists
    cy.visit('/vendor/products');
    cy.contains('Cypress Test Product').should('exist');
  });
});
