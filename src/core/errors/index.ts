/**
 * Custom Error Classes for Media Drive
 */

export class MediaDriveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaDriveError";
    Object.setPrototypeOf(this, MediaDriveError.prototype);
  }
}

export class ConfigurationError extends MediaDriveError {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export class ValidationError extends MediaDriveError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class StorageError extends MediaDriveError {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

export class ConversionError extends MediaDriveError {
  constructor(message: string) {
    super(message);
    this.name = "ConversionError";
    Object.setPrototypeOf(this, ConversionError.prototype);
  }
}

export class QueueError extends MediaDriveError {
  constructor(message: string) {
    super(message);
    this.name = "QueueError";
    Object.setPrototypeOf(this, QueueError.prototype);
  }
}

export class NotFoundError extends MediaDriveError {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
