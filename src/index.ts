/**
 * Public entry point of the package.
 *
 * It exports the pieces behind the commands, which work on content instead of files. The command line itself stays
 * internal, because the `changelog` script runs on import.
 */
export { renderNotes, type NotesOptions } from './notes.ts';
export { findRelease, parseChangelog, type Changelog, type Release } from './parse.ts';
export { verifyRelease, type Verification, type VerifyOptions } from './verify.ts';
