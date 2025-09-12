// @trust-ui payment initiation
import React from 'react';
// Tags: @thread:payments @thread:checkout
import StripeCheckoutButton from '../StripeCheckoutButton';

export default {
  title: 'Payments/StripeCheckoutButton',
  component: StripeCheckoutButton,
  parameters: { tags: ['@trust-ui', '@visual'] }
};

const mockStripe = {
  redirectToCheckout: async () => {
    // visual noop
  }
};

export const Enabled = () => (
  <StripeCheckoutButton items={[{ id: 'p1', quantity: 1 }]} stripe={mockStripe} />
);
Enabled.storyName = 'Enabled';

export const DisabledEmpty = () => (
  <StripeCheckoutButton items={[]} stripe={mockStripe} />
);
DisabledEmpty.parameters = { tags: ['@trust-ui', '@visual'] };
DisabledEmpty.storyName = 'Disabled (Empty Items)';
