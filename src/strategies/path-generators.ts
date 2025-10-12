/**
 * Path Generation Strategies
 */

import { PathGenerator, PathContext, PathResult } from "../core/contracts";
import { getBaseName } from "../core/utils";

/**
 * Default path generator
 * Format: {modelType}/{modelId}/{collection}/{fileName}
 */
export class DefaultPathGenerator implements PathGenerator {
  generate(ctx: PathContext): PathResult {
    const directory = `${ctx.modelType}/${ctx.modelId}/${ctx.collection}`;
    const path = `${directory}/${ctx.fileName}`;

    return {
      path,
      directory,
      fileName: ctx.fileName,
    };
  }

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
 * Simple path generator using mediaId
 * Format: {mediaId}/{fileName}
 */
export class SimplePathGenerator implements PathGenerator {
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

  private generateUUID(): string {
    // Simple UUID v4 generator that works in all environments
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

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
 * Date-based path generator
 * Format: {modelType}/{YYYY}/{MM}/{DD}/{fileName}
 */
export class DateBasedPathGenerator implements PathGenerator {
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
 * Flat path generator
 * Format: {fileName} (all files in root)
 */
export class FlatPathGenerator implements PathGenerator {
  generate(ctx: PathContext): PathResult {
    return {
      path: ctx.fileName,
      directory: "",
      fileName: ctx.fileName,
    };
  }

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
 * Factory to create path generators
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
