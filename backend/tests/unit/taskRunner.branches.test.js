describe('taskRunner retry/backoff branches', () => {
  let taskRunner;
  beforeEach(() => {
    jest.resetModules();
    process.env.JEST_WORKER_ID = '1';
    taskRunner = require('../../utils/taskRunner');
  });

  test('always-fail task traverses retry/backoff path', (done) => {
    const t = taskRunner.createTask('test:always-fail');
    const id = taskRunner.runTask(t);
    const start = Date.now();
    const poll = setInterval(() => {
      const cur = taskRunner.getTask(id);
      if (cur && (cur.status === 'success' || cur.status === 'error')) {
        clearInterval(poll);
        expect(cur.status).toBe('error');
        const logs = (cur.logs || []).join('\n');
        expect(logs).toMatch(/Retrying in/);
        // backoff should keep total time under ~5s in tests
        expect(Date.now() - start).toBeLessThan(6000);
        done();
      }
    }, 25);
  });
});
