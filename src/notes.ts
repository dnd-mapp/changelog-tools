import { findLink, findRelease, isUnreleased, type Changelog } from './parse.ts';

/** How to render the release notes. */
export interface NotesOptions {
    /**
     * Appends a `**Full changelog:**` link that compares the previous release with this one. The previous release is
     * the next section below. The first release gets no link, because there is nothing to compare with.
     */
    compareLink?: boolean | undefined;
    /** The name of the changelog in the messages. Defaults to `CHANGELOG.md`. */
    file?: string | undefined;
}

const RELEASE_LINK = /^(.+)\/releases\/tag\/[^/]+$/;
const COMPARE_LINK = /^(.+)\/compare\/[^/]+$/;

/** Takes the repository URL from the link reference of the version, or else from the `[Unreleased]` link. */
function repositoryUrl(changelog: Changelog, version: string): string | undefined {
    return (
        RELEASE_LINK.exec(findLink(changelog, version) ?? '')?.[1] ??
        COMPARE_LINK.exec(findLink(changelog, 'Unreleased') ?? '')?.[1]
    );
}

/**
 * Renders the section of a version as the body of a GitHub Release.
 *
 * The body is the section without its heading. Its `###` group headings are kept, so GitHub shows them as headings.
 *
 * @param changelog The parsed changelog.
 * @param version The version to render.
 * @param options Whether to append a compare link.
 * @returns The notes, without a trailing newline.
 * @throws {Error} When the version is `Unreleased`, the changelog has no section for it, or no link can build the compare link.
 */
export function renderNotes(changelog: Changelog, version: string, options: NotesOptions = {}): string {
    const { compareLink = false, file = 'CHANGELOG.md' } = options;
    const release = findRelease(changelog, version);

    if (isUnreleased(version)) {
        throw new Error('Cannot render notes for the Unreleased section. Pass a released version.');
    }
    if (release === undefined) {
        throw new Error(`${file} has no section for ${version}`);
    }
    const index = changelog.releases.indexOf(release);
    const previous = changelog.releases[index + 1];

    if (!compareLink || previous === undefined) {
        return release.body;
    }
    const repository = repositoryUrl(changelog, version);

    if (repository === undefined) {
        throw new Error(`Cannot build the compare link, because no link reference in ${file} points to the repository`);
    }
    const link = `**Full changelog:** ${repository}/compare/v${previous.version}...v${version}`;

    return release.body === '' ? link : `${release.body}\n\n${link}`;
}
