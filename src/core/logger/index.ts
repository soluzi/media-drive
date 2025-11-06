/**
 * Logger Facade
 *
 * Provides a simple logging interface with multiple log levels.
 * This facade can be replaced or extended to use third-party loggers like Winston, Pino, etc.
 *
 * The logger system uses a global singleton pattern - set a logger once and use it throughout
 * the application. Supports hierarchical log levels and per-level enablement.
 *
 * Supported logger implementations:
 * - ConsoleLogger: Logs messages to the Node.js console and filters by log level (hierarchical).
 * - SelectiveConsoleLogger: Enables/disables logging for individual levels (granular control).
 * - NoOpLogger: Silently discards all log messages (for when logging is disabled).
 *
 * Usage:
 * ```typescript
 * import { getLogger, setLogger, createLogger } from "./core/logger";
 *
 * // Use default logger
 * const logger = getLogger();
 * logger.info("Application started");
 *
 * // Set custom logger
 * setLogger(createLogger("warn", undefined, true));
 *
 * // Use logger in your code
 * const logger = getLogger();
 * logger.debug("Debug message"); // Won't log if level is "warn"
 * logger.error("Error occurred", { code: "E001" });
 * ```
 */

/**
 * Log severity levels in order from lowest to highest.
 * Used for hierarchical filtering: messages at or above the configured level are logged.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Logger interface for all logger implementations.
 *
 * All logger methods accept a log message and an optional metadata object.
 * Implementations may filter messages based on log level or configuration.
 */
export interface Logger {
  /**
   * Log a debug-level message.
   * Used for detailed diagnostic information, typically only of interest during development.
   *
   * @param message - The message to log.
   * @param meta - Optional structured metadata for additional log context (e.g., object IDs, timestamps).
   */
  debug(message: string, meta?: Record<string, unknown> | undefined): void;

  /**
   * Log an info-level message.
   * Used for general informational messages about application flow.
   *
   * @param message - The message to log.
   * @param meta - Optional structured metadata for additional log context.
   */
  info(message: string, meta?: Record<string, unknown> | undefined): void;

  /**
   * Log a warning-level message.
   * Used for potentially harmful situations that don't prevent operation.
   *
   * @param message - The message to log.
   * @param meta - Optional structured metadata for additional log context.
   */
  warn(message: string, meta?: Record<string, unknown> | undefined): void;

  /**
   * Log an error-level message.
   * Used for error events that might still allow the application to continue.
   *
   * @param message - The message to log.
   * @param meta - Optional structured metadata for additional log context (e.g., error codes, stack traces).
   */
  error(message: string, meta?: Record<string, unknown> | undefined): void;
}

/**
 * Console logger implementation with hierarchical level filtering.
 *
 * Writes messages to the Node.js console, filtering by global log level.
 * Level hierarchy: "debug" < "info" < "warn" < "error".
 * Only messages with a severity greater than or equal to the configured level are logged.
 *
 * Example: If level is "warn", only warn() and error() calls will be logged.
 * debug() and info() calls will be silently ignored.
 */
class ConsoleLogger implements Logger {
  private level: LogLevel;

  /**
   * Creates a new ConsoleLogger instance.
   *
   * @param level - The minimum log level for logging output (default: "info").
   *   Messages below this level will not be logged.
   */
  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  /**
   * Determines if a given target log level should be logged
   * based on the current global log level.
   * "debug" < "info" < "warn" < "error".
   * @param targetLevel - The log level for the message to check.
   * @returns Whether this message should be logged.
   */
  private shouldLog(targetLevel: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.level);
    const targetLevelIndex = levels.indexOf(targetLevel);

    // Only log if target level is >= current level
    // e.g., if current is "warn" (index 2), only warn (2) and error (3) will log
    return targetLevelIndex >= currentLevelIndex;
  }

  /**
   * Log a debug message if enabled by current log level.
   *
   * @param message - Debug message to log.
   * @param meta - Optional metadata object.
   */
  debug(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.shouldLog("debug")) {
      return; // Early return if level too low
    }
    console.debug(`[DEBUG] ${message}`, meta || "");
  }

  /**
   * Log an info message if enabled by current log level.
   *
   * @param message - Info message to log.
   * @param meta - Optional metadata object.
   */
  info(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.shouldLog("info")) {
      return; // Early return if level too low
    }
    console.info(`[INFO] ${message}`, meta || "");
  }

  /**
   * Log a warning message if enabled by current log level.
   *
   * @param message - Warning message to log.
   * @param meta - Optional metadata object.
   */
  warn(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.shouldLog("warn")) {
      return; // Early return if level too low
    }
    console.warn(`[WARN] ${message}`, meta || "");
  }

  /**
   * Log an error message if enabled by current log level.
   *
   * @param message - Error message to log.
   * @param meta - Optional metadata object.
   */
  error(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.shouldLog("error")) {
      return; // Early return if level too low
    }
    console.error(`[ERROR] ${message}`, meta || "");
  }
}

/**
 * No-op logger implementation that discards all log messages.
 * Used for disabling logging via configuration without changing code.
 * All methods are no-ops and do nothing when called.
 */
class NoOpLogger implements Logger {
  /**
   * Discard debug message (no-op).
   *
   * @param _message - Message to discard.
   * @param _meta - Metadata to discard.
   */
  debug(_message: string, _meta?: Record<string, unknown> | undefined): void {
    // No-op: logging disabled
  }

  /**
   * Discard info message (no-op).
   *
   * @param _message - Message to discard.
   * @param _meta - Metadata to discard.
   */
  info(_message: string, _meta?: Record<string, unknown> | undefined): void {
    // No-op: logging disabled
  }

  /**
   * Discard warning message (no-op).
   *
   * @param _message - Message to discard.
   * @param _meta - Metadata to discard.
   */
  warn(_message: string, _meta?: Record<string, unknown> | undefined): void {
    // No-op: logging disabled
  }

  /**
   * Discard error message (no-op).
   *
   * @param _message - Message to discard.
   * @param _meta - Metadata to discard.
   */
  error(_message: string, _meta?: Record<string, unknown> | undefined): void {
    // No-op: logging disabled
  }
}

/**
 * Console logger with granular per-level control.
 * Allows enabling/disabling individual log levels independently.
 * Useful for advanced logging configuration where hierarchical filtering isn't sufficient.
 *
 * Example: Enable only info and error logs, disable debug and warn.
 */
class SelectiveConsoleLogger implements Logger {
  private levels: {
    debug: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;
  };

  /**
   * Creates a new SelectiveConsoleLogger instance.
   *
   * @param levels - Object specifying per-level enablement flags.
   *   Example: { debug: false, info: true, warn: true, error: true }
   */
  constructor(levels: {
    debug: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;
  }) {
    this.levels = levels;
  }

  /**
   * Log a debug message if debug level is enabled.
   *
   * @param message - Debug message to log.
   * @param meta - Optional metadata object.
   */
  debug(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.levels.debug) return;
    console.debug(`[DEBUG] ${message}`, meta || "");
  }

  /**
   * Log an info message if info level is enabled.
   *
   * @param message - Info message to log.
   * @param meta - Optional metadata object.
   */
  info(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.levels.info) return;
    console.info(`[INFO] ${message}`, meta || "");
  }

  /**
   * Log a warning message if warn level is enabled.
   *
   * @param message - Warning message to log.
   * @param meta - Optional metadata object.
   */
  warn(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.levels.warn) return;
    console.warn(`[WARN] ${message}`, meta || "");
  }

  /**
   * Log an error message if error level is enabled.
   *
   * @param message - Error message to log.
   * @param meta - Optional metadata object.
   */
  error(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.levels.error) return;
    console.error(`[ERROR] ${message}`, meta || "");
  }
}

/**
 * Global logger instance. Defaults to ConsoleLogger at "info" level.
 */
let globalLogger: Logger = new ConsoleLogger("info");

/**
 * Set the global logger instance.
 * Replaces the default logger with a custom implementation.
 * All subsequent calls to getLogger() will return this instance.
 *
 * @param logger - Logger implementation to use globally.
 *
 * @example
 * ```typescript
 * import { setLogger, createLogger } from "./core/logger";
 *
 * // Set custom logger
 * setLogger(createLogger("warn", undefined, true));
 *
 * // Or use a third-party logger
 * import winston from "winston";
 * setLogger(winston.createLogger({ ... }));
 * ```
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Get the global logger instance.
 * Returns the currently configured logger singleton.
 * Use this function throughout your code to access the logger.
 *
 * @returns The current global Logger instance.
 *
 * @example
 * ```typescript
 * import { getLogger } from "./core/logger";
 *
 * const logger = getLogger();
 * logger.info("Application started");
 * logger.error("Something went wrong", { code: "E001" });
 * ```
 */
export function getLogger(): Logger {
  return globalLogger;
}

/**
 * Factory function for creating logger instances based on configuration.
 *
 * Creates appropriate logger implementation based on provided parameters:
 * - If `enabled` is false, returns NoOpLogger (all logs discarded).
 * - If `levels` is provided, returns SelectiveConsoleLogger (per-level control).
 * - Otherwise, returns ConsoleLogger with hierarchical level filtering.
 *
 * @param level - Log level for hierarchical filtering (default: "info").
 *   Only used when `levels` is not provided.
 * @param levels - Optional object specifying per-level enablement flags.
 *   If provided, creates SelectiveConsoleLogger instead of ConsoleLogger.
 * @param enabled - Whether logging is enabled (default: false).
 *   If false, returns NoOpLogger regardless of other parameters.
 * @returns Appropriate Logger implementation according to provided configuration.
 *
 * @example
 * ```typescript
 * // Logging disabled - all logs are dropped:
 * const logger1 = createLogger("info", undefined, false); // → NoOpLogger
 *
 * // Hierarchical level filtering - only warn and error logs:
 * const logger2 = createLogger("warn", undefined, true); // → ConsoleLogger("warn")
 * // debug() and info() calls will be ignored
 * // warn() and error() calls will be logged
 *
 * // Per-level control - enable only info and error logs:
 * const logger3 = createLogger("info", {
 *   debug: false,
 *   info: true,
 *   warn: false,
 *   error: true
 * }, true); // → SelectiveConsoleLogger
 * ```
 */
export function createLogger(
  level: LogLevel = "info",
  levels?: {
    debug?: boolean | undefined;
    info?: boolean | undefined;
    warn?: boolean | undefined;
    error?: boolean | undefined;
  },
  enabled: boolean = false
): Logger {
  if (!enabled) {
    return new NoOpLogger();
  }

  if (!!levels) {
    // Provide defaults for any missing level properties
    return new SelectiveConsoleLogger({
      debug: levels.debug ?? false,
      info: levels.info ?? true,
      warn: levels.warn ?? true,
      error: levels.error ?? true,
    });
  }

  return new ConsoleLogger(level);
}
