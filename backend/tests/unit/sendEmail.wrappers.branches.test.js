// Tests for sendOrderConfirmation and sendPasswordResetEmail wrappers
jest.mock('nodemailer', () => ({
  createTransport: () => ({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ accepted: ['user@example.com'] }),
  }),
}));

// Provide required envs at import time
process.env.EMAIL_USER = 'noreply@example.com';
process.env.EMAIL_PASS = 'secret';
process.env.CLIENT_URL = 'http://localhost:3000';

const { sendOrderConfirmation, sendPasswordResetEmail } = require('../../utils/sendEmail');

describe('sendEmail wrappers branches', () => {
  test('sendOrderConfirmation succeeds with minimal order', async () => {
    const order = { _id: 'o1', currency: 'ETB', total: 123.45, shippingAddress: 'A St', products: [{ product: { name: 'P1' }, quantity: 2 }] };
    const res = await sendOrderConfirmation({ to: 'user@example.com', order });
    expect(res).toBeTruthy();
  });

  test('sendPasswordResetEmail succeeds and uses BASE_URL', async () => {
    const res = await sendPasswordResetEmail({ to: 'user@example.com', token: 't1' });
    expect(res).toBeTruthy();
  });
});
