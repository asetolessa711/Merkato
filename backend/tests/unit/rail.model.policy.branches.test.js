const mongoose = require('mongoose');
const Rail = require('../../models/Rail');

describe('Rail model policy enforcement branches', () => {
  const orig = process.env.RAILS_POLICY_ENFORCE;
  beforeAll(() => {
    process.env.RAILS_POLICY_ENFORCE = 'true';
  });
  afterAll(() => {
    process.env.RAILS_POLICY_ENFORCE = orig;
  });

  test('fails activation when missing tactic/placementKey/owner in Prod Active', async () => {
    const rail = new Rail({
      railId: 'R-1',
      title: 'Test Rail',
      environment: 'Prod',
      opsStatus: 'active'
      // missing: tactic, placementKey, owner
    });
    await expect(rail.validate()).rejects.toThrow(/Activation requires tactic, placementKey, and owner/);
  });

  test('Sponsored rails require capSitePct and capPerRailPct', async () => {
    const rail = new Rail({
      railId: 'R-2',
      title: 'Sponsored Rail',
      environment: 'Prod',
      opsStatus: 'active',
      tactic: 'Sponsored',
      placementKey: 'Mid',
      owner: 'Marketing'
      // missing caps
    });
    await expect(rail.validate()).rejects.toThrow(/Sponsored rails require capSitePct and capPerRailPct/);
  });

  test('guardrail: noSponsoredAtHeroTop blocks Sponsored at HeroTop', async () => {
    const rail = new Rail({
      railId: 'R-3',
      title: 'Hero Sponsored',
      environment: 'Prod',
      opsStatus: 'active',
      tactic: 'Sponsored',
      placementKey: 'HeroTop',
      owner: 'Marketing',
      capSitePct: 10,
      capPerRailPct: 20
    });
    await expect(rail.validate()).rejects.toThrow(/violates policy guardrails/);
  });

  test('guardrail: PDP/Cart only CrossSell (Cart with non-CrossSell fails)', async () => {
    const rail = new Rail({
      railId: 'R-4',
      title: 'Cart Not CrossSell',
      environment: 'Prod',
      opsStatus: 'active',
      tactic: 'Curated', // not CrossSell
      placementKey: 'Cart',
      owner: 'Marketing'
    });
    await expect(rail.validate()).rejects.toThrow(/violates policy guardrails/);
  });
});
