/**
 * Shared Types and Interfaces
 *
 * This file contains domain-specific types used across the media library.
 * For implementation contracts, see src/core/contracts/
 */

import { Prisma } from "@prisma/client";
import { Request } from "express";
import { ConversionOptions } from "./core/contracts";

// ==================== Media Types ====================

/**
 * Media record representing a file attachment in the database.
 * Maps to the Prisma Media model schema.
 */
export interface MediaRecord {
  /** Unique media record identifier (UUID). */
  id: string;
  /** Storage path where the file is stored (null if not yet stored). */
  path: string | null;
  /** Model type this media belongs to (e.g., "User", "Post"). */
  model_type: string;
  /** Model instance ID this media belongs to. */
  model_id: string;
  /** Collection name for grouping related media. */
  collection_name: string;
  /** Display name for the media. */
  name: string;
  /** Original filename. */
  file_name: string;
  /** MIME type of the file (e.g., "image/jpeg"). */
  mime_type: string;
  /** Storage disk name where the file is stored. */
  disk: string;
  /** File size in bytes. */
  size: number;
  /** Image conversion configurations (JSON). */
  manipulations: Prisma.JsonValue;
  /** Custom properties/metadata (JSON). */
  custom_properties: Prisma.JsonValue;
  /** Responsive image variants (JSON). */
  responsive_images: Prisma.JsonValue;
  /** Order column for sorting (nullable). */
  order_column: number | null;
  /** Creation timestamp. */
  created_at: Date;
  /** Last update timestamp. */
  updated_at: Date;
}

/**
 * Options for attaching a file to a model.
 */
export interface AttachFileOptions {
  /** Collection name to group the media. */
  collection?: string | undefined;
  /** Display name for the media. */
  name?: string | undefined;
  /** Storage disk to use (overrides default disk). */
  disk?: string | undefined;
  /** Image conversion configurations (e.g., { thumb: { width: 200 } }). */
  conversions?: Record<string, ConversionOptions> | undefined;
  /** Custom properties/metadata to store with the media. */
  customProperties?: Record<string, Prisma.JsonValue> | undefined;
}

/**
 * Options for attaching a file from a URL.
 * Extends AttachFileOptions with URL-specific options.
 */
export interface AttachFromUrlOptions extends AttachFileOptions {
  /** HTTP headers to include when fetching the URL. */
  headers?: Record<string, string> | undefined;
  /** Request timeout in milliseconds. */
  timeout?: number | undefined;
}

/**
 * Conversion job data structure.
 */
export interface ConversionJob {
  /** Media record ID to process. */
  mediaId: string;
  /** Conversion name (e.g., "thumb", "large"). */
  conversion: string;
  /** Conversion options (width, height, quality, etc.). */
  options: ConversionOptions;
}

// ==================== Storage Config Types ====================

/**
 * Local filesystem storage configuration.
 */
export interface LocalConfig {
  /** Root directory where files are stored. */
  root: string;
  /** Public base URL for serving files. */
  public_base_url: string;
}

/**
 * Amazon S3 storage configuration.
 */
export interface S3Config {
  /** AWS access key ID. */
  key: string;
  /** AWS secret access key. */
  secret: string;
  /** AWS region (e.g., "us-east-1"). */
  region: string;
  /** S3 bucket name. */
  bucket: string;
  /** Optional root prefix for all files. */
  root?: string | undefined;
  /** Optional custom S3 URL (for CloudFront, etc.). */
  url?: string | undefined;
  /** Optional custom S3 endpoint (for S3-compatible services). */
  endpoint?: string | undefined;
  /** Use path-style endpoint instead of virtual-hosted-style. */
  use_path_style_endpoint?: boolean | undefined;
}

/**
 * BunnyCDN storage configuration.
 */
export interface BunnyCDNConfig {
  /** BunnyCDN storage zone name. */
  storage_zone: string;
  /** BunnyCDN API key. */
  api_key: string;
  /** BunnyCDN pull zone URL. */
  pull_zone: string;
  /** Optional root prefix for all files. */
  root?: string | undefined;
  /** Optional region (e.g., "de", "ny"). */
  region?: string | undefined;
}

// ==================== HTTP Types ====================

/**
 * Media library service interface.
 * Defines the core operations for managing media files.
 */
export interface MediaLibraryService {
  /**
   * Attach a file to a model instance.
   *
   * @param modelType - Model type (e.g., "User", "Post").
   * @param modelId - Model instance ID.
   * @param file - Multer file object from Express request.
   * @param options - Optional attachment options.
   * @returns Promise resolving to created media record.
   */
  attachFile(
    modelType: string,
    modelId: string,
    file: Express.Multer.File,
    options?: AttachFileOptions | undefined
  ): Promise<MediaRecord>;

  /**
   * Attach a file from a remote URL.
   *
   * @param modelType - Model type (e.g., "User", "Post").
   * @param modelId - Model instance ID.
   * @param url - Remote URL to download file from.
   * @param options - Optional attachment options.
   * @returns Promise resolving to created media record.
   */
  attachFromUrl(
    modelType: string,
    modelId: string,
    url: string,
    options?: AttachFromUrlOptions | undefined
  ): Promise<MediaRecord>;

  /**
   * List all media files for a model instance.
   *
   * @param modelType - Model type (e.g., "User", "Post").
   * @param modelId - Model instance ID.
   * @param collection - Optional collection name to filter by.
   * @returns Promise resolving to array of media records.
   */
  list(
    modelType: string,
    modelId: string,
    collection?: string | undefined
  ): Promise<MediaRecord[]>;

  /**
   * Remove a media file and its record.
   *
   * @param mediaId - Media record ID to remove.
   * @returns Promise that resolves when removal is complete.
   */
  remove(mediaId: string): Promise<void>;

  /**
   * Resolve the URL for a media file or conversion.
   *
   * @param mediaId - Media record ID.
   * @param conversion - Optional conversion name (e.g., "thumb").
   * @param signed - Whether to generate a signed/temporary URL.
   * @param redirect - Whether to return a redirect URL (for streaming).
   * @returns Promise resolving to file URL.
   */
  resolveFileUrl(
    mediaId: string,
    conversion?: string | undefined,
    signed?: boolean | undefined,
    redirect?: boolean | undefined
  ): Promise<string>;
}

/**
 * Extended Express Request with optional media library service.
 * Used by HTTP middleware to attach the service to requests.
 */
export interface MediaRequest extends Request {
  /** Media library service instance (attached by middleware). */
  mediaLibrary?: MediaLibraryService | undefined;
}

// ==================== Legacy v1 Config Types ====================

/**
 * Legacy v1 configuration format (deprecated).
 * Use MediaConfig from config/schema.ts instead.
 *
 * @deprecated Use MediaConfig from config/schema.ts
 */
export interface MediaLibraryConfig {
  /** Default storage disk. */
  default_disk: "local" | "s3" | "bunnycdn";
  /** Local storage configuration. */
  local: LocalConfig;
  /** Optional S3 storage configuration. */
  s3?: S3Config | undefined;
  /** Optional BunnyCDN storage configuration. */
  bunnycdn?: BunnyCDNConfig | undefined;
}
