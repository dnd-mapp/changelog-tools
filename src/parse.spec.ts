import { describe, expect, it } from 'vitest';
import { crlf, notes, valid, yanked } from '../testing/fixtures.ts';
import { findLink, findRelease, isUnreleased, parseChangelog } from './parse.ts';

describe('parseChangelog', () => {
    it('should read every section in the order of the file', () => {
        const { releases } = parseChangelog(valid);

        expect(releases.map(({ version, date, yanked, line }) => ({ version, date, yanked, line }))).toEqual([
            { version: 'Unreleased', date: undefined, yanked: false, line: 7 },
            { version: '1.2.0', date: '2026-09-22', yanked: false, line: 9 },
            { version: '1.1.0', date: '2026-09-01', yanked: false, line: 19 },
            { version: '1.0.0', date: '2026-08-01', yanked: false, line: 25 },
        ]);
    });

    it('should keep the body without the heading and the surrounding blank lines', () => {
        const { releases } = parseChangelog(valid);

        expect(releases[1]?.body).toBe(notes);
        expect(releases[0]?.body).toBe('');
    });

    it('should end the last section before the first link reference', () => {
        const { releases } = parseChangelog(valid);

        expect(releases.at(-1)?.body).toBe('### Added\n\n- First release.');
    });

    it('should read the link references by label', () => {
        const { links } = parseChangelog(valid);

        expect(links).toEqual({
            'Unreleased': 'https://github.com/dnd-mapp/example/compare/v1.2.0...HEAD',
            '1.2.0': 'https://github.com/dnd-mapp/example/releases/tag/v1.2.0',
            '1.1.0': 'https://github.com/dnd-mapp/example/releases/tag/v1.1.0',
            '1.0.0': 'https://github.com/dnd-mapp/example/releases/tag/v1.0.0',
        });
    });

    it('should keep the first definition of a link reference', () => {
        const { links } = parseChangelog('[1.0.0]: https://first\n[1.0.0]: https://second\n');

        expect(links).toEqual({ '1.0.0': 'https://first' });
    });

    it('should read a changelog with CRLF line endings like one with LF line endings', () => {
        expect(parseChangelog(crlf)).toEqual(parseChangelog(valid));
    });

    it('should mark a yanked release', () => {
        const release = parseChangelog(yanked).releases[1];

        expect(release).toMatchObject({ version: '1.2.0', date: '2026-09-22', yanked: true });
    });

    it('should accept trailing whitespace after a heading', () => {
        const { releases } = parseChangelog('## [1.0.0] - 2026-08-01  \n\n- Entry\n');

        expect(releases).toEqual([{ version: '1.0.0', date: '2026-08-01', yanked: false, body: '- Entry', line: 1 }]);
    });

    it('should end a section at a heading that is not a release, without starting a new one', () => {
        const { releases } = parseChangelog('## [1.0.0] - 2026-08-01\n\n- Entry\n\n## Notes\n\n- Not an entry\n');

        expect(releases).toEqual([{ version: '1.0.0', date: '2026-08-01', yanked: false, body: '- Entry', line: 1 }]);
    });

    it.each([
        ['## 1.0.0 - 2026-08-01'],
        ['## [1.0.0] 2026-08-01'],
        ['## [1.0.0] - 26-08-01'],
        ['### [1.0.0] - 2026-08-01'],
    ])('should not read %s as a release heading', (heading) => {
        expect(parseChangelog(`${heading}\n\n- Entry\n`).releases).toEqual([]);
    });

    it('should return no sections and no links for an empty file', () => {
        expect(parseChangelog('')).toEqual({ releases: [], links: {} });
    });
});

describe('findRelease', () => {
    const changelog = parseChangelog(valid);

    it('should find a release by its version', () => {
        expect(findRelease(changelog, '1.1.0')).toMatchObject({ version: '1.1.0', date: '2026-09-01' });
    });

    it('should find the unreleased section in any case', () => {
        expect(findRelease(changelog, 'UNRELEASED')).toMatchObject({ version: 'Unreleased' });
    });

    it('should return undefined when there is no section for the version', () => {
        expect(findRelease(changelog, '2.0.0')).toBeUndefined();
    });

    it('should return the first section when a version appears twice', () => {
        const duplicated = parseChangelog(
            '## [1.0.0] - 2026-08-02\n\n- Second\n\n## [1.0.0] - 2026-08-01\n\n- First\n',
        );

        expect(findRelease(duplicated, '1.0.0')).toMatchObject({ date: '2026-08-02' });
    });
});

describe('findLink', () => {
    const changelog = parseChangelog(valid);

    it('should find a link reference in any case', () => {
        expect(findLink(changelog, 'unreleased')).toBe('https://github.com/dnd-mapp/example/compare/v1.2.0...HEAD');
    });

    it('should return undefined when there is no link reference for the label', () => {
        expect(findLink(changelog, '2.0.0')).toBeUndefined();
    });
});

describe('isUnreleased', () => {
    it.each([
        ['Unreleased', true],
        ['unreleased', true],
        ['1.0.0', false],
    ])('should tell whether %j is the unreleased section', (label, expected) => {
        expect(isUnreleased(label)).toBe(expected);
    });
});
