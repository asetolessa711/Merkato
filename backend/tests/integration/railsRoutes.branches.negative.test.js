const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const { registerTestUser, loginTestUser } = require('../utils/testUserUtils');

describe('Rails Routes negative branches @rails', () => {
  let adminToken;

  beforeAll(async () => {
    const admin = await registerTestUser({
      email: `admin_neg_${Date.now()}@example.com`,
      password: 'AdminPass123!',
      roles: ['admin'],
    });
    const adminLogin = await loginTestUser(admin.email, 'AdminPass123!');
    adminToken = `Bearer ${adminLogin.token}`;
  });

  // Do not close mongoose here; globalTeardown handles DB shutdown to avoid cross-suite interference

  test('PATCH /api/admin/rails/bulk → 400 when railIds missing', async () => {
    const res = await request(app)
      .patch('/api/admin/rails/bulk')
      .set('Authorization', adminToken)
      .send({ updates: { owner: 'ops' } });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/railIds required/i);
  });

  test('PATCH /api/admin/rails/bulk → 400 when no valid updates provided', async () => {
    const res = await request(app)
      .patch('/api/admin/rails/bulk')
      .set('Authorization', adminToken)
      .send({ railIds: ['nonexistent1'], updates: { notAllowedField: 'x' } });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/no valid updates/i);
  });

  test('PUT/DELETE/duplicate on missing rail → 404s', async () => {
    const missingId = 'rail_missing_12345';
    const upd = await request(app)
      .put(`/api/admin/rails/${missingId}`)
      .set('Authorization', adminToken)
      .send({ status: 'draft' });
    expect(upd.statusCode).toBe(404);
    expect(upd.body.message).toMatch(/Rail not found/);

    const del = await request(app)
      .delete(`/api/admin/rails/${missingId}`)
      .set('Authorization', adminToken);
    expect(del.statusCode).toBe(404);
    expect(del.body.message).toMatch(/Rail not found/);

    const dup = await request(app)
      .post(`/api/admin/rails/duplicate/${missingId}`)
      .set('Authorization', adminToken)
      .send();
    expect(dup.statusCode).toBe(404);
    expect(dup.body.message).toMatch(/Rail not found/);
  });
});
