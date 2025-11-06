/**
 * Conversion Processor Contract
 *
 * Defines the interface for image/media processing engines (Sharp, ImageMagick, etc.)
 * Implementations handle image resizing, format conversion, and quality optimization.
 */

/**
 * Image fit/resize strategy for maintaining aspect ratio.
 */
export type Fit = "cover" | "contain" | "fill" | "inside" | "outside";

/**
 * Options for image conversion operations.
 */
export interface ConversionOptions {
  /** Target width in pixels. */
  width?: number | undefined;
  /** Target height in pixels. */
  height?: number | undefined;
  /** Resize strategy when aspect ratio differs from target dimensions. */
  fit?: Fit | undefined;
  /** Image quality (1-100) for lossy formats like JPEG. */
  quality?: number | undefined;
  /** Background color for transparent images or padding (hex or CSS color). */
  background?: string | undefined;
  /** Target output format. If not specified, preserves original format. */
  format?: "jpeg" | "png" | "webp" | "avif" | undefined;
}

/**
 * Result of an image conversion operation.
 */
export interface ConversionResult {
  /** Processed image buffer. */
  buffer: Buffer;
  /** Size of the processed image in bytes. */
  size: number;
  /** Output format (e.g., "jpeg", "png", "webp"). */
  format: string;
}

/**
 * Conversion processor interface for image processing operations.
 * Implementations handle resizing, format conversion, and optimization.
 */
export interface ConversionProcessor {
  /**
   * Process an image buffer with multiple conversion configurations.
   * Processes all conversions in parallel for efficiency.
   *
   * @param input - Source image buffer to process.
   * @param conversions - Map of conversion names to their options.
   * @returns Promise resolving to map of conversion names to processed results.
   * @throws {ConversionError} If processing fails.
   */
  process(
    input: Buffer,
    conversions: Record<string, ConversionOptions>
  ): Promise<Record<string, ConversionResult>>;

  /**
   * Process a single conversion operation.
   * Useful for processing one conversion at a time.
   *
   * @param input - Source image buffer to process.
   * @param options - Conversion options to apply.
   * @returns Promise resolving to conversion result.
   * @throws {ConversionError} If processing fails.
   */
  processOne(
    input: Buffer,
    options: ConversionOptions
  ): Promise<ConversionResult>;
}
