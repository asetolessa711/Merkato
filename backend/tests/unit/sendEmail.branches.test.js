jest.mock('nodemailer', () => {
  const sendMail = jest.fn(async () => ({ accepted: ['x@y.z'], rejected: [] }));
  return {
    __esModule: true,
    default: { createTransport: jest.fn(() => ({ verify: jest.fn(async () => true), sendMail })) },
    createTransport: jest.fn(() => ({ verify: jest.fn(async () => true), sendMail })),
  };
});

describe('sendEmail branches', () => {
  const OLD_ENV = process.env;
  beforeAll(() => {
    process.env = { ...OLD_ENV, EMAIL_USER: 'a@b.c', EMAIL_PASS: 'pw', CLIENT_URL: 'http://localhost:3000' };
  });
  afterAll(() => { process.env = OLD_ENV; });

  test('successful send path including plaintext fallback', async () => {
    const { sendEmail } = require('../../utils/sendEmail');
    const res = await sendEmail({ to: 'a@b.c', html: '<b>Hello</b>' });
    expect(res).toBeTruthy();
  });

  test('uses provided text when present (skips html-to-text fallback)', async () => {
    jest.resetModules();
    jest.doMock('nodemailer', () => {
      const sendMail = jest.fn(async (opts) => {
        // ensure text is what we supplied
        if (opts.text !== 'plain hello') throw new Error('text fallback not used correctly');
        return { accepted: ['x@y.z'], rejected: [] };
      });
      return {
        __esModule: true,
        default: { createTransport: () => ({ verify: async () => true, sendMail }) },
        createTransport: () => ({ verify: async () => true, sendMail }),
      };
    });
    process.env.EMAIL_USER = 'x@y.z';
    process.env.EMAIL_PASS = 'pw';
    const mod = require('../../utils/sendEmail');
    const res = await mod.sendEmail({ to: 'x@y.z', html: '<i>Hi</i>', text: 'plain hello' });
    expect(res).toBeTruthy();
  });

  test('transport throws leads to error branch', async () => {
    jest.resetModules();
    jest.doMock('nodemailer', () => {
      return {
        __esModule: true,
        default: { createTransport: () => ({ verify: async () => { throw new Error('verify fail'); }, sendMail: async () => ({}) }) },
        createTransport: () => ({ verify: async () => { throw new Error('verify fail'); }, sendMail: async () => ({}) }),
      };
    });
    process.env.EMAIL_USER = 'x@y.z';
    process.env.EMAIL_PASS = 'pw';
    const mod = require('../../utils/sendEmail');
    await expect(mod.sendEmail({ to: 'x@y.z', html: '<i>Hi</i>' })).rejects.toThrow(/Failed to send email/);
  });
});
