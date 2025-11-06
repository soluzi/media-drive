#!/usr/bin/env node

/**
 * Media Drive CLI
 *
 * Command-line interface for Media Drive v2.
 * Provides utilities for initializing configuration, checking environment,
 * and managing database migrations.
 *
 * Available commands:
 * - `init`: Generate configuration file template
 * - `doctor`: Check environment and dependencies
 * - `migrate`: Display Prisma schema and migration instructions
 * - `help`: Show help message
 *
 * @example
 * ```bash
 * # Initialize configuration
 * media-drive init
 * media-drive init --path ./config
 *
 * # Check environment
 * media-drive doctor
 *
 * # Show migration instructions
 * media-drive migrate
 * ```
 */

import { initCommand } from "./commands/init";
import { doctorCommand } from "./commands/doctor";
import { migrateCommand } from "./commands/migrate";

const args = process.argv.slice(2);
const command = args[0];

/**
 * Parse command line options from arguments array.
 * Extracts `--key value` pairs into an options object.
 *
 * @param args - Array of command line arguments (excluding command name).
 * @returns Object mapping option keys to their values (or undefined if no value provided).
 *
 * @example
 * ```typescript
 * parseOptions(["--path", "./config", "--force"]);
 * // Returns: { path: "./config", force: undefined }
 * ```
 */
function parseOptions(args: string[]): Record<string, string | undefined> {
  const options: Record<string, string | undefined> = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg?.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        options[key] = value;
        i++; // Skip next arg since we used it as value
      }
    }
  }
  return options;
}

/**
 * Main CLI entry point.
 * Parses command line arguments and routes to appropriate command handler.
 * Displays help message for unknown commands or when help is requested.
 *
 * Supported commands:
 * - `init`: Initialize configuration file (optionally with --path)
 * - `doctor`: Run environment diagnostics
 * - `migrate`: Display database migration instructions
 * - `help`, `--help`, `-h`: Display help message
 * - Default: Display help message for unknown commands
 *
 * @returns Promise that resolves when command execution completes.
 * @throws Never throws, but command handlers may call process.exit().
 */
async function main(): Promise<void> {
  const options = parseOptions(args);

  switch (command) {
    case "init":
      initCommand(options["path"]);
      break;

    case "doctor":
      await doctorCommand();
      break;

    case "migrate":
      migrateCommand();
      break;

    case "help":
    case "--help":
    case "-h":
    default:
      console.log(`
Media Drive v2 CLI

Usage:
  media-drive <command> [options]

Commands:
  init         Generate media.config.ts file
  doctor       Check environment and dependencies
  migrate      Print Prisma schema and migration instructions
  help         Show this help message

Options:
  --path <dir> Specify target directory (for init command)

Examples:
  media-drive init
  media-drive init --path ./config
  media-drive doctor
  media-drive migrate
      `);
      break;
  }
}

// Execute main function and handle errors
main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
