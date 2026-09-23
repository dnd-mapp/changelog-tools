# @dnd-mapp/changelog-tools

[![push main](https://github.com/dnd-mapp/changelog-tools/actions/workflows/push-main.yaml/badge.svg?branch=main)](https://github.com/dnd-mapp/changelog-tools/actions/workflows/push-main.yaml)
[![npm version](https://img.shields.io/npm/v/@dnd-mapp/changelog-tools)](https://www.npmjs.com/package/@dnd-mapp/changelog-tools)
[![license](https://img.shields.io/npm/l/@dnd-mapp/changelog-tools)](LICENSE)

Verifies a [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) file before a release and extracts the release notes for a version.

Run `changelog verify` before you publish, so a release never goes out with a missing, empty, or stale changelog section. Run `changelog notes` to get the body of the GitHub Release from the same section.

## Requirements

- Node.js 24.21 or a later 24.x release, matching the `engines` field.
- A changelog in the Keep a Changelog 1.1.0 format, with a link reference for every release.

## Installation

```bash
pnpm add --save-dev @dnd-mapp/changelog-tools
```

## Usage

Both commands read `CHANGELOG.md` from the current working directory, unless you pass `--file`. They exit with code `0` on success and `1` on any failure.

### Verifying a release

```bash
changelog verify --version 1.2.0 [--file CHANGELOG.md] [--manifest package.json]
```

The command fails unless the changelog has a complete, releasable section for the version. It prints every problem it finds, one per line.

| Check                                                                                     | Message on failure                                                     |
|:------------------------------------------------------------------------------------------|:-----------------------------------------------------------------------|
| The version is valid SemVer                                                               | `1.2 is not a valid SemVer version`                                    |
| The version equals the `version` field of the manifest                                    | `Tag version 1.2.0 does not match package.json version 1.1.0`          |
| A `## [1.2.0]` section exists                                                             | `CHANGELOG.md has no section for 1.2.0. Did you merge the release PR?` |
| The section exists only once                                                              | `CHANGELOG.md has 2 sections for 1.2.0, on lines 9, 19`                |
| The section is not marked `[YANKED]`                                                      | `1.2.0 is marked as yanked`                                            |
| The heading has a date                                                                    | `The 1.2.0 section has no release date`                                |
| The date exists in the calendar                                                           | `The 1.2.0 section has an invalid release date 2026-02-30`             |
| The date is not in the future                                                             | `The 1.2.0 release date 2026-10-01 is in the future`                   |
| An `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security` group has an entry | `The 1.2.0 section is empty`                                           |
| A `[1.2.0]` link reference exists                                                         | `Missing link reference for [1.2.0]`                                   |
| The `[1.2.0]` link points to the `v1.2.0` release                                         | `Link reference for [1.2.0] does not point to the v1.2.0 release`      |
| An `[Unreleased]` link reference exists                                                   | `Missing link reference for [Unreleased]`                              |
| The `[Unreleased]` link compares from `v1.2.0` to `HEAD`                                  | `[Unreleased] link still compares from v1.1.0`                         |

When the section is missing, the command skips the other section and link checks, because they would only repeat that problem.

A date counts as in the future only when it has not started in any time zone yet. That way a release dated in Europe just after midnight still passes on a CI runner that uses UTC.

### Printing the release notes

```bash
changelog notes --version 1.2.0 [--file CHANGELOG.md] [--output release-notes.md] [--with-compare-link]
```

The command prints the section of the version without its heading. It keeps the `###` group headings, so GitHub shows them as headings. Leading and trailing blank lines are removed, and CRLF line endings become LF.

| Option                | Description                                                                           |
|:----------------------|:--------------------------------------------------------------------------------------|
| `--output <file>`     | Writes the notes to the file instead of printing them                                 |
| `--with-compare-link` | Appends a `**Full changelog:**` link that compares the previous release with this one |

The previous release is the next section below the version. The repository URL comes from the link reference of the version, or else from the `[Unreleased]` link. The first release in a changelog gets no compare link.

### In a release workflow

Run both commands before anything is published, and use the notes file as the body of the GitHub Release.

```bash
changelog verify --version "${GITHUB_REF_NAME#v}"
changelog notes --version "${GITHUB_REF_NAME#v}" --output release-notes.md
gh release create "$GITHUB_REF_NAME" --verify-tag --notes-file release-notes.md
```

## Parsing rules

A section starts at a heading that matches `^## \[(\S+)\](?: - (\d{4}-\d{2}-\d{2}))?( \[YANKED\])?\s*$`. It ends before the next level 2 heading or the first link reference definition, such as `[1.2.0]: https://github.com/owner/repo/releases/tag/v1.2.0`.

The `[Unreleased]` section matches in any case, like link reference labels do in Markdown. The first definition of a link reference wins.

## Programmatic API

The package also exports the functions behind the commands. They work on the content of the changelog, not on files, and importing the package does not run anything.

```js
import { readFile } from 'node:fs/promises';
import { parseChangelog, renderNotes, verifyRelease } from '@dnd-mapp/changelog-tools';

const changelog = parseChangelog(await readFile('CHANGELOG.md', 'utf-8'));
const verification = verifyRelease(changelog, { version: '1.2.0', manifestVersion: '1.2.0' });

if (verification.ok) {
    console.log(renderNotes(changelog, '1.2.0', { compareLink: true }));
}
```

| Export           | Description                                                               |
|:-----------------|:--------------------------------------------------------------------------|
| `parseChangelog` | Reads the sections and link references of a changelog                     |
| `findRelease`    | Finds the first section of a version, or `Unreleased`                     |
| `verifyRelease`  | Runs the checks of `changelog verify` and returns every problem found     |
| `renderNotes`    | Renders the section of a version as release notes, like `changelog notes` |

The `Changelog`, `Release`, `Verification`, `VerifyOptions`, and `NotesOptions` types are exported as well.

## Changelog

Notable changes for consumers of this package are listed in the [changelog](CHANGELOG.md).

## Contributing

Contributions are welcome. See the [contributing guide](CONTRIBUTING.md) for details.

## License

[MIT](LICENSE) © D&D Mapp
