#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Setup Prisma schema with media tables
 * This script is run automatically when media-drive is installed
 */

function findPrismaSchemaFile(startPath) {
  const possiblePaths = [
    path.join(startPath, "prisma", "schema.prisma"),
    path.join(startPath, "schema.prisma"),
  ];

  for (const schemaPath of possiblePaths) {
    if (fs.existsSync(schemaPath)) {
      return schemaPath;
    }
  }

  return null;
}

function addMediaModelToSchema(schemaPath) {
  console.log(`📝 Adding media model to ${schemaPath}`);

  const schemaContent = fs.readFileSync(schemaPath, "utf8");

  // Check if media model already exists
  if (schemaContent.includes("model Media")) {
    console.log("✅ Media model already exists in schema");
    return;
  }

  // Media model definition
  const mediaModel = `
// Media model from media-drive
model Media {
    id                String   @id @default(cuid())
    model_type        String
    model_id          String
    collection_name   String   @default("default")
    name              String
    file_name         String
    mime_type         String
    disk              String   @default("local")
    size              Int
    manipulations     Json?
    custom_properties Json?
    responsive_images Json?
    order_column      Int?
    created_at        DateTime @default(now())
    updated_at        DateTime @updatedAt

    @@index([model_type, model_id])
    @@index([model_type, model_id, collection_name])
    @@index([disk])
    @@map("media")
}
`;

  // Add media model to schema
  const updatedSchema = schemaContent + mediaModel;
  fs.writeFileSync(schemaPath, updatedSchema);

  console.log("✅ Media model added to Prisma schema");
}

function ensurePrismaClientGenerated() {
  console.log("🔧 Generating Prisma client...");

  try {
    execSync("npx prisma generate", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ Prisma client generated successfully");
  } catch (error) {
    console.warn("⚠️  Failed to generate Prisma client automatically");
    console.warn('Please run "npx prisma generate" manually');
  }
}

function main() {
  console.log("🚀 Setting up media-drive...");

  // Find the project root (where package.json exists)
  let currentDir = process.cwd();
  let projectRoot = null;

  // Walk up directories to find package.json
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      projectRoot = currentDir;
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  if (!projectRoot) {
    console.error("❌ Could not find project root with package.json");
    process.exit(1);
  }

  console.log(`📁 Found project at: ${projectRoot}`);

  // Find and update Prisma schema
  const schemaPath = findPrismaSchemaFile(projectRoot);

  if (schemaPath) {
    addMediaModelToSchema(schemaPath);
    ensurePrismaClientGenerated();
  } else {
    console.log("📝 No Prisma schema found. Creating basic schema...");

    // Create prisma directory if it doesn't exist
    const prismaDir = path.join(projectRoot, "prisma");
    if (!fs.existsSync(prismaDir)) {
      fs.mkdirSync(prismaDir, { recursive: true });
    }

    // Create basic schema.prisma
    const schemaPath = path.join(prismaDir, "schema.prisma");
    const basicSchema = `generator client {
    provider = "prisma-client-js"
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

// Media model from media-drive
model Media {
    id                String   @id @default(cuid())
    model_type        String
    model_id          String
    collection_name   String   @default("default")
    name              String
    file_name         String
    mime_type         String
    disk              String   @default("local")
    size              Int
    manipulations     Json?
    custom_properties Json?
    responsive_images Json?
    order_column      Int?
    created_at        DateTime @default(now())
    updated_at        DateTime @updatedAt

    @@index([model_type, model_id])
    @@index([model_type, model_id, collection_name])
    @@index([disk])
    @@map("media")
}
`;

    fs.writeFileSync(schemaPath, basicSchema);
    console.log("✅ Created basic Prisma schema with media model");

    ensurePrismaClientGenerated();
  }

  console.log("🎉 Setup complete! Remember to:");
  console.log("   1. Set your DATABASE_URL in .env file");
  console.log(
    '   2. Run "npx prisma migrate dev" to create the database tables'
  );
  console.log('   3. Run "npx prisma generate" if needed');
}

// Only run if this script is executed directly (not required)
if (require.main === module) {
  main();
}

module.exports = { main };
