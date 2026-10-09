# Contributing to dnd-mapp/changelog-tools

This page adds the details of `dnd-mapp/changelog-tools` to the [shared contributing guide](https://github.com/dnd-mapp/.github/blob/main/CONTRIBUTING.md). Read that guide first.

This package decides whether a release may go ahead and writes the notes of every GitHub Release. A mistake here can block a release or publish wrong notes, so keep changes small and deliberate.

## Project layout

The sources live in `src`, and most modules have a `.spec.ts` file next to them.

| File                  | Purpose                                                              |
|:----------------------|:---------------------------------------------------------------------|
| `src/changelog.ts`    | The executable behind the `changelog` bin. It runs on import         |
| `src/cli.ts`          | Parses the arguments, reads and writes the files, and prints results |
| `src/index.ts`        | The public entry. It re-exports what consumers can build on          |
| `src/parse.ts`        | Reads the sections and link references of a changelog                |
| `src/verify.ts`       | Runs the release checks on a parsed changelog                        |
| `src/notes.ts`        | Renders the section of a version as release notes                    |
| `src/release.ts`      | Prepares the changelog and the manifest for the next release         |
| `testing/fixtures.ts` | The changelogs that the specs run against                            |

Import other files with the `.ts` extension. The bundler resolves it, and `tsc` accepts it because `allowImportingTsExtensions` is on.

## Changing the code

Only `src/cli.ts` touches the file system and the console. The parser, the checks, the renderer, and the release preparation take strings and return values, so keep them free of I/O. That keeps them usable from the public API and easy to test.

The commands resolve paths from the directory that they run from. Keep it that way, because the installed bin must work on the project of the consumer.

Export a function or type from `src/index.ts` only when you want consumers to depend on it. Anything exported there is part of the public API and follows Semantic Versioning.

When you add or change a check, update these files in the same pull request.

- The check in `src/verify.ts` and its tests.
- A fixture in `testing/fixtures.ts`, when no existing one covers the situation.
- The table of checks in the README.

## Building and testing

The `build` script bundles the package with [tsdown](https://tsdown.dev) into `dist`. It writes `index.js`, `types.d.ts`, `changelog.js`, and a chunk that the two entries share. The `prepublishOnly` script runs the build and then `prepare-dist` from `@dnd-mapp/package-builder`.

Tests use Vitest. They replace `node:fs/promises` and the console with the mocks in `testing`, so no test touches the real file system. The fixtures are TypeScript strings rather than Markdown files, so the CRLF fixture keeps its line endings and markdownlint leaves them alone. Coverage must stay above the thresholds in `vitest.config.ts`. Use `pnpm test` to run the tests in watch mode with the Vitest UI.

## Checks

On top of the [shared checks](https://github.com/dnd-mapp/.github/blob/main/CONTRIBUTING.md#checks), CI runs `lint-ts`, `typecheck`, `test-ci`, and `build`. Run them yourself before you open a pull request.

```bash
pnpm run lint-ts
pnpm run typecheck
pnpm run test-ci
pnpm run build
```

The `lint-ts` script lints the code with ESLint.

## Changelog and versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Record every notable change for consumers under `[Unreleased]` in `CHANGELOG.md`, using the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

Release workflows depend on the exit codes and the output of the commands. A new check that can fail an existing changelog, a changed option, and a different notes format are breaking changes for consumers. Say so in the changelog entry.

## Releasing

1. Run the [prepare release workflow](../../.github/workflows/prepare-release.yaml) on `main` with the part of the version to bump, for example `gh workflow run prepare-release.yaml -f bump=minor`. It opens the `chore: release X.Y.Z` pull request with auto-merge on.
2. Review and approve the pull request. Once it merges, the `tag` job of the [push workflow](../../.github/workflows/push-main.yaml) creates the annotated tag `vX.Y.Z` on the merge commit.
3. The [release workflow](../../.github/workflows/release.yaml) runs the CI checks, verifies the tag and the changelog, stages the package on npm, and creates the GitHub Release, which opens a discussion in the Announcements category.
4. Find the staged version with `pnpm stage list` and approve it with `pnpm stage approve <id>` and 2FA.

If the staged version is wrong, reject it with `pnpm stage reject <id>`. The same version cannot be staged again until then.

The workflow checks the changelog with the published version of this package from the dev dependencies, not with the build of the tagged commit. A release that changes the checks is therefore verified by the previous release.
