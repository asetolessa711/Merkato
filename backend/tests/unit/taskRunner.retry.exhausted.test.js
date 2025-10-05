describe('taskRunner retry exhausted -> error status', () => {
  test('test:always-fail ends with ERROR status', async () => {
    jest.resetModules();
    const taskRunner = require('../../utils/taskRunner');
    const task = taskRunner.createTask('test:always-fail');
    taskRunner.runTask(task);
    // Poll until final status
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 20; i++) {
      if (task.status === 'error' || task.status === 'success') break;
      await wait(50);
    }
    expect(task.status === 'error' || task.status === 'success').toBe(true);
    // For this task, after retries it should be error
    expect(task.status).toBe('error');
    if (typeof taskRunner._shutdownAllTasks === 'function') {
      taskRunner._shutdownAllTasks();
    }
  });
});
