import { describe, expect, it } from 'vitest';
import { crlf, notes, valid } from '../testing/fixtures.ts';
import { renderNotes } from './notes.ts';
import { parseChangelog } from './parse.ts';

const compareLink = '**Full changelog:** https://github.com/dnd-mapp/example/compare/v1.1.0...v1.2.0';

describe('renderNotes', () => {
    it('should render the section body with its group headings', () => {
        expect(renderNotes(parseChangelog(valid), '1.2.0')).toBe(notes);
    });

    it('should render LF line endings for a changelog with CRLF line endings', () => {
        expect(renderNotes(parseChangelog(crlf), '1.2.0')).toBe(notes);
    });

    it('should append a compare link to the previous release', () => {
        expect(renderNotes(parseChangelog(valid), '1.2.0', { compareLink: true })).toBe(`${notes}\n\n${compareLink}`);
    });

    it('should take the repository from the [Unreleased] link when the version has no link reference', () => {
        const content = valid.replace(/^\[1\.2\.0\]: .*\n/m, '');

        expect(renderNotes(parseChangelog(content), '1.2.0', { compareLink: true })).toBe(`${notes}\n\n${compareLink}`);
    });

    it('should render only the compare link for a section without a body', () => {
        const content =
            '## [1.1.0] - 2026-09-02\n\n## [1.0.0] - 2026-09-01\n\n[1.1.0]: https://github.com/o/r/releases/tag/v1.1.0\n';

        expect(renderNotes(parseChangelog(content), '1.1.0', { compareLink: true })).toBe(
            '**Full changelog:** https://github.com/o/r/compare/v1.0.0...v1.1.0',
        );
    });

    it('should not append a compare link to the first release', () => {
        expect(renderNotes(parseChangelog(valid), '1.0.0', { compareLink: true })).toBe(
            '### Added\n\n- First release.',
        );
    });

    it('should fail when no link reference points to the repository', () => {
        const content = valid.replace(/^\[(Unreleased|1\.2\.0)\]: .*\n/gm, '');

        expect(() => renderNotes(parseChangelog(content), '1.2.0', { compareLink: true })).toThrow(
            'Cannot build the compare link, because no link reference in CHANGELOG.md points to the repository',
        );
    });

    it('should fail when the changelog has no section for the version', () => {
        expect(() => renderNotes(parseChangelog(valid), '2.0.0', { file: 'CHANGES.md' })).toThrow(
            'CHANGES.md has no section for 2.0.0',
        );
    });

    it('should not render the unreleased section', () => {
        expect(() => renderNotes(parseChangelog(valid), 'Unreleased')).toThrow(
            'CHANGELOG.md has no section for Unreleased',
        );
    });
});
