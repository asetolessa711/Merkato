#!/usr/bin/env node
const { spawn } = require('child_process');

function start(name, cmd, args, cwd) {
  const p = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  p.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exitCode = code || 1;
      shutdown();
    }
  });

  return p;
}

const procs = [];
let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const p of procs) {
    try {
      p.kill('SIGTERM');
    } catch {}
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

procs.push(start('backend', 'npm', ['--prefix', 'backend', 'run', 'dev'], process.cwd()));
procs.push(start('frontend', 'npm', ['--prefix', 'frontend', 'run', 'dev'], process.cwd()));
