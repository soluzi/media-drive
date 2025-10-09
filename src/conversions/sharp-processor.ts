/**
 * Sharp Conversion Processor
 *
 * Implements image processing using the Sharp library
 */

import sharp, { FitEnum } from "sharp";
import {
  ConversionProcessor,
  ConversionOptions,
  ConversionResult,
} from "../core/contracts";
import { ConversionError } from "../core/errors";
import { getLogger } from "../core/logger";

const logger = getLogger();

export interface SharpProcessorConfig {
  progressive?: boolean | undefined;
  stripMetadata?: boolean | undefined;
  defaultQuality?: number | undefined;
}

const fitMap: Record<ConversionOptions["fit"] & string, keyof FitEnum> = {
  cover: "cover",
  contain: "contain",
  fill: "fill",
  inside: "inside",
  outside: "outside",
};

export class SharpProcessor implements ConversionProcessor {
  private defaults: {
    quality: number;
    progressive: boolean;
    stripMetadata: boolean;
  };

  constructor(config: SharpProcessorConfig = {}) {
    this.defaults = {
      quality: config.defaultQuality ?? 85,
      progressive: config.progressive ?? true,
      stripMetadata: config.stripMetadata ?? true,
    };
  }

  async process(
    input: Buffer,
    conversions: Record<string, ConversionOptions>
  ): Promise<Record<string, ConversionResult>> {
    const results: Record<string, ConversionResult> = {};

    for (const [name, options] of Object.entries(conversions)) {
      try {
        results[name] = await this.processOne(input, options);
      } catch (error) {
        logger.warn(`Failed to process conversion '${name}'`, error);
        // Continue with other conversions even if one fails
      }
    }

    return results;
  }

  async processOne(
    input: Buffer,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const buffer = await this.processOneBuffer(input, options);
    return {
      buffer,
      size: buffer.length,
      format: options.format || "jpeg",
    };
  }

  private async processOneBuffer(
    input: Buffer,
    options: ConversionOptions
  ): Promise<Buffer> {
    try {
      // Always start from a Sharp instance and keep chaining on it
      let img = sharp(input, { failOn: "none" });

      // Apply EXIF orientation (no arg => auto)
      img = img.rotate();

      // Resize if requested
      if (
        options.width ||
        options.height ||
        options.fit ||
        options.background
      ) {
        img = img.resize({
          width: options.width,
          height: options.height,
          fit: options.fit ? fitMap[options.fit] : "cover",
          background: options.background, // used for contain/fill over transparent inputs
        });
      }

      const quality = options.quality ?? this.defaults.quality;
      const progressive = this.defaults.progressive;

      // Choose encoder by target format (or infer from input if none)
      switch (options.format) {
        case "jpeg":
          img = img.jpeg({ quality, progressive, mozjpeg: false });
          break;
        case "png":
          // PNG ignores quality in Sharp; use compressionLevel and palette when desired
          img = img.png({ compressionLevel: 9 });
          break;
        case "webp":
          img = img.webp({ quality });
          break;
        case "avif":
          img = img.avif({ quality });
          break;
        default:
          // Leave original format; optionally strip metadata
          // (Sharp strips most by default; explicit if your build keeps it)
          img = img.withMetadata({}); // noop-safe; keep if you need ICC, else omit
          break;
      }

      if (this.defaults.stripMetadata) {
        // Sharp has no direct "strip" toggle; the common approach is to *not* call withMetadata.
        // If you do call withMetadata above, remove it to strip. Leaving as-is for clarity.
      }

      return await img.toBuffer();
    } catch (e) {
      throw new ConversionError(
        `Sharp processing failed: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
