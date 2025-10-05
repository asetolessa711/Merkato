const EventEmitter = require('events');

describe('taskRunner kill() on Windows path', () => {
  const originalPlatform = process.platform;
  let spawnMock;

  beforeEach(() => {
    jest.resetModules();
    spawnMock = jest.fn((cmd, args, opts) => {
      // First spawn is the task process, second is 'taskkill'
      const ee = new EventEmitter();
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      // Give each spawned process a pid
      ee.pid = cmd === 'taskkill' ? 99999 : 12345;
      ee.on = ee.on.bind(ee);
      ee.once = ee.once ? ee.once.bind(ee) : ee.on.bind(ee);
      // Support .on('close') usage by returning self (EventEmitter implements .on)
      // For 'taskkill', auto-fire close shortly
      if (cmd === 'taskkill') {
        setTimeout(() => ee.emit('close', 0), 10);
      } else {
        // Simulate quick exit later if needed
        setTimeout(() => ee.emit('close', 0), 100);
      }
      return ee;
    });

    jest.doMock('child_process', () => ({ spawn: spawnMock }));
    // Force Windows branch
    Object.defineProperty(process, 'platform', { value: 'win32' });
  });

  afterEach(() => {
    // Restore platform if possible (best-effort)
    try { Object.defineProperty(process, 'platform', { value: originalPlatform }); } catch(_) {}
    jest.resetModules();
    jest.dontMock('child_process');
  });

  test('kill() uses taskkill on Windows', async () => {
    const taskRunner = require('../../utils/taskRunner');
    const task = taskRunner.createTask('test:hold');
    const id = taskRunner.runTask(task);
    expect(id).toBe(task.id);
    // Call kill immediately; our spawn mock already provided a pid
    task.kill();
    // Ensure taskkill was invoked
    const calls = spawnMock.mock.calls.map(([cmd, args]) => ({ cmd, args }));
    // There should be a call with cmd 'taskkill' and args including '/PID' and the child pid
    const tk = calls.find(c => c.cmd === 'taskkill');
    expect(tk).toBeTruthy();
    expect(tk.args.join(' ')).toMatch(/\/PID\s+12345/);
    // Status toggled to canceled synchronously
    expect(task.status).toBe('canceled');
  });
});
