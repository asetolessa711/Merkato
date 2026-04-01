#!/usr/bin/env node
const { spawn } = require('child_process');

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, CI: 'true' },
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

(async () => {
  try {
    await run('npm', ['--prefix', 'frontend', 'run', 'test', '--', '--listTests', '--watchAll=false', '--runInBand']);
    await run('npx', ['jest', '--config=./jest.config.backend.js', '--listTests'], { cwd: 'backend' });
    console.log('\nCore verification passed.');
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
