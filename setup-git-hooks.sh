#!/bin/sh
# setup-git-hooks.sh: Automatically install pre-commit hook

HOOKS_DIR=".git/hooks"
CUSTOM_HOOKS_DIR=".githooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "❌ .git/hooks directory not found. Please run this script from the root of your git repository."
  exit 1
fi

cp "$CUSTOM_HOOKS_DIR/pre-commit" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"
echo "✅ Pre-commit hook installed. All commits will now run backend and frontend tests."
