/**
 * Logger Facade
 *
 * Provides a simple logging interface with levels.
 * Can be extended to use Winston, Pino, or other logging libraries.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

class ConsoleLogger implements Logger {
  private level: LogLevel;

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.level);
    const targetLevelIndex = levels.indexOf(level);
    return targetLevelIndex >= currentLevelIndex;
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`, meta || "");
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog("info")) {
      console.info(`[INFO] ${message}`, meta || "");
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, meta || "");
    }
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog("error")) {
      console.error(`[ERROR] ${message}`, meta || "");
    }
  }
}

// Global logger instance
let globalLogger: Logger = new ConsoleLogger("info");

export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

export function getLogger(): Logger {
  return globalLogger;
}

export function createLogger(level: LogLevel = "info"): Logger {
  return new ConsoleLogger(level);
}
