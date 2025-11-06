/**
 * CLI: Doctor Command
 *
 * Diagnostic tool that checks the environment and dependencies for Media Drive.
 * Verifies Node.js version, configuration files, Prisma setup, Sharp library,
 * and environment variables. Exits with error code if critical issues are found.
 *
 * Checks performed:
 * - Node.js version
 * - Configuration file (media.config.ts)
 * - Prisma schema file
 * - Sharp library installation
 * - Environment variables (S3_KEY, S3_SECRET, S3_BUCKET, REDIS_HOST)
 */

import { existsSync } from "fs";
import { join } from "path";

/**
 * Result of a diagnostic check.
 */
interface CheckResult {
  /** Name of the check being performed. */
  name: string;
  /** Status indicator: ✅ (pass), ⚠️ (warning), ❌ (error). */
  status: "✅" | "⚠️" | "❌";
  /** Status message describing the check result. */
  message: string;
}

/**
 * Run diagnostic checks on the environment and dependencies.
 * Performs various checks and displays results in a formatted output.
 * Exits with code 1 if any critical errors are found.
 *
 * @returns Promise that resolves when diagnostics are complete.
 * @throws Never throws, but may call process.exit(1) if errors are found.
 *
 * @example
 * ```bash
 * media-drive doctor
 * ```
 */
export async function doctorCommand(): Promise<void> {
  console.log("🔍 Running diagnostics...\n");

  const checks: CheckResult[] = [];

  // Check Node version
  const nodeVersion = process.version;
  checks.push({
    name: "Node.js version",
    status: "✅",
    message: nodeVersion,
  });

  // Check for config file
  const configExists = existsSync(join(process.cwd(), "media.config.ts"));
  checks.push({
    name: "media.config.ts",
    status: configExists ? "✅" : "⚠️",
    message: configExists
      ? "Found"
      : "Not found (run 'media-drive init' to create)",
  });

  // Check for Prisma
  const prismaExists = existsSync(
    join(process.cwd(), "prisma", "schema.prisma")
  );
  checks.push({
    name: "Prisma schema",
    status: prismaExists ? "✅" : "⚠️",
    message: prismaExists ? "Found" : "Not found (ensure Prisma is set up)",
  });

  // Check for Sharp
  try {
    require("sharp");
    checks.push({
      name: "Sharp library",
      status: "✅",
      message: "Installed",
    });
  } catch {
    checks.push({
      name: "Sharp library",
      status: "❌",
      message: "Not installed (run 'npm install sharp')",
    });
  }

  // Check environment variables
  const envVars = ["S3_KEY", "S3_SECRET", "S3_BUCKET", "REDIS_HOST"];
  const envStatus = envVars
    .map((v) => (process.env[v] ? `${v}=✓` : `${v}=✗`))
    .join(", ");
  checks.push({
    name: "Environment variables",
    status: "⚠️",
    message: envStatus,
  });

  // Print results
  checks.forEach((check) => {
    console.log(`${check.status} ${check.name}: ${check.message}`);
  });

  console.log("\n✨ Diagnostics complete!");

  const hasErrors = checks.some((c) => c.status === "❌");
  if (hasErrors) {
    console.log("\n⚠️  Please fix the errors above before using media-drive");
    process.exit(1);
  }
}
