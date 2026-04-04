import { getVendorLandingPath } from '../LoginPage';

describe('getVendorLandingPath', () => {
  test('routes new vendor to onboarding', () => {
    expect(getVendorLandingPath({ vendorStatus: 'new' })).toBe('/vendor/onboarding');
  });

  test('routes invited vendor to onboarding', () => {
    expect(getVendorLandingPath({ vendorStatus: 'invited' })).toBe('/vendor/onboarding');
  });

  test('routes onboarded vendor to dashboard', () => {
    expect(getVendorLandingPath({ vendorStatus: 'onboarded' })).toBe('/vendor');
  });

  test('routes verified vendor to dashboard', () => {
    expect(getVendorLandingPath({ vendorStatus: 'verified' })).toBe('/vendor');
  });
});
