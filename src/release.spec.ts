import { describe, expect, it } from 'vitest';
import {
    crlf,
    firstRelease,
    missingUnreleasedLink,
    noUnreleasedSection,
    prereleaseLatest,
    releaseAboveUnreleased,
    staleUnreleasedLink,
    strayNextLink,
    strayNextSection,
    unreleased,
    unreleasedManifest,
    valid,
} from '../testing/fixtures.ts';
import { parseChangelog } from './parse.ts';
import { prepareRelease, setManifestVersion, type ReleaseOptions } from './release.ts';
import { verifyRelease } from './verify.ts';

const now = new Date('2026-09-22T12:00:00Z');

function prepare(content: string, options: Partial<ReleaseOptions> = {}) {
    return prepareRelease(content, { bump: 'minor', manifestVersion: '1.1.0', now, ...options });
}

describe('prepareRelease', () => {
    it('should move the unreleased entries into a section for the next version', () => {
        expect(prepare(unreleased)).toEqual({ version: '1.2.0', changelog: valid });
    });

    it('should keep CRLF line endings', () => {
        expect(prepare(unreleased.replaceAll('\n', '\r\n'))).toEqual({ version: '1.2.0', changelog: crlf });
    });

    it.each([
        ['major', '2.0.0'],
        ['minor', '1.2.0'],
        ['patch', '1.1.1'],
    ] as const)('should bump the %s version of the latest release to %s', (bump, version) => {
        const { changelog, ...release } = prepare(unreleased, { bump });

        expect(release.version).toBe(version);
        expect(changelog).toContain(`## [Unreleased]\n\n## [${version}] - 2026-09-22\n\n### Added\n`);
        expect(changelog).toContain(
            [
                `[Unreleased]: https://github.com/dnd-mapp/example/compare/v${version}...HEAD`,
                `[${version}]: https://github.com/dnd-mapp/example/releases/tag/v${version}`,
                '[1.1.0]: https://github.com/dnd-mapp/example/releases/tag/v1.1.0',
            ].join('\n'),
        );
    });

    it('should date the release in UTC', () => {
        const { changelog } = prepare(unreleased, { now: new Date('2026-09-22T23:30:00-02:00') });

        expect(changelog).toContain('## [1.2.0] - 2026-09-23\n');
    });

    it('should fail when the changelog has no [Unreleased] section', () => {
        expect(() => prepare(noUnreleasedSection)).toThrow(new Error('CHANGELOG.md has no [Unreleased] section'));
    });

    it('should name the changelog file in the messages', () => {
        expect(() => prepare(noUnreleasedSection, { file: 'docs/CHANGES.md' })).toThrow(
            new Error('docs/CHANGES.md has no [Unreleased] section'),
        );
    });

    it('should fail when a release sits above the [Unreleased] section', () => {
        expect(() => prepare(releaseAboveUnreleased)).toThrow(
            new Error('The [Unreleased] section is not the first section of CHANGELOG.md'),
        );
    });

    it('should fail when the [Unreleased] section has no entries', () => {
        expect(() => prepare(valid, { manifestVersion: '1.2.0' })).toThrow(
            new Error('The [Unreleased] section is empty'),
        );
    });

    it('should fail when there is no earlier release to bump', () => {
        expect(() => prepare(firstRelease)).toThrow(new Error('CHANGELOG.md has no release to bump from'));
    });

    it('should fail when the latest release is a prerelease', () => {
        expect(() => prepare(prereleaseLatest, { manifestVersion: '1.1.0-beta.1' })).toThrow(
            new Error('Cannot bump 1.1.0-beta.1, because it is not a MAJOR.MINOR.PATCH version'),
        );
    });

    it('should fail when the manifest does not match the latest release', () => {
        expect(() => prepare(unreleased, { manifestVersion: '1.0.0' })).toThrow(
            new Error('package.json version 1.0.0 does not match the latest release 1.1.0 in CHANGELOG.md'),
        );
    });

    it('should skip the manifest check when no manifest version is given', () => {
        expect(prepare(unreleased, { manifestVersion: undefined }).version).toBe('1.2.0');
    });

    it('should fail when the changelog already has a section for the next version', () => {
        expect(() => prepare(strayNextSection)).toThrow(new Error('CHANGELOG.md already has a section for 1.2.0'));
    });

    it('should fail when the changelog already has a link reference for the next version', () => {
        expect(() => prepare(strayNextLink)).toThrow(
            new Error('CHANGELOG.md already has a link reference for [1.2.0]'),
        );
    });

    it('should fail when the [Unreleased] link reference is missing', () => {
        expect(() => prepare(missingUnreleasedLink)).toThrow(new Error('Missing link reference for [Unreleased]'));
    });

    it.each([
        ['a stale', staleUnreleasedLink],
        ['a malformed', unreleased.replace('compare/v1.1.0...HEAD', 'tree/main')],
    ])('should fail for %s [Unreleased] link', (_, content) => {
        expect(() => prepare(content)).toThrow(new Error('[Unreleased] link does not compare from v1.1.0 to HEAD'));
    });

    it('should keep the case of the [Unreleased] label', () => {
        const content = unreleased.replace('[Unreleased]:', '[unreleased]:');

        expect(prepare(content).changelog).toContain(
            '[unreleased]: https://github.com/dnd-mapp/example/compare/v1.2.0...HEAD\n',
        );
    });

    it('should give a changelog that passes the release checks', () => {
        const { version, changelog } = prepare(unreleased);

        expect(verifyRelease(parseChangelog(changelog), { version, manifestVersion: version, now })).toMatchObject({
            ok: true,
            errors: [],
        });
    });
});

describe('setManifestVersion', () => {
    it('should set the top-level version and keep the rest of the manifest as it is', () => {
        expect(setManifestVersion(unreleasedManifest, '1.2.0')).toBe(
            unreleasedManifest.replace('"version": "1.1.0"', '"version": "1.2.0"'),
        );
    });

    it('should keep CRLF line endings', () => {
        const crlfManifest = unreleasedManifest.replaceAll('\n', '\r\n');

        expect(setManifestVersion(crlfManifest, '1.2.0')).toBe(
            crlfManifest.replace('"version": "1.1.0"', '"version": "1.2.0"'),
        );
    });

    it('should set the last top-level version when the key is repeated, like JSON.parse reads it', () => {
        expect(setManifestVersion('{ "version": 1, "version": "1.1.0" }', '1.2.0')).toBe(
            '{ "version": 1, "version": "1.2.0" }',
        );
    });

    it('should find a top-level version key that is written with an escape', () => {
        expect(setManifestVersion('{ "versio\\u006e": "1.1.0" }', '1.2.0')).toBe('{ "versio\\u006e": "1.2.0" }');
    });

    it.each([['{}'], ['null'], ['{ "version": 1 }'], ['{ "engines": { "version": "1.0.0" } }']])(
        'should fail when the manifest %s has no top-level version',
        (content) => {
            expect(() => setManifestVersion(content, '1.2.0')).toThrow(new Error('The manifest has no version'));
        },
    );

    it.each([
        ['an unterminated manifest', '{ "version": "1.1.0"'],
        ['an unterminated string of escaped quotes', `"${'\\"'.repeat(50_000)}`],
    ])('should fail for %s', (_, content) => {
        expect(() => setManifestVersion(content, '1.2.0')).toThrow(new Error('The manifest is not valid JSON'));
    });
});
