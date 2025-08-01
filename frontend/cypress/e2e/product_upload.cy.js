// Product Upload (Vendor)
describe('Vendor Product Upload', () => {
  it('should allow a vendor to upload a new product', () => {
    cy.login('vendor');
    cy.visit('/vendor/products');
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('input[name="name"]').type('Test Product');
    cy.get('input[name="price"]').type('99.99');
    cy.get('input[name="stock"]').type('10');
    cy.get('input[type="file"]').attachFile('test-image.jpg');
    cy.get('button[type="submit"]').click();
    cy.contains('Test Product').should('exist');
  });

  it('should show error when required fields are missing', () => {
    cy.login('vendor');
    cy.visit('/vendor/products');
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('button[type="submit"]').click();
    cy.contains('required').should('exist'); // Adjust error text as needed
  });

  it('should show error for invalid image file', () => {
    cy.login('vendor');
    cy.visit('/vendor/products');
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('input[name="name"]').type('Invalid Image Product');
    cy.get('input[name="price"]').type('10');
    cy.get('input[name="stock"]').type('5');
    cy.get('input[type="file"]').attachFile('test-invalid.txt');
    cy.get('button[type="submit"]').click();
    cy.contains('invalid image').should('exist'); // Adjust error text as needed
  });

  it('should show image preview after selecting a file', () => {
    cy.login('vendor');
    cy.visit('/vendor/products');
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('input[type="file"]').attachFile('test-image.jpg');
    cy.get('[data-testid="image-preview"]').should('be.visible');
  });

  it('should show success message after product upload', () => {
    cy.login('vendor');
    cy.visit('/vendor/products');
    cy.get('[data-testid="add-product-btn"]').click();
    cy.get('input[name="name"]').type('Success Product');
    cy.get('input[name="price"]').type('20');
    cy.get('input[name="stock"]').type('15');
    cy.get('input[type="file"]').attachFile('test-image.jpg');
    cy.get('button[type="submit"]').click();
    cy.contains('Product uploaded successfully').should('exist'); // Adjust success text as needed
  });
});
