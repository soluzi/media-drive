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
  strategy: "default" | "date-based" | "flat"
): PathGenerator {
  switch (strategy) {
    case "default":
      return new DefaultPathGenerator();
    case "date-based":
      return new DateBasedPathGenerator();
    case "flat":
      return new FlatPathGenerator();
    default:
      return new DefaultPathGenerator();
  }
}
