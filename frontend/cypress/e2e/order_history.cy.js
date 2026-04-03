// Tags: @thread:order-history
describe('📜 Order History', () => {
  it('navigates to account orders view', () => {
    cy.login('customer');
    cy.window().then((win) => {
      win.localStorage.setItem('e2e-customer-orders', JSON.stringify([
        {
          _id: 'order-history-1',
          status: 'pending',
          vendors: [
            {
              products: [
                { name: 'Order History Item', quantity: 1 }
              ]
            }
          ]
        }
      ]));
    });
    cy.visit('/account/orders');
    cy.contains(/orders|order history/i).should('exist');
  });
});
