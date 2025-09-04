const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');

// Simple in-memory task store and SSE subscriptions
const tasks = new Map(); // id -> task
const sseClients = new Map(); // id -> Set(res)

const STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELED: 'canceled',
};

// Define commonly used commands for this repo
const repoRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(repoRoot, '..', 'frontend');
const backendDir = path.join(repoRoot);

const TASK_DEFS = {
  'backend:test': {
    label: 'Run backend tests',
    cmd: 'npm',
    args: ['test'],
    cwd: backendDir,
    env: { JEST_CLOSE_DB: 'true' },
  },
  'backend:test:debug': {
    label: 'Run backend tests (detect open handles)',
    cmd: 'npm',
    args: ['run', 'test:debug'],
    cwd: backendDir,
    env: { JEST_CLOSE_DB: 'true' },
  },
  'backend:dev': {
    label: 'Start backend (dev)',
    cmd: 'npm',
    args: ['run', 'dev'],
    cwd: backendDir,
    env: { PORT: '5000' },
    background: true,
  },
  'frontend:test': {
    label: 'Run frontend tests',
    cmd: 'npm',
    args: ['test'],
    cwd: frontendDir,
    env: { CI: 'true' },
  },
  'frontend:start': {
    label: 'Start frontend (dev)',
    cmd: 'npm',
    args: ['start'],
    cwd: frontendDir,
    background: true,
  },
  'e2e:checkout': {
    label: 'Run E2E (checkout only)',
    cmd: 'node',
    args: ['scripts/run-e2e.js'],
    cwd: frontendDir,
    env: {
      E2E_SPEC: 'cypress/e2e/checkout_payment.cy.js,cypress/e2e/customer_checkout.cy.js,cypress/e2e/guest_checkout.cy.js',
      CYPRESS_video: 'false',
    },
  },
  'e2e:core': {
    label: 'Run E2E (core)',
    cmd: 'node',
    args: ['scripts/run-e2e.js'],
    cwd: frontendDir,
    env: {
      E2E_SPEC: [
        'cypress/e2e/basic_navigation.cy.js',
        'cypress/e2e/shop_visibility.cy.js',
        'cypress/e2e/cart_checkout_button.cy.js',
        'cypress/e2e/login_error.cy.js',
        'cypress/e2e/product_detail_add_to_cart.cy.js',
        'cypress/e2e/checkout_payment.cy.js',
        'cypress/e2e/guest_checkout.cy.js',
      ].join(','),
      CYPRESS_video: 'false',
    },
  },
  'e2e:all': {
    label: 'Run E2E (full suite)',
    cmd: 'node',
    args: ['scripts/run-e2e.js'],
    cwd: frontendDir,
    env: {
      CYPRESS_video: 'false',
    },
  },
  'all:tests': {
    label: 'Run all tests',
    // Use workspace root script when available; fallback to backend+frontend sequentially
    // We run through a small shell shim for simplicity
    shell: true,
    cmd: process.platform === 'win32' ? 'powershell.exe' : 'bash',
    args: process.platform === 'win32'
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `cd '${backendDir}'; npm test; cd '${frontendDir}'; npm test`]
      : ['-lc', `cd '${backendDir}' && npm test && cd '${frontendDir}' && npm test`],
    cwd: repoRoot,
  },
};

function toId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function ensureSet(map, key) {
  if (!map.has(key)) map.set(key, new Set());
  return map.get(key);
}

function emitSSE(taskId, payload) {
  const clients = sseClients.get(taskId);
  if (!clients || clients.size === 0) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    res.write(data);
  }
}

function createTask(taskKey) {
  const def = TASK_DEFS[taskKey];
  if (!def) throw new Error(`Unknown task: ${taskKey}`);
  const id = toId();
  const task = {
    id,
    key: taskKey,
    label: def.label,
    status: STATUS.IDLE,
    startTime: null,
    endTime: null,
    pid: null,
    logs: [], // ring buffer of lines
    maxLogs: 1000,
    error: null,
    emitter: new EventEmitter(),
    kill: null,
  };
  tasks.set(id, task);
  return task;
}

function appendLog(task, line) {
  if (!line) return;
  task.logs.push(line);
  if (task.logs.length > task.maxLogs) task.logs.shift();
  emitSSE(task.id, { type: 'log', line });
}

function runTask(task) {
  const def = TASK_DEFS[task.key];
  task.status = STATUS.RUNNING;
  task.startTime = new Date().toISOString();
  emitSSE(task.id, { type: 'status', status: task.status });

  const spawnOpts = {
    cwd: def.cwd,
    env: { ...process.env, ...(def.env || {}) },
    shell: !!def.shell, // allow composite commands when needed
  };

  const child = spawn(def.cmd, def.args || [], spawnOpts);
  task.pid = child.pid;
  task.kill = () => {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F']);
      } else {
        child.kill('SIGTERM');
      }
      task.status = STATUS.CANCELED;
      task.endTime = new Date().toISOString();
      emitSSE(task.id, { type: 'status', status: task.status });
    } catch (e) {
      // ignore
    }
  };

  const onData = (buf) => {
    const text = buf.toString();
    text.split(/\r?\n/).forEach((line) => appendLog(task, line));
  };

  child.stdout?.on('data', onData);
  child.stderr?.on('data', onData);

  child.on('error', (err) => {
    task.status = STATUS.ERROR;
    task.error = err.message;
    task.endTime = new Date().toISOString();
    appendLog(task, `ERROR: ${err.message}`);
    emitSSE(task.id, { type: 'status', status: task.status, error: task.error });
  });

  child.on('close', (code) => {
    if (task.status !== STATUS.CANCELED) {
      task.status = code === 0 ? STATUS.SUCCESS : STATUS.ERROR;
    }
    task.endTime = new Date().toISOString();
    appendLog(task, `\nProcess exited with code ${code}`);
    emitSSE(task.id, { type: 'status', status: task.status, code });
  });

  return task.id;
}

function getTask(id) {
  return tasks.get(id) || null;
}

function listTaskDefs() {
  return Object.entries(TASK_DEFS).map(([key, def]) => ({ key, label: def.label }));
}

function subscribe(taskId, res) {
  const set = ensureSet(sseClients, taskId);
  set.add(res);
}

function unsubscribe(taskId, res) {
  const set = sseClients.get(taskId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) sseClients.delete(taskId);
}

module.exports = {
  STATUS,
  createTask,
  runTask,
  getTask,
  listTaskDefs,
  subscribe,
  unsubscribe,
};
