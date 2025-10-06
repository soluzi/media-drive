import { Prisma } from "@prisma/client";
import { Request } from "express";

export interface MediaRecord extends Prisma.MediaGetPayload<{}> {
  id: string;
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

export interface StoredObject {
  path: string;
  size: number;
  lastModified?: Date | undefined;
  etag?: string | undefined;
}

export interface StorageDriver {
  put(
    path: string,
    contents: Buffer | string,
    options?: PutOptions
  ): Promise<StoredObject>;
  get(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  url(path: string): string;
  temporaryUrl(path: string, expiresIn?: number): Promise<string>;
}

export interface PutOptions {
  visibility?: "public" | "private";
  metadata?: Record<string, string>;
  contentType?: string;
}

export interface MediaLibraryConfig {
  default_disk: "local" | "s3" | "bunnycdn";
  local: LocalConfig;
  s3?: S3Config;
  bunnycdn?: BunnyCDNConfig;
}

export interface LocalConfig {
  root: string;
  public_base_url: string;
}

export interface S3Config {
  key: string;
  secret: string;
  region: string;
  bucket: string;
  root?: string;
  url?: string | undefined;
  endpoint?: string | undefined;
  use_path_style_endpoint?: boolean;
}

export interface BunnyCDNConfig {
  storage_zone: string;
  api_key: string;
  pull_zone: string;
  root?: string;
  region?: string;
}

export interface ConversionOptions extends Prisma.JsonObject {
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  quality?: number;
  format?: "jpeg" | "png" | "webp" | "avif";
  background?: string;
}

export interface AttachFileOptions {
  collection?: string;
  name?: string | undefined;
  disk?: "local" | "s3" | "bunnycdn" | undefined;
  conversions?: Record<string, ConversionOptions>;
  customProperties?: Record<string, Prisma.JsonValue>;
}

export interface AttachFromUrlOptions extends AttachFileOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

export interface MediaLibraryService {
  attachFile(
    modelType: string,
    modelId: string,
    file: Express.Multer.File,
    options?: AttachFileOptions
  ): Promise<MediaRecord>;

  attachFromUrl(
    modelType: string,
    modelId: string,
    url: string,
    options?: AttachFromUrlOptions
  ): Promise<MediaRecord>;

  list(
    modelType: string,
    modelId: string,
    collection?: string
  ): Promise<MediaRecord[]>;

  remove(mediaId: string): Promise<void>;

  resolveFileUrl(
    mediaId: string,
    conversion?: string,
    signed?: boolean,
    redirect?: boolean
  ): Promise<string>;
}

export interface MediaRequest extends Request {
  mediaLibrary?: MediaLibraryService;
}

export interface ConversionJob {
  mediaId: string;
  conversion: string;
  options: ConversionOptions;
}
