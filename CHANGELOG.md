# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `changelog verify` command that fails unless the changelog has a complete, releasable section for a version. It checks the version against `package.json`, the section and its date and entries, and the link references.
- `changelog notes` command that prints the section of a version as release notes, or writes them to a file with `--output`. The `--with-compare-link` option appends a link that compares the previous release with this one.
- Support for changelogs with CRLF line endings.
- Public API from the package root. It exports `parseChangelog`, `findRelease`, `verifyRelease`, and `renderNotes`.
- Bundled type declarations in `types.d.ts`, including the `Changelog`, `Release`, `Verification`, `VerifyOptions`, and `NotesOptions` types.

[Unreleased]: https://github.com/dnd-mapp/changelog-tools/commits/main
