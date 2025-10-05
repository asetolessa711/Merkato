// @persona-ui:customer onboarding
import React from 'react';
import RegisterPage from '../../pages/RegisterPage'';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

export default {
  title: 'Auth/RegisterPage',
  component: RegisterPage,
  parameters: { tags: ['@persona-ui:customer', '@visual'] }
};

const Wrapper = () => {
  try { localStorage.removeItem('user'); localStorage.removeItem('token'); } catch(_) {}
  return (
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div data-testid="login-target">Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

export const EmptyForm = () => <Wrapper />;
EmptyForm.storyName = 'Empty Form';
EmptyForm.parameters = { skipGlobalRouter: true };

export const PrefilledCustomer = () => {
  try { window.history.replaceState({}, '', '/register?role=customer'); } catch(_) {}
  return <Wrapper />;
};
PrefilledCustomer.parameters = { tags: ['@persona-ui:customer', '@visual'], skipGlobalRouter: true };
PrefilledCustomer.storyName = 'Prefilled Customer Role';
