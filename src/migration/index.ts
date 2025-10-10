/**
 * Migration Utility for Media Drive v3.0
 * 
 * Helps migrate existing media records to store paths in the database.
 * This is required when upgrading from v2.x to v3.0.
 */

import { PrismaClient } from "@prisma/client";
import { PathGenerator } from "../core/contracts";
import { getLogger } from "../core/logger";

const logger = getLogger();

export interface MigrationOptions {
  /**
   * Batch size for processing records
   */
  batchSize?: number;
  
  /**
   * Whether to continue on errors
   */
  continueOnError?: boolean;
  
  /**
   * Dry run mode (don't actually update records)
   */
  dryRun?: boolean;
}

export interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ mediaId: string; error: string }>;
}

/**
 * Migrate existing media records to store paths
 * 
 * This utility finds all media records without a stored path and generates
 * the path using the provided path generator.
 * 
 * @param prisma - Prisma client instance
 * @param pathGenerator - Path generator to use for generating paths
 * @param options - Migration options
 * @returns Migration result statistics
 * 
 * @example
 * ```typescript
 * import { migrateMediaPaths } from "media-drive/migration";
 * import { DefaultPathGenerator } from "media-drive/strategies";
 * 
 * const result = await migrateMediaPaths(
 *   prisma,
 *   new DefaultPathGenerator(),
 *   { dryRun: true } // Test first
 * );
 * 
 * console.log(`Migrated ${result.migrated} of ${result.total} records`);
 * ```
 */
export async function migrateMediaPaths(
  prisma: PrismaClient,
  pathGenerator: PathGenerator,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const {
    batchSize = 100,
    continueOnError = true,
    dryRun = false,
  } = options;

  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  logger.info("Starting media path migration...");
  if (dryRun) {
    logger.info("DRY RUN MODE - No changes will be made");
  }

  try {
    // Find all media records without a path
    const mediasWithoutPath = await prisma.media.findMany({
      where: {
        OR: [
          { path: null as any },
          { path: "" },
        ],
      },
      orderBy: {
        created_at: "asc",
      },
    });

    result.total = mediasWithoutPath.length;
    logger.info(`Found ${result.total} media records without paths`);

    if (result.total === 0) {
      logger.info("No records to migrate");
      return result;
    }

    // Process in batches
    for (let i = 0; i < mediasWithoutPath.length; i += batchSize) {
      const batch = mediasWithoutPath.slice(i, i + batchSize);
      logger.info(
        `Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`
      );

      for (const media of batch) {
        try {
          // Check if path already exists (shouldn't happen, but be safe)
          if ((media as any).path) {
            result.skipped++;
            logger.debug(`Skipping media ${media.id} - path already exists`);
            continue;
          }

          // Generate path using the path generator
          const pathResult = pathGenerator.generate({
            modelType: media.model_type,
            modelId: media.model_id,
            collection: media.collection_name,
            originalName: media.file_name,
            fileName: media.file_name,
          });

          // Update the record
          if (!dryRun) {
            await prisma.media.update({
              where: { id: media.id },
              data: { path: pathResult.path },
            });
          }

          result.migrated++;
          logger.debug(
            `✓ Migrated media ${media.id} -> ${pathResult.path}`
          );
        } catch (error) {
          result.failed++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          
          result.errors.push({
            mediaId: media.id,
            error: errorMessage,
          });

          logger.error(`✗ Failed to migrate media ${media.id}: ${errorMessage}`);

          if (!continueOnError) {
            throw error;
          }
        }
      }
    }

    // Log summary
    logger.info("Migration complete!");
    logger.info(`Total records: ${result.total}`);
    logger.info(`Migrated: ${result.migrated}`);
    logger.info(`Failed: ${result.failed}`);
    logger.info(`Skipped: ${result.skipped}`);

    if (result.failed > 0) {
      logger.warn(`${result.failed} records failed to migrate`);
      logger.warn("Failed records:");
      result.errors.forEach(({ mediaId, error }) => {
        logger.warn(`  - ${mediaId}: ${error}`);
      });
    }

    return result;
  } catch (error) {
    logger.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Check migration status
 * 
 * Returns statistics about how many records need migration
 * 
 * @param prisma - Prisma client instance
 * @returns Object with counts of records with and without paths
 */
export async function checkMigrationStatus(
  prisma: PrismaClient
): Promise<{
  total: number;
  withPath: number;
  withoutPath: number;
  percentage: number;
}> {
  const [total, withoutPath] = await Promise.all([
    prisma.media.count(),
    prisma.media.count({
      where: {
        OR: [
          { path: null as any },
          { path: "" },
        ],
      },
    }),
  ]);

  const withPath = total - withoutPath;
  const percentage = total > 0 ? (withPath / total) * 100 : 100;

  return {
    total,
    withPath,
    withoutPath,
    percentage,
  };
}

