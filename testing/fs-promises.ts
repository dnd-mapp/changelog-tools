import type { PathLike } from 'node:fs';
import type * as FsPromises from 'node:fs/promises';

/** A call to a function of `node:fs/promises`, recorded together with the operation that was performed. */
export type FsEntry =
    { operation: 'readFile'; path: string; options: unknown } | { operation: 'writeFile'; path: string; data: string };

export type FsOperation = FsEntry['operation'];

/** Decides the outcome of an operation. It returns the resolved value, or throws to make the operation reject. */
type Handler<Operation extends FsOperation> = (entry: Extract<FsEntry, { operation: Operation }>) => unknown;

const handlers: { [Operation in FsOperation]?: Handler<Operation> } = {};

/**
 * The single mock of `node:fs/promises`.
 *
 * `setup.ts` registers this module in place of the real one, so the code under test and the specs share it. Every
 * operation succeeds and resolves to `undefined` unless a spec says otherwise. Assert on {@link entries}, for example
 * `expect(fsMock.entries).toContainEqual({ operation: 'writeFile', path: 'notes.md', data: 'Notes\n' })`.
 */
export const fsMock = {
    /** Every operation that was performed since the test started, in the order they were performed. */
    entries: [] as FsEntry[],

    /** The entries of the given operation. */
    entriesOf<Operation extends FsOperation>(operation: Operation): Extract<FsEntry, { operation: Operation }>[] {
        return fsMock.entries.filter(
            (entry): entry is Extract<FsEntry, { operation: Operation }> => entry.operation === operation,
        );
    },

    /** Decides the outcome of every call to the given operation. It replaces an earlier handler. */
    respond<Operation extends FsOperation>(operation: Operation, handler: Handler<Operation>): void {
        handlers[operation] = handler as never;
    },

    /** Serves the given contents, keyed by path, to `readFile`. Reading any other path fails with `ENOENT`. */
    files(contents: Record<string, string>): void {
        fsMock.respond('readFile', ({ path }) => {
            if (Object.hasOwn(contents, path)) {
                return contents[path];
            }
            throw Object.assign(new Error(`ENOENT: no such file or directory, open '${path}'`), { code: 'ENOENT' });
        });
    },

    /** Makes the given operation reject with the error, for every call or only for the calls that match. */
    fail<Operation extends FsOperation>(
        operation: Operation,
        error: Error,
        matches: Handler<Operation> = () => true,
    ): void {
        fsMock.respond(operation, (entry) => {
            if (matches(entry)) {
                throw error;
            }
        });
    },

    /** Empties {@link entries} and restores the default outcome of every operation. */
    reset(): void {
        fsMock.entries = [];

        for (const operation of Object.keys(handlers) as FsOperation[]) {
            delete handlers[operation];
        }
    },
};

function perform(entry: FsEntry): Promise<unknown> {
    fsMock.entries.push(entry);
    const handler = handlers[entry.operation] as Handler<FsOperation> | undefined;

    // The executor turns a handler that throws into a rejection, like the real functions do.
    return new Promise((resolve) => resolve(handler?.(entry)));
}

/** Records the path of a call. The code under test passes paths, so the mock does not support file handles. */
function pathOf(path: PathLike | FsPromises.FileHandle): string {
    if (typeof path === 'string' || path instanceof URL || path instanceof Uint8Array) {
        return String(path);
    }
    throw new TypeError('The fs mock does not support file handles');
}

/** Records the data of a write. The code under test writes strings, so the mock does not support other data. */
function dataOf(data: Parameters<typeof FsPromises.writeFile>[1]): string {
    if (typeof data === 'string') {
        return data;
    }
    throw new TypeError('The fs mock only supports string data');
}

export const readFile = ((path, options) =>
    perform({ operation: 'readFile', path: pathOf(path), options })) as typeof FsPromises.readFile;

export const writeFile = ((path, data) =>
    perform({ operation: 'writeFile', path: pathOf(path), data: dataOf(data) })) as typeof FsPromises.writeFile;
