describe('taskRunner retry-to-success branch', () => {
  let taskRunner;
  beforeEach(() => {
    jest.resetModules();
    process.env.JEST_WORKER_ID = '1';
    taskRunner = require('../../utils/taskRunner');
  });

  test('flaky-once task retries and eventually succeeds', (done) => {
    const t = taskRunner.createTask('test:flaky-once');
    const id = taskRunner.runTask(t);
    const poll = setInterval(() => {
      const cur = taskRunner.getTask(id);
      if (cur && (cur.status === 'success' || cur.status === 'error')) {
        clearInterval(poll);
        expect(cur.status).toBe('success');
        const logs = (cur.logs || []).join('\n');
        expect(logs).toMatch(/attempt 1|attempt 2/);
        done();
      }
    }, 25);
  });
});
