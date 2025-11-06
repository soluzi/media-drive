/**
 * Custom Error Classes for Media Drive
 *
 * Provides a hierarchy of error types for different failure scenarios
 * in the media library system.
 */

/**
 * Base error class for all Media Drive errors.
 * All custom errors extend this class.
 */
export class MediaDriveError extends Error {
  /**
   * Creates a new MediaDriveError instance.
   * @param message - Error message describing what went wrong.
   */
  constructor(message: string) {
    super(message);
    this.name = "MediaDriveError";
    Object.setPrototypeOf(this, MediaDriveError.prototype);
  }
}

/**
 * Error thrown when configuration is invalid or missing.
 * Used for configuration validation failures.
 */
export class ConfigurationError extends MediaDriveError {
  /**
   * Creates a new ConfigurationError instance.
   * @param message - Error message describing the configuration issue.
   */
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error thrown when file or data validation fails.
 * Used for invalid file types, sizes, or formats.
 */
export class ValidationError extends MediaDriveError {
  /**
   * Creates a new ValidationError instance.
   * @param message - Error message describing the validation failure.
   */
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when storage operations fail.
 * Used for file system, S3, or other storage backend errors.
 */
export class StorageError extends MediaDriveError {
  /**
   * Creates a new StorageError instance.
   * @param message - Error message describing the storage operation failure.
   */
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * Error thrown when image conversion or processing fails.
 * Used for Sharp or other conversion processor errors.
 */
export class ConversionError extends MediaDriveError {
  /**
   * Creates a new ConversionError instance.
   * @param message - Error message describing the conversion failure.
   */
  constructor(message: string) {
    super(message);
    this.name = "ConversionError";
    Object.setPrototypeOf(this, ConversionError.prototype);
  }
}

/**
 * Error thrown when queue operations fail.
 * Used for BullMQ or other queue driver errors.
 */
export class QueueError extends MediaDriveError {
  /**
   * Creates a new QueueError instance.
   * @param message - Error message describing the queue operation failure.
   */
  constructor(message: string) {
    super(message);
    this.name = "QueueError";
    Object.setPrototypeOf(this, QueueError.prototype);
  }
}

/**
 * Error thrown when a requested resource is not found.
 * Used when media records or files don't exist.
 */
export class NotFoundError extends MediaDriveError {
  /**
   * Creates a new NotFoundError instance.
   * @param message - Error message describing what was not found.
   */
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
