# Local Dev Guardrails (Windows)

Purpose: prevent "missing work" by keeping a single, canonical working copy and removing risky paths.

- One canonical clone only
  - Keep the active repo at: `c:\Dev\Merkato` (this workspace)
  - Do not edit or run scripts against other clones (e.g., Desktop/Downloads)

- Avoid OneDrive/Desktop paths
  - Do not place a working clone under `C:\Users\<you>\OneDrive\...` or Desktop/Documents synced folders
  - Office or OS may lock files and break Git operations (unlink failures, resets)
  - This repo’s VS Code tasks were updated to avoid any OneDrive paths

- GitHub-first workflow
  - Always push branches daily and open PRs for review, even WIP
  - Never rebase a long-lived branch with unpushed local commits; prefer merge or push then rebase with remote backup
  - After merging, pull `main` before new work; avoid diverged `main`

- Hooks and checks
  - Pre-commit hook to block focused tests (`.only`/`fit`) and commit large binaries under `docs/`
  - Install hooks via: `scripts/install-git-hooks.ps1` (PowerShell) to set `core.hooksPath=.githooks`

- Daily checklist
  1) `git status` is clean
  2) `git fetch --all --prune` and `git pull --rebase` on `main`
  3) Push feature branches: `git push -u origin <branch>`
  4) Open/Update PR and confirm CI is green

If you ever see old UI after a restart:
- Verify you’re running from this repo: `cd c:\Dev\Merkato\frontend; npm start`
- Confirm no other dev server is running on another clone/port
- Reinstall deps if needed: `npm ci` in frontend/backend
