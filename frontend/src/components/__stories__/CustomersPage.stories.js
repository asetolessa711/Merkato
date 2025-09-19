// Tags: @thread:notifications
import React from 'react';
import CustomersPage from '../../pages/CustomersPage';

export default {
  title: 'Account/CustomersPage',
  component: CustomersPage,
  parameters: { layout: 'fullscreen' }
};

export const NotificationsTab = () => <CustomersPage />;
