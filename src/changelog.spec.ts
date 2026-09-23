import { afterEach, describe, expect, it, vi } from 'vitest';
import { consoleMock } from '../testing/console.ts';
import { manifest, valid } from '../testing/fixtures.ts';
import { fsMock } from '../testing/fs-promises.ts';

let runs = 0;

/**
 * The script runs as soon as it is imported, so every test imports it again under a new query string. Its
 * dependencies stay cached, which keeps the shared mocks in place.
 */
async function runScript(...args: string[]) {
    vi.spyOn(process, 'argv', 'get').mockReturnValue(['node', 'changelog', ...args]);
    await import(/* @vite-ignore */ `./changelog.ts?run=${++runs}`);
}

describe('changelog', () => {
    afterEach(() => {
        process.exitCode = undefined;
    });

    it('should run the command from the process arguments and set the exit code', async () => {
        fsMock.files({ 'CHANGELOG.md': valid, 'package.json': manifest });

        await runScript('notes', '--version', '1.0.0');

        expect(process.exitCode).toBe(0);
        expect(consoleMock.entries).toEqual([{ severity: 'log', message: '### Added\n\n- First release.' }]);
    });

    it('should set a failing exit code when the command fails', async () => {
        await runScript('release');

        expect(process.exitCode).toBe(1);
    });
});
