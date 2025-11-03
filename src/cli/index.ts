#!/usr/bin/env node

/**
 * Media Drive CLI
 */

import { initCommand } from "./commands/init";
import { doctorCommand } from "./commands/doctor";
import { migrateCommand } from "./commands/migrate";

const args = process.argv.slice(2);
const command = args[0];

/**
 * Parse command line options
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

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
