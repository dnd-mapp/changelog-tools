#!/usr/bin/env node
/**
 * The executable behind the `changelog` bin. It runs on import and sets the exit code of the process.
 *
 * Paths are resolved from the working directory, so the installed bin works on the project of the consumer.
 */
import { run } from './cli.ts';

process.exitCode = await run(process.argv.slice(2));
