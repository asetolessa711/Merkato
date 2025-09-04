#!/usr/bin/env node
/* Waits for CRA dev server to listen on configured PORT and then opens browser (Windows-safe). */
const net = require('net');
const { setTimeout: sleep } = require('timers/promises');
const { exec } = require('child_process');

const port = Number(process.env.PORT || 3000);
const hosts = ['127.0.0.1', 'localhost'];
const url = `http://localhost:${port}`;
const deadlineMs = Date.now() + 180000; // 3 minutes timeout

function tryExec(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true }, (err) => resolve(!err));
  });
}

async function openWindows(u) {
  // Try PowerShell (robust), then Explorer, then cmd start
  if (await tryExec(`powershell -NoProfile -NonInteractive -Command Start-Process \"${u}\"`)) return true;
  if (await tryExec(`explorer.exe "${u}"`)) return true;
  if (await tryExec(`cmd /c start "" "${u}"`)) return true;
  return false;
}
function openMac(u) { return tryExec(`open "${u}"`); }
function openLinux(u) { return tryExec(`xdg-open "${u}"`); }

async function waitForPort() {
  while (Date.now() < deadlineMs) {
    try {
      // Try each host option quickly
      for (const h of hosts) {
        await new Promise((resolve, reject) => {
          const sock = net.createConnection({ host: h, port, timeout: 2000 }, () => {
            sock.end();
            resolve();
          });
          sock.on('error', reject);
          sock.on('timeout', () => {
            sock.destroy(new Error('timeout'));
          });
        });
        return true;
      }
      return true;
    } catch (_) {
      await sleep(800);
    }
  }
  return false;
}

(async () => {
  console.log(`[open-when-ready] Waiting for dev server on port ${port} ...`);
  const ok = await waitForPort();
  if (!ok) {
    console.error(`[open-when-ready] Dev server not reachable at ${url} within timeout.`);
    // Do not kill the dev server; just exit opener so the server keeps running
    process.exit(0);
  }
  console.log(`[open-when-ready] Opening ${url} ...`);
  const platform = process.platform;
  let opened = false;
  if (platform === 'win32') opened = await openWindows(url);
  else if (platform === 'darwin') opened = await openMac(url);
  else opened = await openLinux(url);
  if (!opened) {
    console.warn('[open-when-ready] Failed to auto-open browser; please open:', url);
  }
})();
