/**
 * Logger Facade
 *
 * Provides a simple logging interface with multiple log levels.
 * This facade can be replaced or extended to use third-party loggers like Winston, Pino, etc.
 *
 * Supported logger implementations:
 * - ConsoleLogger: Logs messages to the Node.js console and filters by log level.
 * - SelectiveConsoleLogger: Enables/disables logging for individual levels.
 * - NoOpLogger: Silently discards all log messages (for when logging is disabled).
 */

/**
 * LogLevel specifies valid log severity values, in order of lowest (debug) to highest (error).
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Expected interface for a logger implementation.
 *
 * All logger methods accept a log message and an optional metadata object.
 */
export interface Logger {
  /**
   * Log a debug-level message.
   * @param message - The message to log.
   * @param meta - Optional structured metadata for additional log context.
   */
  debug(message: string, meta?: Record<string, unknown> | undefined): void;

  /**
   * Log an info-level message.
   * @param message - The message to log.
   * @param meta - Optional structured metadata for additional log context.
   */
  info(message: string, meta?: Record<string, unknown> | undefined): void;

  /**
   * Log a warning-level message.
   * @param message - The message to log.
   * @param meta - Optional structured metadata for additional log context.
   */
  warn(message: string, meta?: Record<string, unknown> | undefined): void;

  /**
   * Log an error-level message.
   * @param message - The message to log.
   * @param meta - Optional structured metadata for additional log context.
   */
  error(message: string, meta?: Record<string, unknown> | undefined): void;
}

/**
 * Logger that writes messages to the Node.js console, filtering by global log level.
 *
 * Level hierarchy: "debug" < "info" < "warn" < "error".
 * Only messages with a severity greater than or equal to the configured level are logged.
 */
class ConsoleLogger implements Logger {
  private level: LogLevel;

  /**
   * @param level - The minimum log level for logging output.
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
   */
  debug(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.shouldLog("debug")) {
      return; // Early return if level too low
    }
    console.debug(`[DEBUG] ${message}`, meta || "");
  }

  /**
   * Log an info message if enabled by current log level.
   */
  info(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.shouldLog("info")) {
      return; // Early return if level too low
    }
    console.info(`[INFO] ${message}`, meta || "");
  }

  /**
   * Log a warning message if enabled by current log level.
   */
  warn(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.shouldLog("warn")) {
      return; // Early return if level too low
    }
    console.warn(`[WARN] ${message}`, meta || "");
  }

  /**
   * Log an error message if enabled by current log level.
   */
  error(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.shouldLog("error")) {
      return; // Early return if level too low
    }
    console.error(`[ERROR] ${message}`, meta || "");
  }
}

/**
 * Logger implementation that discards all logs.
 * Used for disabling logging via configuration.
 */
class NoOpLogger implements Logger {
  debug(_message: string, _meta?: Record<string, unknown> | undefined): void {
    // No-op: logging disabled
  }
  info(_message: string, _meta?: Record<string, unknown> | undefined): void {
    // No-op: logging disabled
  }
  warn(_message: string, _meta?: Record<string, unknown> | undefined): void {
    // No-op: logging disabled
  }
  error(_message: string, _meta?: Record<string, unknown> | undefined): void {
    // No-op: logging disabled
  }
}

/**
 * Console logger that allows individual per-level enables/disables.
 * Useful for advanced logging config from the config schema.
 */
class SelectiveConsoleLogger implements Logger {
  private levels: {
    debug: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;
  };

  /**
   * @param levels - Object specifying per-level enablement flags.
   *  Example: { debug: false, info: true, warn: true, error: true }
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
   * Log a debug message if enabled.
   */
  debug(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.levels.debug) return;
    console.debug(`[DEBUG] ${message}`, meta || "");
  }

  /**
   * Log an info message if enabled.
   */
  info(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.levels.info) return;
    console.info(`[INFO] ${message}`, meta || "");
  }

  /**
   * Log a warning message if enabled.
   */
  warn(message: string, meta?: Record<string, unknown> | undefined): void {
    if (!this.levels.warn) return;
    console.warn(`[WARN] ${message}`, meta || "");
  }

  /**
   * Log an error message if enabled.
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
 * Use to override global logging with a custom implementation.
 * @param logger - Logger implementation to use globally.
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Get the global logger instance.
 * Call this to fetch the logger for use in your module or service.
 * @returns The current global Logger instance.
 */
export function getLogger(): Logger {
  return globalLogger;
}

/**
 * Factory for logger instances based on config.
 *
 * - If `enabled` is false, returns a no-op logger.
 * - If `levelOrLevels` is a string, returns a ConsoleLogger with level filtering (hierarchical).
 * - If `levelOrLevels` is an object, returns a SelectiveConsoleLogger with per-level enables.
 *
 * @param levelOrLevels - Log level, or object specifying per-level enables.
 * @param enabled - If false, disables all logging (returns NoOpLogger). If true, returns proper logger.
 * @returns Appropriate Logger implementation according to provided config.
 *
 * @example
 * // Logging disabled - all logs are dropped:
 * createLogger("info", false) // → NoOpLogger
 *
 * @example
 * // Level "warn" - only warn and error logs:
 * createLogger("warn", true) // → ConsoleLogger("warn")
 * // debug() and info() calls will be ignored
 * // warn() and error() calls will be logged
 *
 * @example
 * // Enable only info and error logs:
 * createLogger({ debug: false, info: true, warn: false, error: true }, true)
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
