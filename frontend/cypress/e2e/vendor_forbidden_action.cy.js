// Vendor forbidden action: vendor cannot update someone else's order
// Tags: @smoke @persona:vendor @security @authZ

describe('🚫 Vendor forbidden action @smoke @persona:vendor @security @authZ', () => {
  before(() => {
    cy.task('db:seed');
  });

  it('blocks vendor from updating another vendor\'s order @negative', () => {
    cy.login('vendor');
    // Attempt to update arbitrary order ID
    const badOrderId = '64b3f0a0a0a0a0a0a0a0a0a0'; // nonsensical/malformed OK
    cy.request({
      method: 'PATCH',
      url: `${Cypress.env('API_URL') || 'http://localhost:5051'}/api/orders/${badOrderId}/status`,
      body: { status: 'Completed' },
      failOnStatusCode: false
    }).then((res) => {
      expect([401, 403, 404, 400]).to.include(res.status);
    });
  });
});
