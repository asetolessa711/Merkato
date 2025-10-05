describe('sendEmail env guards (branch)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });
  afterEach(() => { process.env = OLD_ENV; });

  test('throws at import time when EMAIL_USER/PASS are missing', () => {
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    expect(() => require('../../utils/sendEmail')).toThrow(/EMAIL_USER and EMAIL_PASS/);
  });
});
