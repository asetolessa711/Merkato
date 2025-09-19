const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

describe('Task Routes @tasks', () => {
  afterAll(async () => {
    if (process.env.JEST_CLOSE_DB === 'true') {
      await mongoose.connection.close();
    }
  });

  test('GET /api/tasks lists available tasks', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.tasks)).toBe(true);
    const keys = res.body.tasks.map((t) => t.key);
    expect(keys.length).toBeGreaterThan(0);
    // In test env, our test tasks should be present
    expect(keys).toEqual(expect.arrayContaining(['test:noop', 'test:hold']));
  });

  test('POST /api/tasks 400 on missing key', async () => {
    const res = await request(app).post('/api/tasks').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/missing task key/i);
  });

  test('POST /api/tasks 400 on invalid key', async () => {
    const res = await request(app).post('/api/tasks').send({ key: 'does:not:exist' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/unknown task/i);
  });

  test('POST /api/tasks creates and runs a short task (test:noop)', async () => {
    const res = await request(app).post('/api/tasks').send({ key: 'test:noop' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('status');
  });

  test('Task lifecycle: create test:hold, query status, cancel, then verify status', async () => {
    const create = await request(app).post('/api/tasks').send({ key: 'test:hold' });
    expect(create.statusCode).toBe(201);
    const id = create.body.id;

    // Fetch status
    const get1 = await request(app).get(`/api/tasks/${id}`);
    expect(get1.statusCode).toBe(200);
    expect(get1.body).toHaveProperty('status');

    // Cancel
    const cancel = await request(app).post(`/api/tasks/${id}/cancel`);
    expect(cancel.statusCode).toBe(200);
    expect(['canceled', 'canceled'.toUpperCase()]).toContain(cancel.body.status?.toLowerCase?.() || cancel.body.status);

    // Refetch status should reflect terminal state
    const get2 = await request(app).get(`/api/tasks/${id}`);
    expect(get2.statusCode).toBe(200);
    expect(['canceled', 'error', 'success', 'idle']).toContain((get2.body.status || '').toLowerCase());
  });

  test('GET /api/tasks/:id 404 for unknown id', async () => {
    const res = await request(app).get('/api/tasks/unknown-id');
    expect(res.statusCode).toBe(404);
  });

  test('POST /api/tasks/:id/cancel 404 for unknown id', async () => {
    const res = await request(app).post('/api/tasks/unknown-id/cancel');
    expect(res.statusCode).toBe(404);
  });

  test('GET /api/tasks/:id/stream returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/tasks/unknown-id/stream');
    expect(res.statusCode).toBe(404);
  });
});
