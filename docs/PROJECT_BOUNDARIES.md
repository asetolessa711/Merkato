# Project Boundaries and Conventions

## File naming on Windows (duplicate basenames)

Windows and macOS (by default) use case-insensitive filesystems. Having two files with the same basename but different extensions or case (e.g., `MicroBanner.js` and `MicroBanner.jsx`, or `navbar.jsx` vs `Navbar.jsx`) can cause:

- Unpredictable module resolution in Webpack/Jest
- CI vs local discrepancies
- Accidental imports to the wrong file

To eliminate these risks, we enforce a single canonical source file per component:

- Use `.jsx` for React components and `.js` for non-React modules.
- Do not keep both `.js` and `.jsx` for the same basename.
- Use explicit extensions in imports for `.jsx` components, e.g. `import Foo from './Foo.jsx'`.

### Automated guards

We ship scripts to detect and block duplicate basenames and ambiguous imports:

- Detect duplicates: `npm --prefix frontend run dup:scan`
- Guard (fail on duplicates): `npm --prefix frontend run dup:guard`
- Find ambiguous imports (missing explicit `.jsx` where needed): `npm --prefix frontend run imports:scan`
- Auto-fix ambiguous imports: `npm --prefix frontend run imports:fix`

These run in pre-commit and CI. If a guard fails locally:

1. Rename or delete the conflicting file to keep only one canonical file per basename.
2. Ensure imports explicitly reference `.jsx` for React components.
3. Re-run `dup:scan` and `imports:scan` until clean.

## Testing conventions

- Frontend uses Jest + React Testing Library. See `TESTING.md` for fake timers best practices and the global axios mock contract.
- Coverage gates are enforced in `frontend/jest.config.js`; thresholds may ratchet up over time.

## Lints and builds

- CRA with CRACO is used; certain ESLint integrations are disabled to avoid noisy/duplicated rules during builds on Windows. Use the repo-level ESLint via editor or `npm run lint` scripts where applicable.
