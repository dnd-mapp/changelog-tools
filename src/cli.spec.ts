import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consoleMock } from '../testing/console.ts';
import { manifest, missingSection, notes, staleLinks, valid } from '../testing/fixtures.ts';
import { fsMock } from '../testing/fs-promises.ts';
import { run, USAGE } from './cli.ts';

const compareLink = '**Full changelog:** https://github.com/dnd-mapp/example/compare/v1.1.0...v1.2.0';

describe('run', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-23T12:00:00Z') });
        fsMock.files({ 'CHANGELOG.md': valid, 'package.json': manifest });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('verify', () => {
        it('should succeed when the changelog is ready for the release', async () => {
            await expect(run(['verify', '--version', '1.2.0'])).resolves.toBe(0);

            expect(consoleMock.entries).toEqual([
                { severity: 'log', message: 'CHANGELOG.md is ready for the 1.2.0 release' },
            ]);
        });

        it('should read the changelog and the manifest from the given paths', async () => {
            fsMock.files({ 'docs/CHANGES.md': valid, 'app/package.json': manifest });

            await expect(
                run(['verify', '--version', '1.2.0', '--file', 'docs/CHANGES.md', '--manifest', 'app/package.json']),
            ).resolves.toBe(0);

            expect(fsMock.entriesOf('readFile').map(({ path }) => path)).toEqual([
                'docs/CHANGES.md',
                'app/package.json',
            ]);
        });

        it('should print every problem and fail', async () => {
            fsMock.files({ 'CHANGELOG.md': staleLinks, 'package.json': manifest });

            await expect(run(['verify', '--version', '1.2.0'])).resolves.toBe(1);

            expect(consoleMock.entries).toEqual([
                { severity: 'error', message: 'Missing link reference for [1.2.0]' },
                { severity: 'error', message: '[Unreleased] link still compares from v1.1.0' },
            ]);
        });

        it('should compare the version with the manifest', async () => {
            fsMock.files({ 'CHANGELOG.md': missingSection, 'package.json': JSON.stringify({ version: '1.1.0' }) });

            await expect(run(['verify', '--version', '1.2.0'])).resolves.toBe(1);

            expect(consoleMock.entriesOf('error').map(({ message }) => message)).toEqual([
                'Tag version 1.2.0 does not match package.json version 1.1.0',
                'CHANGELOG.md has no section for 1.2.0. Did you merge the release PR?',
            ]);
        });

        it('should fail when the changelog cannot be read', async () => {
            fsMock.files({ 'package.json': manifest });

            await expect(run(['verify', '--version', '1.2.0'])).resolves.toBe(1);

            expect(consoleMock.entries).toEqual([
                {
                    severity: 'error',
                    message: `Failed to read "CHANGELOG.md": ENOENT: no such file or directory, open 'CHANGELOG.md'`,
                },
            ]);
        });

        it('should fail when the manifest is not valid JSON', async () => {
            fsMock.files({ 'CHANGELOG.md': valid, 'package.json': '{ "version": ' });

            await expect(run(['verify', '--version', '1.2.0'])).resolves.toBe(1);

            expect(consoleMock.entriesOf('error')[0]?.message).toMatch(/^Failed to parse "package\.json": /);
        });

        it.each([['{}'], ['null'], ['{ "version": 1 }']])(
            'should fail when the manifest %s has no version',
            async (content) => {
                fsMock.files({ 'CHANGELOG.md': valid, 'package.json': content });

                await expect(run(['verify', '--version', '1.2.0'])).resolves.toBe(1);

                expect(consoleMock.entries).toEqual([{ severity: 'error', message: '"package.json" has no version' }]);
            },
        );
    });

    describe('notes', () => {
        it('should print the release notes', async () => {
            await expect(run(['notes', '--version', '1.2.0'])).resolves.toBe(0);

            expect(consoleMock.entries).toEqual([{ severity: 'log', message: notes }]);
        });

        it('should append the compare link when asked to', async () => {
            await expect(run(['notes', '--version', '1.2.0', '--with-compare-link'])).resolves.toBe(0);

            expect(consoleMock.entries).toEqual([{ severity: 'log', message: `${notes}\n\n${compareLink}` }]);
        });

        it('should write the release notes to the output file', async () => {
            await expect(run(['notes', '--version', '1.2.0', '--output', 'release-notes.md'])).resolves.toBe(0);

            expect(fsMock.entriesOf('writeFile')).toEqual([
                { operation: 'writeFile', path: 'release-notes.md', data: `${notes}\n` },
            ]);
            expect(consoleMock.entries).toEqual([
                { severity: 'log', message: 'Wrote the 1.2.0 release notes to "release-notes.md"' },
            ]);
        });

        it('should read the changelog from the given path', async () => {
            fsMock.files({ 'docs/CHANGES.md': valid });

            await expect(run(['notes', '--version', '1.2.0', '--file', 'docs/CHANGES.md'])).resolves.toBe(0);
        });

        it('should fail when the changelog has no section for the version', async () => {
            await expect(run(['notes', '--version', '2.0.0'])).resolves.toBe(1);

            expect(consoleMock.entries).toEqual([
                { severity: 'error', message: 'CHANGELOG.md has no section for 2.0.0' },
            ]);
        });

        it('should fail for the unreleased section', async () => {
            await expect(run(['notes', '--version', 'Unreleased'])).resolves.toBe(1);

            expect(consoleMock.entries).toEqual([
                {
                    severity: 'error',
                    message: 'Cannot render notes for the Unreleased section. Pass a released version.',
                },
            ]);
        });

        it('should fail when the output file cannot be written', async () => {
            fsMock.fail('writeFile', new Error('EACCES: permission denied'));

            await expect(run(['notes', '--version', '1.2.0', '--output', 'notes.md'])).resolves.toBe(1);

            expect(consoleMock.entries).toEqual([
                { severity: 'error', message: 'Failed to write "notes.md": EACCES: permission denied' },
            ]);
        });
    });

    it.each([
        [['verify'], 'Missing the --version option'],
        [['notes', '--file', 'CHANGELOG.md'], 'Missing the --version option'],
        [['verify', '--version', '1.2.0', '--output', 'notes.md'], "Unknown option '--output'"],
        [['notes', '--version'], "Option '--version <value>' argument missing"],
        [['notes', '--version', '1.2.0', 'extra'], "Unexpected argument 'extra'"],
        [['release'], 'Unknown command "release"'],
        [[], 'Missing a command'],
    ])('should print the usage for %j', async (args, message) => {
        await expect(run(args)).resolves.toBe(1);

        expect(consoleMock.entries).toHaveLength(1);
        expect(consoleMock.entries[0]?.severity).toBe('error');
        expect(consoleMock.entries[0]?.message).toContain(message);
        expect(consoleMock.entries[0]?.message).toContain(USAGE);
        expect(fsMock.entries).toEqual([]);
    });

    it.each([['--help'], ['-h']])('should print the usage for %s', async (flag) => {
        await expect(run([flag])).resolves.toBe(0);

        expect(consoleMock.entries).toEqual([{ severity: 'log', message: USAGE }]);
    });
});
