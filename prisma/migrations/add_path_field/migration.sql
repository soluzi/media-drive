-- Add path field to media table
-- This field stores the generated file path from the path generator
-- Supports non-deterministic path generators (e.g., UUID-based paths)

-- AlterTable
ALTER TABLE "media" ADD COLUMN "path" TEXT;

-- CreateIndex
CREATE INDEX "media_path_idx" ON "media"("path");

-- BackfillData
-- Note: Existing records will have null paths
-- Run the migration utility to populate paths for existing records

