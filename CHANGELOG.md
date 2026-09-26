# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2026-09-26

### Fixed

- `changelog verify`, `changelog release`, `verifyRelease`, and `prepareRelease` read the `[Unreleased]` link in linear time. Before, a long crafted link could take quadratic time to check.

## [1.1.0] - 2026-09-25

### Added

- `changelog release --bump <major|minor|patch>` command that prepares the release commit. It bumps the latest release to the next version, moves the `[Unreleased]` entries into a section for it dated today in UTC, updates the link references, and sets `version` in `package.json`. It keeps the line endings of both files and fails without writing when the changelog cannot be released.
- `prepareRelease` and `setManifestVersion` in the public API, with the `Bump`, `ReleaseOptions`, and `PreparedRelease` types.

## [1.0.0] - 2026-09-23

### Added

- `changelog verify` command that fails unless the changelog has a complete, releasable section for a version. It checks the version against `package.json`, the section and its date and entries, and the link references.
- `changelog notes` command that prints the section of a version as release notes, or writes them to a file with `--output`. The `--with-compare-link` option appends a link that compares the previous release with this one.
- Support for changelogs with CRLF line endings.
- Public API from the package root. It exports `parseChangelog`, `findRelease`, `verifyRelease`, and `renderNotes`.
- Bundled type declarations in `types.d.ts`, including the `Changelog`, `Release`, `Verification`, `VerifyOptions`, and `NotesOptions` types.

[Unreleased]: https://github.com/dnd-mapp/changelog-tools/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/dnd-mapp/changelog-tools/releases/tag/v1.1.1
[1.1.0]: https://github.com/dnd-mapp/changelog-tools/releases/tag/v1.1.0
[1.0.0]: https://github.com/dnd-mapp/changelog-tools/releases/tag/v1.0.0
