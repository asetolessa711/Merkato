const express = require('express');
const router = express.Router();
const {
  STATUS,
  createTask,
  runTask,
  getTask,
  listTaskDefs,
  subscribe,
  unsubscribe,
} = require('../utils/taskRunner');

// List available tasks
router.get('/tasks', (req, res) => {
  res.json({ tasks: listTaskDefs() });
});

// Start a task by key
router.post('/tasks', (req, res) => {
  const { key } = req.body || {};
  if (!key) return res.status(400).json({ message: 'Missing task key' });
  try {
    const task = createTask(key);
    runTask(task);
    res.status(201).json({ id: task.id, key: task.key, status: task.status, label: task.label });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Get task status and recent logs
router.get('/tasks/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.json({
    id: task.id,
    key: task.key,
    label: task.label,
    status: task.status,
    startTime: task.startTime,
    endTime: task.endTime,
    pid: task.pid,
    error: task.error,
    logs: task.logs,
  });
});

// Cancel a task if running
router.post('/tasks/:id/cancel', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (typeof task.kill === 'function') task.kill();
  res.json({ message: 'Canceled', status: task.status });
});

// SSE stream of live logs and status updates
router.get('/tasks/:id/stream', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Push initial snapshot
  res.write(`data: ${JSON.stringify({ type: 'status', status: task.status })}\n\n`);
  for (const line of task.logs) {
    res.write(`data: ${JSON.stringify({ type: 'log', line })}\n\n`);
  }

  subscribe(task.id, res);

  req.on('close', () => {
    unsubscribe(task.id, res);
    res.end();
  });
});

module.exports = router;
