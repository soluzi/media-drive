/**
 * Migration Utility for Media Drive v3.0
 *
 * Helps migrate existing media records to store paths in the database.
 * This is required when upgrading from v2.x to v3.0, as v3.0 stores
 * file paths directly in the database for better compatibility with
 * non-deterministic path generators.
 *
 * The migration utility:
 * - Finds all media records without stored paths
 * - Generates paths using the provided path generator
 * - Updates records in batches for efficiency
 * - Supports dry-run mode for testing
 * - Provides detailed migration statistics
 */

import { PrismaClient } from "@prisma/client";
import { PathGenerator } from "../core/contracts";
import { getLogger } from "../core/logger";

const logger = getLogger();

/**
 * Options for media path migration.
 */
export interface MigrationOptions {
  /**
   * Number of records to process in each batch (default: 100).
   * Larger batches are faster but use more memory.
   */
  batchSize?: number;

  /**
   * Whether to continue processing when errors occur (default: true).
   * If false, migration stops on first error.
   */
  continueOnError?: boolean;

  /**
   * Dry run mode - don't actually update records (default: false).
   * Useful for testing migration before applying changes.
   */
  dryRun?: boolean;
}

/**
 * Result of media path migration operation.
 */
export interface MigrationResult {
  /** Total number of records found without paths. */
  total: number;
  /** Number of records successfully migrated. */
  migrated: number;
  /** Number of records that failed to migrate. */
  failed: number;
  /** Number of records skipped (already had paths). */
  skipped: number;
  /** Array of errors encountered during migration. */
  errors: Array<{ mediaId: string; error: string }>;
}

/**
 * Migrate existing media records to store paths in the database.
 *
 * This utility finds all media records without a stored path (path is null or empty)
 * and generates the path using the provided path generator. Records are processed
 * in batches for efficiency and can be run in dry-run mode for testing.
 *
 * **Important**: Use the same path generator strategy that was used when the files
 * were originally uploaded, otherwise paths may not match actual file locations.
 *
 * @param prisma - Prisma client instance for database access.
 * @param pathGenerator - Path generator to use for generating paths.
 *   Must match the strategy used when files were originally uploaded.
 * @param options - Migration options (batch size, error handling, dry-run mode).
 * @returns Promise resolving to migration result with statistics and errors.
 * @throws {Error} If migration fails and continueOnError is false.
 *
 * @example
 * ```typescript
 * import { migrateMediaPaths, DefaultPathGenerator } from "@uniflapp/node-media-library";
 *
 * // Test migration first
 * const testResult = await migrateMediaPaths(
 *   prisma,
 *   new DefaultPathGenerator(),
 *   { dryRun: true, batchSize: 50 }
 * );
 *
 * console.log(`Would migrate ${testResult.migrated} of ${testResult.total} records`);
 *
 * // Run actual migration
 * const result = await migrateMediaPaths(
 *   prisma,
 *   new DefaultPathGenerator(),
 *   { batchSize: 100, continueOnError: true }
 * );
 *
 * console.log(`Migrated ${result.migrated} of ${result.total} records`);
 * if (result.failed > 0) {
 *   console.error(`Failed: ${result.failed}`, result.errors);
 * }
 * ```
 */
export async function migrateMediaPaths(
  prisma: PrismaClient,
  pathGenerator: PathGenerator,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const { batchSize = 100, continueOnError = true, dryRun = false } = options;

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
        OR: [{ path: null }, { path: "" }],
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
        `Processing batch ${Math.floor(i / batchSize) + 1} (${
          batch.length
        } records)`
      );

      for (const media of batch) {
        try {
          // Check if path already exists (shouldn't happen, but be safe)
          if (media.path) {
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
          logger.debug(`✓ Migrated media ${media.id} -> ${pathResult.path}`);
        } catch (error) {
          result.failed++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          result.errors.push({
            mediaId: media.id,
            error: errorMessage,
          });

          logger.error(
            `✗ Failed to migrate media ${media.id}: ${errorMessage}`
          );

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
    logger.error(
      "Migration failed:",
      error instanceof Error ? { message: error.message } : {}
    );
    throw error;
  }
}

/**
 * Check migration status and statistics.
 *
 * Returns statistics about how many media records have paths stored
 * and how many still need migration. Useful for monitoring migration progress.
 *
 * @param prisma - Prisma client instance for database access.
 * @returns Promise resolving to migration status object with counts and percentage.
 *
 * @example
 * ```typescript
 * const status = await checkMigrationStatus(prisma);
 * console.log(`Migration progress: ${status.percentage.toFixed(1)}%`);
 * console.log(`${status.withPath} of ${status.total} records have paths`);
 * console.log(`${status.withoutPath} records still need migration`);
 * ```
 */
export async function checkMigrationStatus(prisma: PrismaClient): Promise<{
  /** Total number of media records in the database. */
  total: number;
  /** Number of records that have paths stored. */
  withPath: number;
  /** Number of records that still need migration (path is null or empty). */
  withoutPath: number;
  /** Percentage of records that have paths (0-100). */
  percentage: number;
}> {
  const [total, withoutPath] = await Promise.all([
    prisma.media.count(),
    prisma.media.count({
      where: {
        OR: [{ path: null }, { path: "" }],
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
