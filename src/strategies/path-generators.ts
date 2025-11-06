/**
 * Path Generation Strategies
 *
 * Provides implementations of path generation strategies.
 * Each strategy determines how files are organized in storage.
 */

import { PathGenerator, PathContext, PathResult } from "../core/contracts";
import { getBaseName } from "../core/utils";

/**
 * Default path generator strategy.
 * Format: `{modelType}/{modelId}/{collection}/{fileName}`
 * Example: "User/123/avatars/photo.jpg"
 */
export class DefaultPathGenerator implements PathGenerator {
  /**
   * Generate a path using model type, ID, and collection.
   *
   * @param ctx - Path context with model and file information.
   * @returns Path result with full path, directory, and filename.
   */
  generate(ctx: PathContext): PathResult {
    const directory = `${ctx.modelType}/${ctx.modelId}/${ctx.collection}`;
    const path = `${directory}/${ctx.fileName}`;

    return {
      path,
      directory,
      fileName: ctx.fileName,
    };
  }

  /**
   * Generate a conversion path in a conversions subdirectory.
   *
   * @param ctx - Path context with model and file information.
   * @param conversionName - Name of the conversion (e.g., "thumb").
   * @returns Path result for the conversion file.
   */
  generateConversion(ctx: PathContext, conversionName: string): PathResult {
    const directory = `${ctx.modelType}/${ctx.modelId}/${ctx.collection}/conversions`;
    const ext = ctx.fileName.substring(ctx.fileName.lastIndexOf("."));
    const base = getBaseName(ctx.fileName);
    const fileName = `${base}-${conversionName}${ext}`;
    const path = `${directory}/${fileName}`;

    return {
      path,
      directory,
      fileName,
    };
  }
}

/**
 * Simple path generator using mediaId.
 * Format: `{mediaId}/{fileName}`
 * Example: "8e197ba4-25db-4234-8ec9-4013a521679f/photo.jpg"
 * Generates a UUID as the mediaId which is also used as the database ID.
 */
export class SimplePathGenerator implements PathGenerator {
  /**
   * Generate a simple path using a generated UUID as mediaId.
   *
   * @param ctx - Path context with model and file information.
   * @returns Path result with generated mediaId.
   */
  generate(ctx: PathContext): PathResult {
    // For simple paths, we use a UUID as mediaId
    // This UUID will be used as the database ID as well
    const mediaId = this.generateUUID();
    const path = `${mediaId}/${ctx.fileName}`;

    return {
      path,
      directory: mediaId,
      fileName: ctx.fileName,
      mediaId, // Include the generated mediaId in the result
    };
  }

  /**
   * Generate a UUID v4-like string.
   * Simple implementation that works in all environments.
   *
   * @returns UUID string in format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   */
  private generateUUID(): string {
    // Simple UUID v4 generator that works in all environments
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate a conversion path using the mediaId.
   * Uses mediaId from context if available, otherwise falls back to modelId.
   *
   * @param ctx - Path context with model and file information.
   * @param conversionName - Name of the conversion (e.g., "thumb").
   * @returns Path result for the conversion file.
   */
  generateConversion(ctx: PathContext, conversionName: string): PathResult {
    // For conversions, we need the mediaId from the original path
    const mediaId =
      "mediaId" in ctx
        ? (ctx as PathContext & { mediaId: string }).mediaId
        : ctx.modelId;
    const ext = ctx.fileName.substring(ctx.fileName.lastIndexOf("."));
    const base = getBaseName(ctx.fileName);
    const fileName = `${base}-${conversionName}${ext}`;
    const path = `${mediaId}/${fileName}`;

    return {
      path,
      directory: mediaId,
      fileName,
    };
  }
}

/**
 * Date-based path generator strategy.
 * Format: `{modelType}/{YYYY}/{MM}/{DD}/{fileName}`
 * Example: "User/2024/01/15/photo.jpg"
 * Organizes files by upload date for easier management.
 */
export class DateBasedPathGenerator implements PathGenerator {
  /**
   * Generate a path using model type and current date.
   *
   * @param ctx - Path context with model and file information.
   * @returns Path result organized by date.
   */
  generate(ctx: PathContext): PathResult {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const directory = `${ctx.modelType}/${year}/${month}/${day}`;
    const path = `${directory}/${ctx.fileName}`;

    return {
      path,
      directory,
      fileName: ctx.fileName,
    };
  }

  /**
   * Generate a conversion path organized by date.
   *
   * @param ctx - Path context with model and file information.
   * @param conversionName - Name of the conversion (e.g., "thumb").
   * @returns Path result for the conversion file.
   */
  generateConversion(ctx: PathContext, conversionName: string): PathResult {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const directory = `${ctx.modelType}/${year}/${month}/${day}/conversions`;
    const ext = ctx.fileName.substring(ctx.fileName.lastIndexOf("."));
    const base = getBaseName(ctx.fileName);
    const fileName = `${base}-${conversionName}${ext}`;
    const path = `${directory}/${fileName}`;

    return {
      path,
      directory,
      fileName,
    };
  }
}

/**
 * Flat path generator strategy.
 * Format: `{fileName}` (all files stored in root, no subdirectories)
 * Example: "photo.jpg"
 * Useful for simple setups where directory organization isn't needed.
 */
export class FlatPathGenerator implements PathGenerator {
  /**
   * Generate a flat path with no subdirectories.
   *
   * @param ctx - Path context with model and file information.
   * @returns Path result with filename only.
   */
  generate(ctx: PathContext): PathResult {
    return {
      path: ctx.fileName,
      directory: "",
      fileName: ctx.fileName,
    };
  }

  /**
   * Generate a conversion path with no subdirectories.
   *
   * @param ctx - Path context with model and file information.
   * @param conversionName - Name of the conversion (e.g., "thumb").
   * @returns Path result for the conversion file.
   */
  generateConversion(ctx: PathContext, conversionName: string): PathResult {
    const ext = ctx.fileName.substring(ctx.fileName.lastIndexOf("."));
    const base = getBaseName(ctx.fileName);
    const fileName = `${base}-${conversionName}${ext}`;

    return {
      path: fileName,
      directory: "",
      fileName,
    };
  }
}

/**
 * Factory function to create path generator instances based on strategy name.
 *
 * @param strategy - Path generation strategy: "default", "date-based", "flat", or "simple".
 * @returns PathGenerator instance for the specified strategy.
 * @default Returns DefaultPathGenerator if strategy is unknown.
 */
export function createPathGenerator(
  strategy: "default" | "date-based" | "flat" | "simple"
): PathGenerator {
  switch (strategy) {
    case "default":
      return new DefaultPathGenerator();
    case "date-based":
      return new DateBasedPathGenerator();
    case "flat":
      return new FlatPathGenerator();
    case "simple":
      return new SimplePathGenerator();
    default:
      return new DefaultPathGenerator();
  }
}
