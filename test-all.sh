#!/usr/bin/env bash
# Unified test entry for POSIX shells; delegates to Node runner which executes
# frontend -> backend -> full E2E suite. For Windows/PowerShell, use:
#   npm run test:all:ps

node ./scripts/run-all-tests.js "$@"
