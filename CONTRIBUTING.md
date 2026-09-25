# Contributing

Thank you for your interest in contributing to `@dnd-mapp/changelog-tools`.

This package decides whether a release may go ahead and writes the notes of every GitHub Release. A mistake here can block a release or publish wrong notes, so please keep changes small and deliberate.

## Before you start

Open an [issue](https://github.com/dnd-mapp/changelog-tools/issues) to discuss any change beyond a typo fix before you send a pull request. This avoids work on changes that do not fit the goals of the package.

## Development setup

The required Node and pnpm versions are set in `devEngines` in `package.json`. They are enforced through `engineStrict`, so installing with other versions fails.

Install the dependencies with:

```bash
pnpm install
```

Dependency versions live in the catalogs in `pnpm-workspace.yaml`, which uses `catalogMode: strict`. Add or bump versions there and reference them in `package.json`. Use `catalog:` for the default catalog and a named catalog such as `catalog:vitest` for a group of tools.

Newly published releases are held back for three days through `minimumReleaseAge`. You may need to wait before you can bump to a very recent version.

Install [actionlint](https://github.com/rhysd/actionlint) to lint the workflows locally, for example with `brew install actionlint`. CI runs the version that `.github/actions/ci/action.yaml` pins.

## Git hooks

[Lefthook](https://lefthook.dev/) installs the Git hooks when you run `pnpm install`. The hooks are defined in `lefthook.yaml`. `pnpm-workspace.yaml` turns off the side-effects cache of pnpm, because a cached build of lefthook skips the script that installs the hooks. If the hooks are still missing, install them with `pnpm exec lefthook install`.

| Hook         | Runs                                           | On                        |
|:-------------|:-----------------------------------------------|:--------------------------|
| `pre-commit` | Prettier, markdownlint-cli2, and ESLint checks | The staged files          |
| `commit-msg` | commitlint                                     | The message of the commit |

The pre-commit hooks only check files. Run `pnpm run format` to fix formatting issues, and `pnpm exec eslint --fix` to apply the fixes that ESLint can make. Stage the result.

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

Tests use Vitest. They replace `node:fs/promises` and the console with the mocks in `testing`, so no test touches the real file system. The fixtures are TypeScript strings rather than Markdown files, so the CRLF fixture keeps its line endings and markdownlint leaves them alone. Coverage must stay above the thresholds in `vitest.config.ts`.

Check and format the repository with these commands. CI runs `format-check`, `lint-md`, `lint-ts`, `typecheck`, `test-ci`, `build`, and actionlint. Run them yourself before you open a pull request.

```bash
pnpm run format-check
pnpm run format
pnpm run lint-md
pnpm run lint-ts
pnpm run typecheck
pnpm run test-ci
pnpm run build
actionlint
```

The `lint-md` script lints the Markdown files with markdownlint, and the `lint-ts` script lints the code with ESLint. Use `pnpm test` to run the tests in watch mode with the Vitest UI.

## Changelog and versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Record every notable change for consumers under `[Unreleased]` in `CHANGELOG.md`, using the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

Release workflows depend on the exit codes and the output of the commands. A new check that can fail an existing changelog, a changed option, and a different notes format are breaking changes for consumers. Say so in the changelog entry.

## Releasing

1. Open a pull request with a single `chore: release X.Y.Z` commit. It sets `version` in `package.json`, renames `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`, adds a fresh `[Unreleased]`, and updates the link references.
2. Merge it, then create an annotated tag `vX.Y.Z` on the merge commit and push the tag.
3. The [release workflow](.github/workflows/release.yaml) runs the CI checks, verifies the tag and the changelog, stages the package on npm, and creates the GitHub Release.
4. Find the staged version with `pnpm stage list` and approve it with `pnpm stage approve <id>` and 2FA.

If the staged version is wrong, reject it with `pnpm stage reject <id>`. The same version cannot be staged again until then.

The workflow checks the changelog with the published version of this package from the dev dependencies, not with the build of the tagged commit. A release that changes the checks is therefore verified by the previous release.

## Code style

Follow the rules in `.editorconfig`.

- Use UTF-8 and LF line endings.
- Indent with 4 spaces, or 2 spaces in `package.json` and `pnpm-*.yaml`.
- End every file with a newline and trim trailing whitespace.

Follow these rules for prose, including Markdown files.

- Never hard wrap prose. Write each paragraph or list item on a single line.
- Use US spelling, for example "color" and "behavior".
- Keep every sentence at or under 40 words.
- Pretty print Markdown tables so the columns line up, with alignment markers on every separator line.

## Branches

Create a branch from `main` for each change. Name it `<type>/<short-description>` in lowercase with hyphens between words, for example `feat/check-release-date` or `fix/crlf-headings`.

Use the same types as for commits.

## Commits

Write commit messages that follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

```text
<type>(<optional scope>): <description>
```

Use one of these types.

| Type       | Use for                                            |
|:-----------|:---------------------------------------------------|
| `feat`     | A new command, option, check, or export            |
| `fix`      | A correction to existing behavior                  |
| `docs`     | Changes to documentation only                      |
| `refactor` | Changes that do not alter the behavior of the tool |
| `test`     | Changes to tests only                              |
| `build`    | Changes to packaging, dependencies, or tooling     |
| `chore`    | Other maintenance that does not fit above          |

Write the description in the imperative mood, such as "check the release date". Mark a breaking change with `!` after the type or scope, and add a `BREAKING CHANGE:` footer that explains what consumers must do.

## Pull requests

- Keep each pull request to one change.
- Link the issue it addresses.
- Update the changelog and README in the same pull request.
- Use a title that follows the commit convention.
- If you have write access, turn on auto-merge once the pull request is open, with `gh pr merge <number> --auto --merge` or the "Enable auto-merge" button. It then merges as soon as it is approved and the checks pass.
- If auto-merge is off, the author merges the pull request once it is approved and the checks pass. A maintainer merges pull requests opened by a contributor without write access.
- Renovate merges its own minor and patch pull requests once the checks pass. A maintainer approves a major update from Renovate and turns on auto-merge for it.
- Update the branch when it falls behind `main`, because auto-merge waits until the branch is up to date. The update dismisses the approval, so the pull request needs a new review.

## License

By contributing, you agree that your contributions are licensed under the [MIT license](LICENSE).
