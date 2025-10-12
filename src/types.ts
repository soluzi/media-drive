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

export interface MediaRecord {
  id: string;
  path: string | null;
  model_type: string;
  model_id: string;
  collection_name: string;
  name: string;
  file_name: string;
  mime_type: string;
  disk: string;
  size: number;
  manipulations: Prisma.JsonValue;
  custom_properties: Prisma.JsonValue;
  responsive_images: Prisma.JsonValue;
  order_column: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface AttachFileOptions {
  collection?: string | undefined;
  name?: string | undefined;
  disk?: string | undefined;
  conversions?: Record<string, ConversionOptions> | undefined;
  customProperties?: Record<string, Prisma.JsonValue> | undefined;
}

export interface AttachFromUrlOptions extends AttachFileOptions {
  headers?: Record<string, string> | undefined;
  timeout?: number | undefined;
}

export interface ConversionJob {
  mediaId: string;
  conversion: string;
  options: ConversionOptions;
}

// ==================== Storage Config Types ====================

export interface LocalConfig {
  root: string;
  public_base_url: string;
}

export interface S3Config {
  key: string;
  secret: string;
  region: string;
  bucket: string;
  root?: string | undefined;
  url?: string | undefined;
  endpoint?: string | undefined;
  use_path_style_endpoint?: boolean | undefined;
}

export interface BunnyCDNConfig {
  storage_zone: string;
  api_key: string;
  pull_zone: string;
  root?: string | undefined;
  region?: string | undefined;
}

// ==================== HTTP Types ====================

export interface MediaLibraryService {
  attachFile(
    modelType: string,
    modelId: string,
    file: Express.Multer.File,
    options?: AttachFileOptions | undefined
  ): Promise<MediaRecord>;

  attachFromUrl(
    modelType: string,
    modelId: string,
    url: string,
    options?: AttachFromUrlOptions | undefined
  ): Promise<MediaRecord>;

  list(
    modelType: string,
    modelId: string,
    collection?: string | undefined
  ): Promise<MediaRecord[]>;

  remove(mediaId: string): Promise<void>;

  resolveFileUrl(
    mediaId: string,
    conversion?: string | undefined,
    signed?: boolean | undefined,
    redirect?: boolean | undefined
  ): Promise<string>;
}

export interface MediaRequest extends Request {
  mediaLibrary?: MediaLibraryService | undefined;
}

// ==================== Legacy v1 Config Types ====================

export interface MediaLibraryConfig {
  default_disk: "local" | "s3" | "bunnycdn";
  local: LocalConfig;
  s3?: S3Config | undefined;
  bunnycdn?: BunnyCDNConfig | undefined;
}
