-- Add path field to media table
-- This field stores the generated file path from the path generator
-- Supports non-deterministic path generators (e.g., UUID-based paths)
-- Field is nullable for backward compatibility with v2 (existing records)

-- AlterTable
ALTER TABLE "media" ADD COLUMN "path" TEXT NULL;

-- CreateIndex (handles NULL values)
CREATE INDEX "media_path_idx" ON "media"("path") WHERE "path" IS NOT NULL;

-- BackfillData
-- Note: Existing records will have NULL paths (v2 backward compatible)
-- Run the migration utility to populate paths for existing records
-- New uploads will automatically populate this field

