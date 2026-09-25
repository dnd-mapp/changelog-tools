import { findLink, type Changelog, type Release } from './parse.ts';

/** What to check the changelog against. */
export interface VerifyOptions {
    /** The version to release, usually taken from the tag without the `v` prefix. */
    version: string;
    /** The `version` field of `package.json`. When it is left out, the manifest is not checked. */
    manifestVersion?: string | undefined;
    /** The name of the changelog in the messages. Defaults to `CHANGELOG.md`. */
    file?: string | undefined;
    /** The moment to check the release date against. Defaults to now. */
    now?: Date | undefined;
}

/** The outcome of {@link verifyRelease}. */
export interface Verification {
    /** Whether the release can go ahead, which is the case when there are no errors. */
    ok: boolean;
    /** The version that was checked. */
    version: string;
    /** The section of the version, or `undefined` when the changelog has none. */
    release: Release | undefined;
    /** Every problem that blocks the release, in the order of the checks. */
    errors: string[];
}

/** The SemVer 2.0.0 grammar, from https://semver.org. */
const SEMVER =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

const CHANGE_GROUP = /^### (?:Added|Changed|Deprecated|Removed|Fixed|Security)\s*$/;
const LIST_ITEM = /^[-*+] +\S/;
const COMPARE = '/compare/';
const TO_HEAD = '...HEAD';

/** Time zones run up to 14 hours ahead of UTC, so a date is only in the future once it is in the future everywhere. */
const LATEST_TIME_ZONE_OFFSET = 14 * 60 * 60 * 1000;

function isValidDate(date: string): boolean {
    const parsed = new Date(`${date}T00:00:00Z`);

    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
}

function isInTheFuture(date: string, now: Date): boolean {
    return date > new Date(now.getTime() + LATEST_TIME_ZONE_OFFSET).toISOString().slice(0, 10);
}

/** Whether a body has a Keep a Changelog group, such as `### Added`, with at least one list item under it. */
export function hasEntries(body: string): boolean {
    let inGroup = false;

    for (const line of body.split('\n')) {
        if (line.startsWith('### ')) {
            inGroup = CHANGE_GROUP.test(line);
        } else if (inGroup && LIST_ITEM.test(line)) {
            return true;
        }
    }
    return false;
}

/**
 * The base of a link that compares to HEAD, taken from the first `/compare/` part that leaves a base without whitespace.
 * It scans the link a fixed number of times, because a regex that searches for the part can take quadratic time.
 */
function compareBase(link: string): string | undefined {
    if (!link.endsWith(TO_HEAD)) {
        return undefined;
    }
    const target = link.slice(0, -TO_HEAD.length).split(/\s/).at(-1)!;
    const start = target.indexOf(COMPARE);
    const base = target.slice(start + COMPARE.length);

    return start === -1 || base === '' ? undefined : base;
}

function checkDate(release: Release, now: Date): string | undefined {
    const { version, date } = release;

    if (date === undefined) {
        return `The ${version} section has no release date`;
    }
    if (!isValidDate(date)) {
        return `The ${version} section has an invalid release date ${date}`;
    }
    if (isInTheFuture(date, now)) {
        return `The ${version} release date ${date} is in the future`;
    }
    return undefined;
}

function checkLinks(changelog: Changelog, version: string): string[] {
    const errors: string[] = [];
    const releaseLink = findLink(changelog, version);

    if (releaseLink === undefined) {
        errors.push(`Missing link reference for [${version}]`);
    } else if (!releaseLink.endsWith(`/releases/tag/v${version}`)) {
        errors.push(`Link reference for [${version}] does not point to the v${version} release`);
    }

    const unreleasedLink = findLink(changelog, 'Unreleased');

    if (unreleasedLink === undefined) {
        errors.push('Missing link reference for [Unreleased]');
        return errors;
    }
    const from = compareBase(unreleasedLink);

    if (from === undefined) {
        errors.push(`[Unreleased] link does not compare from v${version} to HEAD`);
    } else if (from !== `v${version}`) {
        errors.push(`[Unreleased] link still compares from ${from}`);
    }
    return errors;
}

/**
 * Checks that the changelog has a complete, releasable section for a version.
 *
 * The version must be valid SemVer and match the manifest. Its section must appear once, have a valid date that is
 * not in the future, list at least one change, and not be yanked. The link references must point to the tag of the
 * version, and `[Unreleased]` must compare from it. When the section is missing, the other section and link checks
 * are skipped, because they would only repeat that problem.
 *
 * @param changelog The parsed changelog.
 * @param options The version to release and what else to check.
 * @returns Every problem found. Checking never throws.
 */
export function verifyRelease(changelog: Changelog, options: VerifyOptions): Verification {
    const { version, manifestVersion, file = 'CHANGELOG.md', now = new Date() } = options;
    const errors: string[] = [];
    const result = (release: Release | undefined): Verification => ({
        ok: errors.length === 0,
        version,
        release,
        errors,
    });

    if (!SEMVER.test(version)) {
        errors.push(`${version} is not a valid SemVer version`);
        return result(undefined);
    }
    if (manifestVersion !== undefined && manifestVersion !== version) {
        errors.push(`Tag version ${version} does not match package.json version ${manifestVersion}`);
    }

    const sections = changelog.releases.filter((release) => release.version === version);
    const [release] = sections;

    if (release === undefined) {
        errors.push(`${file} has no section for ${version}. Did you merge the release PR?`);
        return result(undefined);
    }
    if (sections.length > 1) {
        errors.push(
            `${file} has ${sections.length} sections for ${version}, on lines ${sections.map((section) => section.line).join(', ')}`,
        );
    }
    if (release.yanked) {
        errors.push(`${version} is marked as yanked`);
    }

    const dateError = checkDate(release, now);

    if (dateError !== undefined) {
        errors.push(dateError);
    }
    if (!hasEntries(release.body)) {
        errors.push(`The ${version} section is empty`);
    }
    errors.push(...checkLinks(changelog, version));

    return result(release);
}
