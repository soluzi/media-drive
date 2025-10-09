/**
 * Conversion Processor Contract
 *
 * Defines the interface for image/media processing engines (Sharp, ImageMagick, etc.)
 */

export type Fit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface ConversionOptions {
  width?: number | undefined;
  height?: number | undefined;
  fit?: Fit | undefined;
  quality?: number | undefined;
  background?: string | undefined;
  format?: "jpeg" | "png" | "webp" | "avif" | undefined;
}

export interface ConversionResult {
  buffer: Buffer;
  size: number;
  format: string;
}

export interface ConversionProcessor {
  /**
   * Process an image buffer with multiple conversion configurations
   *
   * @param input - Source image buffer
   * @param conversions - Map of conversion names to their options
   * @returns Map of conversion names to processed buffers
   */
  process(
    input: Buffer,
    conversions: Record<string, ConversionOptions>
  ): Promise<Record<string, ConversionResult>>;

  /**
   * Process a single conversion
   */
  processOne(
    input: Buffer,
    options: ConversionOptions
  ): Promise<ConversionResult>;
}
