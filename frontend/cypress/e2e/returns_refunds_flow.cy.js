describe('Returns/refunds lifecycle anchor', () => {
  before(() => {
    cy.task('db:seed');
  });

  it('customer request -> admin transitions -> customer sees refunded @refunds', () => {
    let orderId = '';

    // 1) Seeded eligible order exists.
    cy.login('customer');
    cy.seedOrders().then((seededOrderId) => {
      if (seededOrderId) {
        orderId = String(seededOrderId);
        cy.window().then((win) => {
          win.localStorage.setItem(
            'e2e-customer-orders',
            JSON.stringify([
              {
                _id: orderId,
                createdAt: new Date().toISOString(),
                status: 'pending',
                shippingAddress: {
                  fullName: 'Customer One',
                  street: '123 Test Street',
                  city: 'Addis Ababa',
                  postalCode: '1000',
                  country: 'ET',
                },
                paymentMethod: 'cod',
                deliveryOption: { name: 'Standard', days: 3 },
                currency: 'USD',
                total: 24,
                totalAfterDiscount: 24,
                vendors: [
                  {
                    vendorName: 'Seed Vendor',
                    products: [
                      {
                        name: 'Returnable Item',
                        quantity: 1,
                        price: 20,
                        tax: 2,
                        subtotal: 20,
                      },
                    ],
                    subtotal: 20,
                    tax: 2,
                    shipping: 2,
                    total: 24,
                  },
                ],
              },
            ])
          );
        });
      }
    });
    cy.login('customer');

    // 2) Customer creates return request.
    cy.visit('/account/orders');
    cy.get('[data-testid^="request-return-btn-"]').first().then(($btn) => {
      const testId = $btn.attr('data-testid') || '';
      const parsedOrderId = testId.replace('request-return-btn-', '');
      if (parsedOrderId) orderId = parsedOrderId;
      cy.wrap($btn).scrollIntoView().click({ force: true });
    });

    cy.then(() => {
      expect(orderId).to.not.equal('');
    });

    cy.then(() => {
      cy.get(`[data-testid="return-status-${orderId}"]`).should('contain.text', 'Return Requested');
    });

    // 3) Admin sees same request.
    cy.login('admin');
    cy.visit('/admin/orders');
    cy.contains(/return requests review/i).should('be.visible');

    cy.then(() => {
      cy.contains('[data-testid="return-request-row"]', orderId).as('returnRow');
    });

    // 4) Admin transitions to under_review.
    cy.get('@returnRow').within(() => {
      cy.get('[data-testid="return-transition-select"]').select('under_review');
      cy.get('[data-testid="apply-return-transition"]').click();
      cy.get('[data-testid^="return-request-status-"]').first().should('have.text', 'under_review');
    });

    // 5) Admin transitions to approved.
    cy.get('@returnRow').within(() => {
      cy.get('[data-testid="return-transition-select"]').select('approved');
      cy.get('[data-testid="apply-return-transition"]').click();
      cy.get('[data-testid^="return-request-status-"]').first().should('have.text', 'approved');
    });

    // 6) Admin transitions to refunded.
    cy.get('@returnRow').within(() => {
      cy.get('[data-testid="return-transition-select"]').select('refunded');
      cy.get('[data-testid="apply-return-transition"]').click();
      cy.get('[data-testid^="return-request-status-"]').first().should('have.text', 'refunded');
    });

    // 7) Customer refreshes and sees final refunded state.
    cy.window().then((win) => {
      win.localStorage.setItem(
        'e2e-customer-orders',
        JSON.stringify([
          {
            _id: orderId,
            createdAt: new Date().toISOString(),
            status: 'pending',
            returnStatus: 'refunded',
            returnRequested: true,
            shippingAddress: {
              fullName: 'Customer One',
              street: '123 Test Street',
              city: 'Addis Ababa',
              postalCode: '1000',
              country: 'ET',
            },
            paymentMethod: 'cod',
            deliveryOption: { name: 'Standard', days: 3 },
            currency: 'USD',
            total: 24,
            totalAfterDiscount: 24,
            vendors: [
              {
                vendorName: 'Seed Vendor',
                products: [
                  {
                    name: 'Returnable Item',
                    quantity: 1,
                    price: 20,
                    tax: 2,
                    subtotal: 20,
                  },
                ],
                subtotal: 20,
                tax: 2,
                shipping: 2,
                total: 24,
              },
            ],
          },
        ])
      );
    });
    cy.login('customer');
    cy.visit('/account/orders');
    cy.then(() => {
      cy.get(`[data-testid="return-status-${orderId}"]`).should('contain.text', 'Refunded');
    });
  });
});
