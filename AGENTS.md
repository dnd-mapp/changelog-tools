# Agent instructions

## Project

This package ships the `changelog` bin with the `verify` and `notes` commands, plus a public API from `src/index.ts`. Release workflows run it before they publish to npm and create a GitHub Release. Read `CONTRIBUTING.md` for the layout, the scripts, and the commit and branch conventions.

- Keep all file system and console access in `src/cli.ts`. The parser, the checks, and the renderer take strings and return values.
- Treat the failure messages as a contract. When you change one, update the README table and the specs in the same commit.
- Add a fixture to `testing/fixtures.ts` for every new situation that a check handles. Short inline snippets are fine for parser edge cases.
- Keep the package free of runtime dependencies. Use `node:util` and other Node built-ins instead.
- Run `format-check`, `lint-md`, `lint-ts`, `typecheck`, `test-ci`, and `build` before you commit.

## Writing style

- Never hard wrap prose. Write each paragraph or list item on a single line and let the editor wrap it.
- Use US spelling only, for example "color", "behavior", and "initialize".
- Keep every sentence at or under 40 words.
- Pretty print Markdown tables so the columns line up in the source.
- Give every separator line alignment markers (`:---`, `:---:`, or `---:`).
- Carry the separator line from edge to edge of each column, with no spaces between the pipes and the dashes.

Example:

| Option   | Default  | Description               |
|:---------|:---------|:--------------------------|
| `strict` | `true`   | Enables all strict checks |
| `target` | `es2025` | Emitted language version  |

After creating or updating a file that contains prose, including Markdown files, do reading passes over it until every rule above is satisfied. Fix any violation you find, then read the file again.
