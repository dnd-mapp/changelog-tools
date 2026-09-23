/**
 * Changelogs for the specs, one for each situation that the commands have to handle.
 *
 * Every fixture prepares the 1.2.0 release of `dnd-mapp/example`, dated 2026-09-22.
 */

const intro = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
`;

const repository = 'https://github.com/dnd-mapp/example';

const olderReleases = `## [1.1.0] - 2026-09-01

### Changed

- Speed up the parser.

## [1.0.0] - 2026-08-01

### Added

- First release.
`;

const olderLinks = `[1.1.0]: ${repository}/releases/tag/v1.1.0
[1.0.0]: ${repository}/releases/tag/v1.0.0
`;

const section = `## [1.2.0] - 2026-09-22

### Added

- The \`notes\` command.

### Fixed

- Headings with trailing spaces.
`;

/** A changelog that is ready for the 1.2.0 release. */
export const valid = `${intro}
## [Unreleased]

${section}
${olderReleases}
[Unreleased]: ${repository}/compare/v1.2.0...HEAD
[1.2.0]: ${repository}/releases/tag/v1.2.0
${olderLinks}`;

/** The 1.2.0 entries are still under `[Unreleased]`, because the release PR was not merged. */
export const missingSection = `${intro}
## [Unreleased]

### Added

- The \`notes\` command.

${olderReleases}
[Unreleased]: ${repository}/compare/v1.1.0...HEAD
${olderLinks}`;

/** The 1.2.0 heading exists, but no group under it has an entry. */
export const emptySection = `${intro}
## [Unreleased]

## [1.2.0] - 2026-09-22

### Added

${olderReleases}
[Unreleased]: ${repository}/compare/v1.2.0...HEAD
[1.2.0]: ${repository}/releases/tag/v1.2.0
${olderLinks}`;

/** The 1.2.0 section exists, but its link reference is missing and `[Unreleased]` still compares from 1.1.0. */
export const staleLinks = `${intro}
## [Unreleased]

${section}
${olderReleases}
[Unreleased]: ${repository}/compare/v1.1.0...HEAD
${olderLinks}`;

/** The 1.2.0 release is marked as yanked. */
export const yanked = valid.replace('## [1.2.0] - 2026-09-22', '## [1.2.0] - 2026-09-22 [YANKED]');

/** The 1.2.0 heading appears twice. */
export const duplicateHeadings = valid.replace('## [1.1.0]', `${section}\n## [1.1.0]`);

/** The valid changelog with CRLF line endings, as written by an editor on Windows. */
export const crlf = valid.replaceAll('\n', '\r\n');

/** The notes that the valid changelog has for 1.2.0. */
export const notes = `### Added

- The \`notes\` command.

### Fixed

- Headings with trailing spaces.`;

export const manifest = JSON.stringify({ name: '@dnd-mapp/example', version: '1.2.0' });
