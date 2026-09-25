import { findLink, findRelease, parseChangelog } from './parse.ts';
import { hasEntries } from './verify.ts';

/** The part of the version to increase. */
export type Bump = 'major' | 'minor' | 'patch';

/** How to prepare the release. */
export interface ReleaseOptions {
    /** The part of the latest version to increase. */
    bump: Bump;
    /** The `version` field of `package.json`, which must match the latest release. When it is left out, the manifest is not checked. */
    manifestVersion?: string | undefined;
    /** The name of the changelog in the messages. Defaults to `CHANGELOG.md`. */
    file?: string | undefined;
    /** The moment of the release, which gives the date of the heading in UTC. Defaults to now. */
    now?: Date | undefined;
}

/** The outcome of {@link prepareRelease}. */
export interface PreparedRelease {
    /** The version of the new release. */
    version: string;
    /** The content of the changelog with the new release. */
    changelog: string;
}

/** A release version without a prerelease or build part, which is the only kind that can be bumped. */
const CORE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const UNRELEASED_LINK = /^\[(unreleased)\]: /i;
const COMPARE_TO_HEAD = /^(.+)\/compare\/(\S+)\.\.\.HEAD$/;
/** A single whitespace character of JSON. It does not match the empty string past the end of the content. */
const JSON_WHITESPACE = /^[ \t\r\n]$/;

function bumpVersion(version: string, bump: Bump): string {
    const [major, minor, patch] = version.split('.').map(Number) as [number, number, number];

    switch (bump) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
            return `${major}.${minor}.${patch + 1}`;
    }
}

/**
 * Prepares the changelog for the next release.
 *
 * The next version bumps the latest release, which is the section below `[Unreleased]`. A heading for it goes directly
 * below the `[Unreleased]` heading, so the unreleased entries become its section. The `[Unreleased]` link then compares
 * from the new version, and a link to the new release goes below it. The line endings of the changelog are kept.
 *
 * @param content The content of the changelog.
 * @param options The part of the version to bump and what else to check.
 * @returns The next version and the content of the changelog with its section.
 * @throws {Error} When the changelog cannot be released as is. The message says why.
 */
export function prepareRelease(content: string, options: ReleaseOptions): PreparedRelease {
    const { bump, manifestVersion, file = 'CHANGELOG.md', now = new Date() } = options;
    const changelog = parseChangelog(content);
    const unreleased = findRelease(changelog, 'Unreleased');

    if (unreleased === undefined) {
        throw new Error(`${file} has no [Unreleased] section`);
    }
    if (changelog.releases[0] !== unreleased) {
        throw new Error(`The [Unreleased] section is not the first section of ${file}`);
    }
    if (!hasEntries(unreleased.body)) {
        throw new Error('The [Unreleased] section is empty');
    }
    const latest = changelog.releases[1];

    if (latest === undefined) {
        throw new Error(`${file} has no release to bump from`);
    }
    if (!CORE_VERSION.test(latest.version)) {
        throw new Error(`Cannot bump ${latest.version}, because it is not a MAJOR.MINOR.PATCH version`);
    }
    if (manifestVersion !== undefined && manifestVersion !== latest.version) {
        throw new Error(
            `package.json version ${manifestVersion} does not match the latest release ${latest.version} in ${file}`,
        );
    }
    const version = bumpVersion(latest.version, bump);

    if (findRelease(changelog, version) !== undefined) {
        throw new Error(`${file} already has a section for ${version}`);
    }
    if (findLink(changelog, version) !== undefined) {
        throw new Error(`${file} already has a link reference for [${version}]`);
    }
    const unreleasedLink = findLink(changelog, 'Unreleased');

    if (unreleasedLink === undefined) {
        throw new Error('Missing link reference for [Unreleased]');
    }
    const [, repository, from] = COMPARE_TO_HEAD.exec(unreleasedLink) ?? [];

    if (from !== `v${latest.version}`) {
        throw new Error(`[Unreleased] link does not compare from v${latest.version} to HEAD`);
    }
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);

    const heading = unreleased.line - 1;
    const body = lines.findIndex((line, index) => index > heading && line.trim() !== '');

    lines.splice(heading + 1, body - heading - 1, '', `## [${version}] - ${now.toISOString().slice(0, 10)}`, '');

    // The first definition wins, like in the parser. The inserted heading is no definition, so the search finds it.
    const link = lines.findIndex((line) => UNRELEASED_LINK.test(line));
    const label = UNRELEASED_LINK.exec(lines[link]!)![1]!;

    lines.splice(
        link,
        1,
        `[${label}]: ${repository}/compare/v${version}...HEAD`,
        `[${version}]: ${repository}/releases/tag/v${version}`,
    );

    return { version, changelog: lines.join(eol) };
}

/**
 * Sets the top-level `version` field of a `package.json`.
 *
 * Only the value changes, so the indentation, the order of the keys, and the line endings stay as they are. Nested
 * fields named `version`, such as the one in `devEngines`, are left alone.
 *
 * @param content The content of the manifest.
 * @param version The version to set.
 * @returns The content of the manifest with the new version.
 * @throws {Error} When the manifest is not valid JSON or has no top-level `version` string.
 */
export function setManifestVersion(content: string, version: string): string {
    let manifest: unknown;

    try {
        manifest = JSON.parse(content);
    } catch (error) {
        throw new Error('The manifest is not valid JSON', { cause: error });
    }
    if (typeof (manifest as { version?: unknown } | null)?.version !== 'string') {
        throw new Error('The manifest has no version');
    }
    // The content is valid JSON from here on, so every string is closed. JSON.parse keeps the last of repeated keys, so
    // the last top-level version key holds the string that was checked above.
    let value: { start: number; end: number } | undefined;
    let depth = 0;

    for (let index = 0; index < content.length; index++) {
        const char = content[index];

        if (char === '{' || char === '[') {
            depth++;
        } else if (char === '}' || char === ']') {
            depth--;
        } else if (char === '"') {
            const end = closingQuote(content, index) + 1;
            const next = skipWhitespace(content, end);

            if (depth === 1 && content[next] === ':' && JSON.parse(content.slice(index, end)) === 'version') {
                const start = skipWhitespace(content, next + 1);

                value = { start, end: closingQuote(content, start) + 1 };
            }
            index = end - 1;
        }
    }
    const { start, end } = value!;

    return `${content.slice(0, start)}${JSON.stringify(version)}${content.slice(end)}`;
}

/** The index of the quote that closes the JSON string that starts at the given index. */
function closingQuote(content: string, start: number): number {
    let index = start + 1;

    while (content[index] !== '"') {
        index += content[index] === '\\' ? 2 : 1;
    }
    return index;
}

/** The index of the first character from the given index on that is not JSON whitespace. */
function skipWhitespace(content: string, start: number): number {
    let index = start;

    while (JSON_WHITESPACE.test(content.charAt(index))) {
        index++;
    }
    return index;
}
