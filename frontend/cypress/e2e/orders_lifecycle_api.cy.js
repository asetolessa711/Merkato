// @orders @api
// API-level validations to mirror backend order lifecycle rules.
// Validates:
//  - Vendor cannot ship before global order is paid
//  - Buyer-only pay; double-pay blocked; cancelled order cannot be paid
//  - Invalid global transition (delivered -> pending) is rejected

const API = Cypress.env('API_URL') || 'http://localhost:5051';

// Helper to make an authenticated API request using the token in localStorage
const authedRequest = (method, path, body) => {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem('token');
    return cy.request({
      method,
      url: `${API}${path}`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
      failOnStatusCode: false,
    });
  });
};

describe('@orders @api Orders lifecycle guards', () => {
  it('returns 403 when vendor tries to set admin-only statuses (paid/cancelled)', () => {
    let orderId;
    cy.login('vendor');
    cy.seedOrders().then((id) => {
      orderId = id;
      expect(orderId).to.be.a('string');
    })
    .then(() => {
      cy.login('vendor');
      return authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'paid' });
    })
    .then((res) => {
      expect(res.status).to.eq(403);
      cy.login('vendor');
      return authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'cancelled' });
    })
    .then((res) => {
      expect(res.status).to.eq(403);
    });
  });
  it('blocks vendor shipping before paid, then allows ship->deliver after paid', () => {
    // Keep the same orderId for all steps
    let orderId;
    // Seed as vendor to ensure a vendor-visible order exists
    cy.login('vendor');
    cy.seedOrders().then((id) => {
      orderId = id;
      expect(orderId, 'seeded orderId').to.be.a('string');
    })
    // Attempt to ship before paid
    .then(() => {
      cy.login('vendor');
      return authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'shipped' });
    })
    .then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body?.message || '').to.match(/Cannot ship before order is paid/i);
    })
    // Pay as customer (buyer-only)
    .then(() => {
      cy.login('customer');
      return authedRequest('PUT', `/api/orders/${orderId}/pay`);
    })
    .then((res) => {
      expect(res.status).to.eq(200);
    })
    // Ship and deliver as vendor on the same order
    .then(() => {
      cy.login('vendor');
      return authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'shipped' });
    })
    .then((res) => {
      expect(res.status).to.eq(200);
      return authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'delivered' });
    })
    .then((res) => {
      expect(res.status).to.eq(200);
    });
  });

  it('enforces buyer-only pay and prevents paying twice', () => {
    // Prepare a fresh order
    cy.login('vendor');
    cy.seedOrders()
      .then((orderId) => {
        expect(orderId, 'seeded orderId').to.be.a('string');
        // Try to pay as vendor (not a customer)
        cy.login('vendor');
        return authedRequest('PUT', `/api/orders/${orderId}/pay`);
      })
      .then((res) => {
        // Blocked by authorize('customer')
        expect([401, 403]).to.include(res.status);

        // Pay as customer
        return cy.seedOrders().then((orderId) => {
          cy.login('customer');
          return authedRequest('PUT', `/api/orders/${orderId}/pay`);
        });
      })
      .then((res) => {
        expect(res.status).to.eq(200);

        // Attempt to pay again -> 409 (on a newly seeded already-paid order, simulate second pay)
        return cy.seedOrders().then((orderId) => {
          cy.login('customer');
          return authedRequest('PUT', `/api/orders/${orderId}/pay`).then(() => authedRequest('PUT', `/api/orders/${orderId}/pay`));
        });
      })
      .then((res) => {
        expect(res.status).to.eq(409);
        expect(res.body?.message || '').to.match(/already marked as paid/i);
      });
  });

  it('prevents paying a cancelled order and rejects invalid global transitions', () => {
    // Create a new order and cancel as admin
    cy.login('vendor');
    cy.seedOrders()
      .then((orderId) => {
        expect(orderId, 'seeded orderId').to.be.a('string');
        // Admin cancels it
        cy.login('admin');
        return authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'cancelled' });
      })
      .then((res) => {
        expect(res.status).to.eq(200);

        // Customer cannot pay a cancelled order
        return cy.seedOrders().then((orderId) => {
          cy.login('admin');
          return authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'cancelled' }).then(() => {
            cy.login('customer');
            return authedRequest('PUT', `/api/orders/${orderId}/pay`);
          });
        });
      })
      .then((res) => {
        expect(res.status).to.eq(409);
        expect(res.body?.message || '').to.match(/cannot be paid|cancelled/i);

        // Prepare delivered order to test invalid backward transition
        // New order -> paid -> shipped -> delivered
        return cy.seedOrders().then((orderId) => {
          cy.login('admin');
          return authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'paid' }).then(() => {
            cy.login('vendor');
            return authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'shipped' }).then(() =>
              authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'delivered' })
            ).then((res) => ({ res, orderId }));
          });
        });
      })
      .then(({ res, orderId }) => {
        expect(res.status).to.eq(200);
        // Admin cannot move delivered -> pending
        cy.login('admin');
        return authedRequest('PATCH', `/api/orders/${orderId}/status`, { status: 'pending' });
      })
      .then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body?.message || '').to.match(/Invalid order status transition/i);
      });
  });
});
