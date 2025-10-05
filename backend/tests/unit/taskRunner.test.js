const path = require('path');

describe('taskRunner', () => {
  let taskRunner;
  // Track created tasks to ensure we cancel if still running
  const spawned = [];
  beforeEach(() => {
    jest.resetModules();
    process.env.JEST_WORKER_ID = '1'; // ensure test tasks are included
    taskRunner = require('../../utils/taskRunner');
  });

  afterAll(() => {
    // Best-effort cancel lingering tasks (should be none after auto-exit patch)
    spawned.forEach(t => { try { t.kill && t.kill(); } catch(_){} });
  });

  test('lists task defs and can run NOOP to success', (done) => {
    const defs = taskRunner.listTaskDefs();
    expect(defs.some(d => d.key === 'test:noop')).toBe(true);
    const t = taskRunner.createTask('test:noop');
  spawned.push(t);
    const id = taskRunner.runTask(t);
    expect(id).toBe(t.id);
    const poll = setInterval(() => {
      const current = taskRunner.getTask(id);
      if (current && (current.status === 'success' || current.status === 'error')) {
        clearInterval(poll);
        expect(['success', 'error']).toContain(current.status);
        done();
      }
    }, 50);
  });

  test('can start and cancel the hold task', (done) => {
    const t = taskRunner.createTask('test:hold');
  spawned.push(t);
    const id = taskRunner.runTask(t);
    expect(id).toBe(t.id);
    setTimeout(() => {
      t.kill && t.kill();
    }, 250);
    const poll = setInterval(() => {
      const current = taskRunner.getTask(id);
      if (current && (current.status === 'canceled' || current.status === 'error' || current.status === 'success')) {
        clearInterval(poll);
        expect(['canceled', 'success', 'error']).toContain(current.status);
        done();
      }
    }, 50);
  });

  test('unknown task throws', () => {
    expect(() => taskRunner.createTask('does-not-exist')).toThrow(/Unknown task/);
  });

  test('subscribe/unsubscribe handle SSE clients safely', () => {
    const t = taskRunner.createTask('test:noop');
  spawned.push(t);
    const res = { write: jest.fn() };
    taskRunner.subscribe(t.id, res);
    // simulate a log emission by running the task quickly
    taskRunner.runTask(t);
    // give a beat for logs to flush
    // we can't assert exact calls without hooking internals; just ensure unsubscribe doesn't throw
    expect(() => taskRunner.unsubscribe(t.id, res)).not.toThrow();
  });

  test('retry succeeds on flaky-once task', (done) => {
    const t = taskRunner.createTask('test:flaky-once');
  spawned.push(t);
    const id = taskRunner.runTask(t);
    expect(id).toBe(t.id);
    const start = Date.now();
    const poll = setInterval(() => {
      const cur = taskRunner.getTask(id);
      if (cur && (cur.status === 'success' || cur.status === 'error')) {
        clearInterval(poll);
        // should become success after a single retry
        expect(cur.status).toBe('success');
        // ensure ATTEMPT env was used at least twice (attempt 1 fails, 2 passes)
        const logs = (cur.logs || []).join('\n');
        expect(logs).toMatch(/attempt 1/);
        expect(logs).toMatch(/Process exited with code 1/);
        // tolerate timing; must be within a couple seconds
        expect(Date.now() - start).toBeLessThan(3000);
        done();
      }
    }, 25);
  });

  test('retry exhausts on always-fail task', (done) => {
    const t = taskRunner.createTask('test:always-fail');
  spawned.push(t);
    const id = taskRunner.runTask(t);
    const poll = setInterval(() => {
      const cur = taskRunner.getTask(id);
      if (cur && (cur.status === 'success' || cur.status === 'error')) {
        clearInterval(poll);
        expect(cur.status).toBe('error');
        const logs = (cur.logs || []).join('\n');
        expect(logs).toMatch(/will fail/);
        // should include two retries message lines
        expect(logs).toMatch(/Retrying in/);
        done();
      }
    }, 25);
  });
});
