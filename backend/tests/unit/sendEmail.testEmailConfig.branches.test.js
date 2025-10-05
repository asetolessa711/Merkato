describe('sendEmail.testEmailConfig branches', () => {
  const OLD_ENV = process.env;
  beforeEach(() => { jest.resetModules(); process.env = { ...OLD_ENV, NODE_ENV: 'development', EMAIL_USER: 'u@e.com', EMAIL_PASS: 'pw' }; });
  afterEach(() => { process.env = OLD_ENV; });

  test('logs verified ok when transporter.verify succeeds', async () => {
    jest.doMock('nodemailer', () => ({
      __esModule: true,
      default: { createTransport: () => ({ verify: async () => true }) },
      createTransport: () => ({ verify: async () => true }),
    }));
    const mod = require('../../utils/sendEmail');
    await expect(mod.testEmailConfig()).resolves.toBeUndefined();
  });

  test('logs error path when transporter.verify throws', async () => {
    jest.resetModules();
    jest.doMock('nodemailer', () => ({
      __esModule: true,
      default: { createTransport: () => ({ verify: async () => { throw new Error('bad verify'); } }) },
      createTransport: () => ({ verify: async () => { throw new Error('bad verify'); } }),
    }));
    const mod = require('../../utils/sendEmail');
    await expect(mod.testEmailConfig()).resolves.toBeUndefined();
  });

  test('does nothing in production (skip branch)', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_USER = 'u@e.com';
    process.env.EMAIL_PASS = 'pw';
    const mod = require('../../utils/sendEmail');
    await expect(mod.testEmailConfig()).resolves.toBeUndefined();
  });
});
