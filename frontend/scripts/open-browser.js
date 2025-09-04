#!/usr/bin/env node
/* Opens the default browser to the given URL in a cross-platform, Windows-friendly way. */
const { exec } = require('child_process');

const url = process.argv[2] || 'http://localhost:3000';

function openWindows(u) {
  // Use start via cmd to avoid PowerShell escaping issues; 'start' requires a window title param
  exec(`cmd /c start "" "${u}"`);
}

function openMac(u) {
  exec(`open "${u}"`);
}

function openLinux(u) {
  // xdg-open is the usual opener; ignore errors if not present
  exec(`xdg-open "${u}"`);
}

const platform = process.platform;
if (platform === 'win32') openWindows(url);
else if (platform === 'darwin') openMac(url);
else openLinux(url);
