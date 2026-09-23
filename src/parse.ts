/** A section of the changelog: a release, or the `[Unreleased]` section. */
export interface Release {
    /** The text between the brackets of the heading, for example `1.2.0` or `Unreleased`. */
    version: string;
    /** The date of the heading as `YYYY-MM-DD`, or `undefined` when the heading has none. */
    date: string | undefined;
    /** Whether the heading is marked with `[YANKED]`. */
    yanked: boolean;
    /** The content of the section without the heading, with LF line endings and without leading or trailing blank lines. */
    body: string;
    /** The line number of the heading, starting at 1. */
    line: number;
}

/** The parts of a Keep a Changelog file that matter for a release. */
export interface Changelog {
    /** Every section in the order of the file, the `[Unreleased]` section included. */
    releases: Release[];
    /** The link reference definitions, keyed by their label as written. The first definition of a label wins. */
    links: Record<string, string>;
}

const RELEASE_HEADING = /^## \[(\S+)\](?: - (\d{4}-\d{2}-\d{2}))?( \[YANKED\])?\s*$/;
const LINK_REFERENCE = /^\[(\S+)\]: (\S+)/;
const UNRELEASED = 'unreleased';

/** Removes the blank lines at the start and the end, and keeps the indentation of the first line. */
function trimBlankLines(lines: string[]): string {
    const start = lines.findIndex((line) => line.trim() !== '');

    if (start === -1) {
        return '';
    }
    const end = lines.findLastIndex((line) => line.trim() !== '');

    return lines.slice(start, end + 1).join('\n');
}

/**
 * Reads the sections and link references of a changelog in the Keep a Changelog 1.1.0 format.
 *
 * A section starts at a `## [version]` heading, optionally followed by ` - YYYY-MM-DD` and ` [YANKED]`. It ends before
 * the next `## ` heading or the first link reference definition. Any other `## ` heading ends a section without
 * starting one. LF and CRLF line endings are both accepted.
 *
 * @param content The content of the changelog.
 * @returns The sections and link references. A file without any is not an error.
 */
export function parseChangelog(content: string): Changelog {
    const releases: Release[] = [];
    const links: Record<string, string> = {};
    let section: { release: Omit<Release, 'body'>; lines: string[] } | undefined;

    const close = () => {
        if (section) {
            releases.push({ ...section.release, body: trimBlankLines(section.lines) });
            section = undefined;
        }
    };

    for (const [index, line] of content.split(/\r?\n/).entries()) {
        const link = LINK_REFERENCE.exec(line);

        if (link) {
            close();
            links[link[1]!] ??= link[2]!;
        } else if (line.startsWith('## ')) {
            close();
            const heading = RELEASE_HEADING.exec(line);

            if (heading) {
                const [, version, date, yanked] = heading;
                section = {
                    release: { version: version!, date, yanked: yanked !== undefined, line: index + 1 },
                    lines: [],
                };
            }
        } else {
            section?.lines.push(line);
        }
    }
    close();

    return { releases, links };
}

/** Whether a label names the `[Unreleased]` section, which Keep a Changelog matches in any case. */
export function isUnreleased(label: string): boolean {
    return label.toLowerCase() === UNRELEASED;
}

/**
 * Finds the first section with the given version.
 *
 * @param changelog The parsed changelog.
 * @param version The version to find, or `Unreleased` in any case for the `[Unreleased]` section.
 * @returns The section, or `undefined` when the changelog has none for the version.
 */
export function findRelease(changelog: Changelog, version: string): Release | undefined {
    return changelog.releases.find((release) =>
        isUnreleased(version) ? isUnreleased(release.version) : release.version === version,
    );
}

/** Finds the target of a link reference. Labels match in any case, like they do in Markdown. */
export function findLink(changelog: Changelog, label: string): string | undefined {
    const key = Object.keys(changelog.links).find((candidate) => candidate.toLowerCase() === label.toLowerCase());

    return key === undefined ? undefined : changelog.links[key];
}
