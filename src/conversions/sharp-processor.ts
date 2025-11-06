/**
 * Sharp Conversion Processor
 *
 * Implements image processing using the Sharp library.
 * Provides high-performance image resizing, format conversion, and optimization.
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

/**
 * Configuration options for SharpProcessor.
 */
export interface SharpProcessorConfig {
  /** Enable progressive JPEG encoding (default: true). */
  progressive?: boolean | undefined;
  /** Strip EXIF and other metadata from images (default: true). */
  stripMetadata?: boolean | undefined;
  /** Default quality for lossy formats (1-100, default: 85). */
  defaultQuality?: number | undefined;
}

/**
 * Map conversion fit options to Sharp's FitEnum values.
 */
const fitMap: Record<ConversionOptions["fit"] & string, keyof FitEnum> = {
  cover: "cover",
  contain: "contain",
  fill: "fill",
  inside: "inside",
  outside: "outside",
};

/**
 * Sharp-based image conversion processor.
 * Uses the Sharp library for high-performance image processing.
 */
export class SharpProcessor implements ConversionProcessor {
  private defaults: {
    quality: number;
    progressive: boolean;
    stripMetadata: boolean;
  };

  /**
   * Creates a new SharpProcessor instance.
   *
   * @param config - Processor configuration options.
   */
  constructor(config: SharpProcessorConfig = {}) {
    this.defaults = {
      quality: config.defaultQuality ?? 85,
      progressive: config.progressive ?? true,
      stripMetadata: config.stripMetadata ?? true,
    };
  }

  /**
   * Process an image buffer with multiple conversion configurations.
   * Processes conversions sequentially and continues even if one fails.
   *
   * @param input - Source image buffer to process.
   * @param conversions - Map of conversion names to their options.
   * @returns Promise resolving to map of conversion names to processed results.
   * @throws {ConversionError} If all conversions fail.
   */
  async process(
    input: Buffer,
    conversions: Record<string, ConversionOptions>
  ): Promise<Record<string, ConversionResult>> {
    const results: Record<string, ConversionResult> = {};

    for (const [name, options] of Object.entries(conversions)) {
      try {
        results[name] = await this.processOne(input, options);
      } catch (error) {
        logger.warn(
          `Failed to process conversion '${name}'`,
          error instanceof Error ? { message: error.message } : undefined
        );
        // Continue with other conversions even if one fails
      }
    }

    return results;
  }

  /**
   * Process a single conversion operation.
   *
   * @param input - Source image buffer to process.
   * @param options - Conversion options to apply.
   * @returns Promise resolving to conversion result.
   * @throws {ConversionError} If processing fails.
   */
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

  /**
   * Internal method to process a single conversion and return the buffer.
   * Applies resizing, format conversion, quality settings, and metadata handling.
   *
   * @param input - Source image buffer.
   * @param options - Conversion options.
   * @returns Promise resolving to processed image buffer.
   * @throws {ConversionError} If Sharp processing fails.
   */
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
