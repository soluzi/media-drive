/**
 * CLI: Migrate Command
 *
 * Print Prisma schema and migration instructions
 */

const PRISMA_SCHEMA = `// Add this to your schema.prisma file

model Media {
  id                String    @id @default(uuid())
  model_type        String
  model_id          String
  collection_name   String    @default("default")
  name              String
  file_name         String
  mime_type         String
  disk              String
  size              Int
  manipulations     Json      @default("{}")
  custom_properties Json      @default("{}")
  responsive_images Json      @default("{}")
  order_column      Int?
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  @@index([model_type, model_id])
  @@index([model_type, model_id, collection_name])
  @@map("media")
}
`;

const SQL_MIGRATION = `-- SQL migration (if you prefer raw SQL)

CREATE TABLE media (
    id VARCHAR(36) PRIMARY KEY,
    model_type VARCHAR(255) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    collection_name VARCHAR(255) DEFAULT 'default',
    name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    disk VARCHAR(50) NOT NULL,
    size INTEGER NOT NULL,
    manipulations JSON DEFAULT '{}',
    custom_properties JSON DEFAULT '{}',
    responsive_images JSON DEFAULT '{}',
    order_column INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_model ON media(model_type, model_id);
CREATE INDEX idx_media_collection ON media(model_type, model_id, collection_name);
`;

export function migrateCommand(): void {
  console.log("📦 Media Drive Migration\n");
  console.log("=".repeat(60));
  console.log("\n📝 Prisma Schema:\n");
  console.log(PRISMA_SCHEMA);
  console.log("=".repeat(60));
  console.log("\n🗃️  SQL Migration (alternative):\n");
  console.log(SQL_MIGRATION);
  console.log("=".repeat(60));
  console.log("\n✨ Next steps:");
  console.log("1. Copy the Prisma schema above into your schema.prisma");
  console.log("2. Run: npx prisma migrate dev --name add_media_table");
  console.log("3. Run: npx prisma generate");
  console.log("\nOr use the SQL migration directly in your database.\n");
}
