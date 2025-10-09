#!/usr/bin/env node

/**
 * Media Drive CLI
 */

import { initCommand } from "./commands/init";
import { doctorCommand } from "./commands/doctor";
import { migrateCommand } from "./commands/migrate";

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  switch (command) {
    case "init":
      initCommand();
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

Examples:
  media-drive init
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
