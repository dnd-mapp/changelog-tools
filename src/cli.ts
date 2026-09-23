import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { renderNotes } from './notes.ts';
import { parseChangelog, type Changelog } from './parse.ts';
import { verifyRelease } from './verify.ts';

export const USAGE = `Usage:
  changelog verify --version <version> [--file CHANGELOG.md] [--manifest package.json]
  changelog notes --version <version> [--file CHANGELOG.md] [--output <file>] [--with-compare-link]

Commands:
  verify  Fails unless the changelog has a complete, releasable section for the version
  notes   Prints the section of the version as release notes`;

/** A mistake in the command line. It is reported together with the usage. */
class UsageError extends Error {}

function isParseArgsError(error: unknown): error is Error {
    return error instanceof TypeError && 'code' in error && String(error.code).startsWith('ERR_PARSE_ARGS_');
}

async function read(path: string): Promise<string> {
    try {
        return await readFile(path, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to read "${path}"`, { cause: error });
    }
}

async function readChangelog(path: string): Promise<Changelog> {
    return parseChangelog(await read(path));
}

async function readManifestVersion(path: string): Promise<string> {
    const content = await read(path);
    let manifest: unknown;

    try {
        manifest = JSON.parse(content);
    } catch (error) {
        throw new Error(`Failed to parse "${path}"`, { cause: error });
    }
    const version = (manifest as { version?: unknown } | null)?.version;

    if (typeof version !== 'string') {
        throw new Error(`"${path}" has no version`);
    }
    return version;
}

function requireVersion(version: string | undefined): string {
    if (version === undefined) {
        throw new UsageError('Missing the --version option');
    }
    return version;
}

async function verify(args: string[]): Promise<number> {
    const { values } = parseArgs({
        args,
        options: {
            version: { type: 'string' },
            file: { type: 'string', default: 'CHANGELOG.md' },
            manifest: { type: 'string', default: 'package.json' },
        },
    });
    const version = requireVersion(values.version);
    const changelog = await readChangelog(values.file);
    const manifestVersion = await readManifestVersion(values.manifest);
    const verification = verifyRelease(changelog, { version, manifestVersion, file: values.file });

    for (const error of verification.errors) {
        console.error(error);
    }
    if (!verification.ok) {
        return 1;
    }
    console.log(`${values.file} is ready for the ${version} release`);
    return 0;
}

async function notes(args: string[]): Promise<number> {
    const { values } = parseArgs({
        args,
        options: {
            'version': { type: 'string' },
            'file': { type: 'string', default: 'CHANGELOG.md' },
            'output': { type: 'string' },
            'with-compare-link': { type: 'boolean', default: false },
        },
    });
    const version = requireVersion(values.version);
    const changelog = await readChangelog(values.file);
    const rendered = renderNotes(changelog, version, {
        compareLink: values['with-compare-link'],
        file: values.file,
    });

    if (values.output === undefined) {
        console.log(rendered);
        return 0;
    }
    try {
        await writeFile(values.output, `${rendered}\n`);
    } catch (error) {
        throw new Error(`Failed to write "${values.output}"`, { cause: error });
    }
    console.log(`Wrote the ${version} release notes to "${values.output}"`);
    return 0;
}

/** The message of an error, followed by the message of its cause, so a failed read also says why it failed. */
function formatError(error: Error): string {
    return error.cause instanceof Error ? `${error.message}: ${error.cause.message}` : error.message;
}

/**
 * Runs the `changelog` command.
 *
 * Problems are written to the console, so it never throws for a mistake in the command line or the files.
 *
 * @param args The arguments after the executable, for example `['verify', '--version', '1.2.0']`.
 * @returns The exit code: `0` on success and `1` on any failure.
 */
export async function run(args: string[]): Promise<number> {
    const [command, ...rest] = args;

    try {
        switch (command) {
            case 'verify':
                return await verify(rest);
            case 'notes':
                return await notes(rest);
            case '--help':
            case '-h':
                console.log(USAGE);
                return 0;
            default:
                throw new UsageError(command === undefined ? 'Missing a command' : `Unknown command "${command}"`);
        }
    } catch (error) {
        if (error instanceof UsageError || isParseArgsError(error)) {
            console.error(`${error.message}\n\n${USAGE}`);
        } else {
            console.error(formatError(error as Error));
        }
        return 1;
    }
}
