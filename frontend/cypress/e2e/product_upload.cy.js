// Product Upload (Vendor)
describe('Vendor Product Upload', () => {
  it('should allow a vendor to upload a new product', () => {
    cy.login('vendor');
    cy.intercept('GET', '/api/vendor/products*').as('vendorProducts');
    cy.visit('/vendor/products');
    cy.wait('@vendorProducts');
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('input[name="name"]').type('Test Product');
    cy.get('input[name="price"]').type('99.99');
    cy.get('input[name="stock"]').type('10');
    cy.fixture('test-image.jpg', 'base64').then(fileContent => {
      cy.get('input[type="file"]').attachFile({ fileContent, fileName: 'test-image.jpg', mimeType: 'image/jpeg', encoding: 'base64' });
    });
    cy.get('button[type="submit"]').click();
  // In mock upload mode, no POST is fired; assert success message then redirect back to products list
  cy.get('[data-testid="upload-msg"]').should('contain', 'Product uploaded successfully');
  cy.url({ timeout: 8000 }).should('include', '/vendor/products');
  cy.contains('Test Product').should('exist');
  });

  it('should show error when required fields are missing', () => {
    cy.login('vendor');
    cy.intercept('GET', '/api/vendor/products*').as('vendorProducts');
    cy.visit('/vendor/products');
    cy.wait('@vendorProducts');
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('button[type="submit"]').click();
  cy.contains('required').should('exist');
  });

  it('should show error for invalid image file', () => {
    cy.login('vendor');
    cy.intercept('GET', '/api/vendor/products*').as('vendorProducts');
    cy.visit('/vendor/products');
    cy.wait('@vendorProducts');
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('input[name="name"]').type('Invalid Image Product');
    cy.get('input[name="price"]').type('10');
    cy.get('input[name="stock"]').type('5');
    cy.fixture('test-invalid.txt', 'base64').then(fileContent => {
      cy.get('input[type="file"]').attachFile({ fileContent, fileName: 'test-invalid.txt', mimeType: 'text/plain', encoding: 'base64' });
    });
    cy.get('button[type="submit"]').click();
    cy.contains('invalid image').should('exist'); // Adjust error text as needed
  });

  it('should show image preview after selecting a file', () => {
    cy.login('vendor');
    cy.intercept('GET', '/api/vendor/products*').as('vendorProducts');
    cy.visit('/vendor/products');
    cy.wait('@vendorProducts');
    cy.get('[data-testid="add-product-btn"]').click();
    cy.fixture('test-image.jpg', 'base64').then(fileContent => {
      cy.get('input[type="file"]').attachFile({ fileContent, fileName: 'test-image.jpg', mimeType: 'image/jpeg', encoding: 'base64' });
    });
    cy.get('[data-testid="image-preview"]').should('be.visible');
  });

  it('should show success message after product upload', () => {
    cy.login('vendor');
    cy.visit('/vendor/products');
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('input[name="name"]').type('Success Product');
    cy.get('input[name="price"]').type('20');
    cy.get('input[name="stock"]').type('15');
    cy.fixture('test-image.jpg', 'base64').then(fileContent => {
      cy.get('input[type="file"]').attachFile({ fileContent, fileName: 'test-image.jpg', mimeType: 'image/jpeg', encoding: 'base64' });
    });
    cy.get('button[type="submit"]').click();
    cy.get('[data-testid="upload-msg"]').should('contain', 'Product uploaded successfully');
  });
});
