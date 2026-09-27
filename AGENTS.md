# Agent instructions

## Project

This package ships the `changelog` bin with the `release`, `verify`, and `notes` commands, plus a public API from `src/index.ts`. The `release` command prepares the release commit. Release workflows run the other two before they publish to npm and create a GitHub Release. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the layout, the scripts, and the commit and branch conventions.

- Keep all file system and console access in `src/cli.ts`. The parser, the checks, the renderer, and the release preparation take strings and return values.
- Treat the failure messages as a contract. When you change one, update the README table and the specs in the same commit.
- Add a fixture to `testing/fixtures.ts` for every new situation that a check handles. Short inline snippets are fine for parser edge cases.
- Keep the package free of runtime dependencies. Use `node:util` and other Node built-ins instead.
- Run `format-check`, `lint-md`, `lint-ts`, `typecheck`, `test-ci`, `build`, and `actionlint` before you commit.
