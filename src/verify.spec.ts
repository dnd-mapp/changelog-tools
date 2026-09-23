import { describe, expect, it } from 'vitest';
import {
    crlf,
    duplicateHeadings,
    emptySection,
    missingSection,
    staleLinks,
    valid,
    yanked,
} from '../testing/fixtures.ts';
import { parseChangelog } from './parse.ts';
import { verifyRelease, type VerifyOptions } from './verify.ts';

const now = new Date('2026-09-23T12:00:00Z');

function verify(content: string, options: Partial<VerifyOptions> = {}) {
    return verifyRelease(parseChangelog(content), { version: '1.2.0', manifestVersion: '1.2.0', now, ...options });
}

describe('verifyRelease', () => {
    it('should pass a changelog that is ready for the release', () => {
        const verification = verify(valid);

        expect(verification).toMatchObject({ ok: true, version: '1.2.0', errors: [] });
        expect(verification.release).toMatchObject({ version: '1.2.0', date: '2026-09-22' });
    });

    it('should pass a changelog with CRLF line endings', () => {
        expect(verify(crlf)).toMatchObject({ ok: true, errors: [] });
    });

    it('should skip the manifest check when no manifest version is given', () => {
        expect(verify(valid, { manifestVersion: undefined })).toMatchObject({ ok: true });
    });

    it('should fail when the version does not match the manifest', () => {
        expect(verify(valid, { manifestVersion: '1.1.0' })).toMatchObject({
            ok: false,
            errors: ['Tag version 1.2.0 does not match package.json version 1.1.0'],
        });
    });

    it.each([['v1.2.0'], ['1.2'], ['01.2.0'], ['Unreleased']])('should reject %s as a version', (version) => {
        expect(verify(valid, { version, manifestVersion: version })).toEqual({
            ok: false,
            version,
            release: undefined,
            errors: [`${version} is not a valid SemVer version`],
        });
    });

    it('should accept a prerelease version', () => {
        const prerelease = valid.replaceAll('1.2.0', '1.2.0-beta.1');

        expect(verify(prerelease, { version: '1.2.0-beta.1', manifestVersion: '1.2.0-beta.1' })).toMatchObject({
            ok: true,
        });
    });

    it('should fail with a hint when the changelog has no section for the version', () => {
        expect(verify(missingSection)).toEqual({
            ok: false,
            version: '1.2.0',
            release: undefined,
            errors: ['CHANGELOG.md has no section for 1.2.0. Did you merge the release PR?'],
        });
    });

    it('should name the changelog file in the messages', () => {
        expect(verify(missingSection, { file: 'docs/CHANGES.md' }).errors).toEqual([
            'docs/CHANGES.md has no section for 1.2.0. Did you merge the release PR?',
        ]);
    });

    it('should fail when the section has no entries', () => {
        expect(verify(emptySection).errors).toEqual(['The 1.2.0 section is empty']);
    });

    it.each([
        ['entries outside a group', '- Loose entry'],
        ['a group that Keep a Changelog does not define', '### Notes\n\n- Entry'],
        ['a group with prose only', '### Added\n\nSome prose.'],
    ])('should treat a section with %s as empty', (_, body) => {
        const content = emptySection.replace('### Added\n', `${body}\n`);

        expect(verify(content).errors).toEqual(['The 1.2.0 section is empty']);
    });

    it('should fail when the link references are missing or stale', () => {
        expect(verify(staleLinks).errors).toEqual([
            'Missing link reference for [1.2.0]',
            '[Unreleased] link still compares from v1.1.0',
        ]);
    });

    it('should fail when the link reference of the version points elsewhere', () => {
        const content = valid.replace('releases/tag/v1.2.0', 'releases/tag/v1.1.0');

        expect(verify(content).errors).toEqual(['Link reference for [1.2.0] does not point to the v1.2.0 release']);
    });

    it('should fail when the [Unreleased] link reference is missing', () => {
        const content = valid.replace(/^\[Unreleased\]: .*\n/m, '');

        expect(verify(content).errors).toEqual(['Missing link reference for [Unreleased]']);
    });

    it('should fail when the [Unreleased] link does not compare to HEAD', () => {
        const content = valid.replace('compare/v1.2.0...HEAD', 'commits/main');

        expect(verify(content).errors).toEqual(['[Unreleased] link does not compare from v1.2.0 to HEAD']);
    });

    it('should fail when the release is yanked', () => {
        expect(verify(yanked).errors).toEqual(['1.2.0 is marked as yanked']);
    });

    it('should fail when the version has more than one section', () => {
        expect(verify(duplicateHeadings).errors).toEqual(['CHANGELOG.md has 2 sections for 1.2.0, on lines 9, 19']);
    });

    it('should fail when the section has no date', () => {
        const content = valid.replace('## [1.2.0] - 2026-09-22', '## [1.2.0]');

        expect(verify(content).errors).toEqual(['The 1.2.0 section has no release date']);
    });

    it('should fail when the date does not exist', () => {
        const content = valid.replace('## [1.2.0] - 2026-09-22', '## [1.2.0] - 2026-02-30');

        expect(verify(content).errors).toEqual(['The 1.2.0 section has an invalid release date 2026-02-30']);
    });

    it('should fail when the date is in the future everywhere', () => {
        const content = valid.replace('## [1.2.0] - 2026-09-22', '## [1.2.0] - 2026-09-25');

        expect(verify(content).errors).toEqual(['The 1.2.0 release date 2026-09-25 is in the future']);
    });

    it('should accept a date that is already today in a time zone ahead of UTC', () => {
        const content = valid.replace('## [1.2.0] - 2026-09-22', '## [1.2.0] - 2026-09-24');

        expect(verify(content, { now: new Date('2026-09-23T10:00:00Z') })).toMatchObject({ ok: true });
    });

    it('should report every problem at once', () => {
        expect(verify(staleLinks, { manifestVersion: '1.1.0' }).errors).toEqual([
            'Tag version 1.2.0 does not match package.json version 1.1.0',
            'Missing link reference for [1.2.0]',
            '[Unreleased] link still compares from v1.1.0',
        ]);
    });

    it('should check against the current date by default', () => {
        const content = valid.replace('## [1.2.0] - 2026-09-22', '## [1.2.0] - 9999-12-31');

        expect(verify(content, { now: undefined }).errors).toEqual([
            'The 1.2.0 release date 9999-12-31 is in the future',
        ]);
    });
});
