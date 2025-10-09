/**
 * CLI: Doctor Command
 *
 * Check environment and dependencies
 */

import { existsSync } from "fs";
import { join } from "path";

interface CheckResult {
  name: string;
  status: "✅" | "⚠️" | "❌";
  message: string;
}

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
    status: "ℹ️" as any,
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
