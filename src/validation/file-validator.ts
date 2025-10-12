import sharp from "sharp";

export interface ValidationRule {
  name: string;
  validator: (file: Express.Multer.File) => Promise<boolean> | boolean;
  errorMessage: string;
}

export interface FileTypeConfig {
  images: string[];
  documents: string[];
  text: string[];
  audio: string[];
  video: string[];
  archives: string[];
  custom?: string[];
}

export interface ValidationConfig {
  fileTypes: FileTypeConfig;
  contentValidation: boolean;
  virusScanning: boolean;
  maxFileSize: number;
  customValidators: ValidationRule[];
  allowedMimeTypes?: string[];
  blockedMimeTypes?: string[];
  maxImageDimensions?: {
    width: number;
    height: number;
  };
  minImageDimensions?: {
    width: number;
    height: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    mimeType: string;
    actualMimeType?: string;
    fileSize: number;
    dimensions?: { width: number; height: number };
    hasMetadata: boolean;
  };
}

export class FileValidator {
  private config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.config = {
      fileTypes: {
        images: [
          "jpeg",
          "jpg",
          "png",
          "gif",
          "webp",
          "svg",
          "bmp",
          "tiff",
          "ico",
        ],
        documents: [
          "pdf",
          "doc",
          "docx",
          "xls",
          "xlsx",
          "ppt",
          "pptx",
          "odt",
          "ods",
          "odp",
        ],
        text: ["txt", "csv", "json", "xml", "md", "rtf"],
        audio: ["mp3", "wav", "ogg", "aac", "flac", "m4a"],
        video: ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"],
        archives: ["zip", "rar", "7z", "tar", "gz", "bz2"],
      },
      contentValidation: true,
      virusScanning: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      customValidators: [],
    };
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate a file with comprehensive checks
   */
  async validate(file: Express.Multer.File): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let metadata: ValidationResult["metadata"] = {
      mimeType: file.mimetype,
      fileSize: file.size,
      hasMetadata: false,
    };

    // Basic file size check
    if (!this.validateFileSize(file)) {
      errors.push(
        `File size ${file.size} bytes exceeds maximum allowed size of ${this.config.maxFileSize} bytes`
      );
    }

    // MIME type validation
    const mimeValidation = await this.validateMimeType(file);
    if (!mimeValidation.valid) {
      errors.push(...mimeValidation.errors);
    }

    // Content validation (magic number check)
    if (this.config.contentValidation) {
      const contentValidation = await this.validateContent(file);
      if (!contentValidation.valid) {
        errors.push(...contentValidation.errors);
        warnings.push(...contentValidation.warnings);
      }
      if (contentValidation.actualMimeType) {
        metadata.actualMimeType = contentValidation.actualMimeType;
      }
    }

    // Image-specific validation
    if (this.isImageFile(file.mimetype)) {
      const imageValidation = await this.validateImage(file);
      if (!imageValidation.valid) {
        errors.push(...imageValidation.errors);
      }
      if (imageValidation.dimensions) {
        metadata.dimensions = imageValidation.dimensions;
      }
    }

    // Custom validators
    for (const rule of this.config.customValidators) {
      try {
        const isValid = await rule.validator(file);
        if (!isValid) {
          errors.push(rule.errorMessage);
        }
      } catch (error) {
        errors.push(
          `Custom validation '${rule.name}' failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // Virus scanning (placeholder - would integrate with actual antivirus)
    if (this.config.virusScanning) {
      const virusCheck = await this.scanForViruses(file);
      if (!virusCheck.clean) {
        errors.push("File failed virus scan");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  }

  /**
   * Validate file size
   */
  private validateFileSize(file: Express.Multer.File): boolean {
    return file.size <= this.config.maxFileSize;
  }

  /**
   * Validate MIME type
   */
  private async validateMimeType(
    file: Express.Multer.File
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check blocked MIME types
    if (this.config.blockedMimeTypes?.includes(file.mimetype)) {
      errors.push(`MIME type ${file.mimetype} is blocked`);
    }

    // Check allowed MIME types
    if (
      this.config.allowedMimeTypes &&
      !this.config.allowedMimeTypes.includes(file.mimetype)
    ) {
      errors.push(`MIME type ${file.mimetype} is not in allowed list`);
    }

    // Check against file type categories
    const fileExtension = this.getFileExtension(file.originalname);
    const allowedExtensions = [
      ...this.config.fileTypes.images,
      ...this.config.fileTypes.documents,
      ...this.config.fileTypes.text,
      ...this.config.fileTypes.audio,
      ...this.config.fileTypes.video,
      ...this.config.fileTypes.archives,
      ...(this.config.fileTypes.custom || []),
    ];

    if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
      errors.push(`File extension .${fileExtension} is not allowed`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate file content using magic numbers
   */
  private async validateContent(file: Express.Multer.File): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    actualMimeType?: string;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let actualMimeType: string | undefined;

    try {
      if (!file.buffer) {
        errors.push("File buffer is empty");
        return { valid: false, errors, warnings };
      }

      // Check magic numbers
      const magicNumber = file.buffer.subarray(0, 8);
      const detectedMimeType = this.detectMimeTypeFromMagicNumber(magicNumber);

      if (detectedMimeType && detectedMimeType !== file.mimetype) {
        warnings.push(
          `Declared MIME type ${file.mimetype} does not match detected type ${detectedMimeType}`
        );
        actualMimeType = detectedMimeType;
      }

      // Additional content validation based on file type
      if (this.isImageFile(file.mimetype)) {
        const imageValidation = await this.validateImageContent(file.buffer);
        if (!imageValidation.valid) {
          errors.push(...imageValidation.errors);
        }
      }
    } catch (error) {
      errors.push(
        `Content validation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      ...(actualMimeType && { actualMimeType }),
    };
  }

  /**
   * Validate image files
   */
  private async validateImage(file: Express.Multer.File): Promise<{
    valid: boolean;
    errors: string[];
    dimensions?: { width: number; height: number };
  }> {
    const errors: string[] = [];
    let dimensions: { width: number; height: number } | undefined;

    try {
      if (!file.buffer) {
        errors.push("Image buffer is empty");
        return { valid: false, errors };
      }

      const metadata = await sharp(file.buffer).metadata();
      dimensions = {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };

      // Check maximum dimensions
      if (this.config.maxImageDimensions) {
        if (dimensions.width > this.config.maxImageDimensions.width) {
          errors.push(
            `Image width ${dimensions.width}px exceeds maximum ${this.config.maxImageDimensions.width}px`
          );
        }
        if (dimensions.height > this.config.maxImageDimensions.height) {
          errors.push(
            `Image height ${dimensions.height}px exceeds maximum ${this.config.maxImageDimensions.height}px`
          );
        }
      }

      // Check minimum dimensions
      if (this.config.minImageDimensions) {
        if (dimensions.width < this.config.minImageDimensions.width) {
          errors.push(
            `Image width ${dimensions.width}px is below minimum ${this.config.minImageDimensions.width}px`
          );
        }
        if (dimensions.height < this.config.minImageDimensions.height) {
          errors.push(
            `Image height ${dimensions.height}px is below minimum ${this.config.minImageDimensions.height}px`
          );
        }
      }
    } catch (error) {
      errors.push(
        `Image validation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      ...(dimensions && { dimensions }),
    };
  }

  /**
   * Validate image content
   */
  private async validateImageContent(
    buffer: Buffer
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      await sharp(buffer).metadata();
    } catch (error) {
      errors.push("Invalid image format or corrupted image data");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Scan for viruses (placeholder implementation)
   */
  private async scanForViruses(
    _file: Express.Multer.File
  ): Promise<{ clean: boolean; threats?: string[] }> {
    // This would integrate with actual antivirus software
    // For now, just a placeholder
    return { clean: true };
  }

  /**
   * Detect MIME type from magic number
   */
  private detectMimeTypeFromMagicNumber(buffer: Buffer): string | undefined {
    const signatures: { [key: string]: string } = {
      FFD8FF: "image/jpeg",
      "89504E47": "image/png",
      "47494638": "image/gif",
      "52494646": "image/webp",
      "25504446": "application/pdf",
      "504B0304": "application/zip",
      "526172211A0700": "application/x-rar-compressed",
    };

    const hex = buffer.toString("hex").toUpperCase();

    for (const [signature, mimeType] of Object.entries(signatures)) {
      if (hex.startsWith(signature)) {
        return mimeType;
      }
    }

    return undefined;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.split(".").pop() || "";
  }

  /**
   * Check if file is an image
   */
  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith("image/");
  }

  /**
   * Add custom validation rule
   */
  addCustomValidator(rule: ValidationRule): void {
    this.config.customValidators.push(rule);
  }

  /**
   * Remove custom validation rule
   */
  removeCustomValidator(name: string): void {
    this.config.customValidators = this.config.customValidators.filter(
      (rule) => rule.name !== name
    );
  }

  /**
   * Get validation configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }

  /**
   * Update validation configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Create file validator with configuration
 */
export function createFileValidator(
  config: Partial<ValidationConfig> = {}
): FileValidator {
  const defaultConfig: ValidationConfig = {
    fileTypes: {
      images: [
        "jpeg",
        "jpg",
        "png",
        "gif",
        "webp",
        "svg",
        "bmp",
        "tiff",
        "ico",
      ],
      documents: [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "odt",
        "ods",
        "odp",
      ],
      text: ["txt", "csv", "json", "xml", "md", "rtf"],
      audio: ["mp3", "wav", "ogg", "aac", "flac", "m4a"],
      video: ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"],
      archives: ["zip", "rar", "7z", "tar", "gz", "bz2"],
    },
    contentValidation: true,
    virusScanning: false,
    maxFileSize: 10 * 1024 * 1024,
    customValidators: [],
  };

  return new FileValidator({ ...defaultConfig, ...config });
}

/**
 * Default file validator for media-drive
 */
export function defaultFileValidator(): FileValidator {
  return createFileValidator({
    fileTypes: {
      images: ["jpeg", "jpg", "png", "gif", "webp", "svg"],
      documents: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"],
      text: ["txt", "csv"],
      audio: [],
      video: [],
      archives: ["zip"],
    },
    contentValidation: true,
    maxFileSize: 10 * 1024 * 1024,
  });
}
