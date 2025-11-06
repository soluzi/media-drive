/**
 * Dependency Registry
 *
 * Lightweight DI container for managing service instances.
 * Supports both singleton instances and lazy factory-based instantiation.
 */

import { TokenType } from "./tokens";
import { ConfigurationError } from "../core/errors";

/** Factory function type for lazy instantiation. */
type Factory<T = unknown> = () => T;
/** Instance type (can be any value). */
type Instance<T = unknown> = T;

/**
 * Dependency injection registry for managing service instances.
 * Provides singleton and factory-based registration patterns.
 */
export class Registry {
  private instances = new Map<TokenType, Instance>();
  private factories = new Map<TokenType, Factory>();

  /**
   * Register a singleton instance.
   * The instance is stored and returned on every resolve call.
   *
   * @param token - Token symbol identifying the dependency.
   * @param instance - Instance to register.
   */
  registerInstance<T>(token: TokenType, instance: T): void {
    this.instances.set(token, instance);
  }

  /**
   * Register a factory function for lazy instantiation.
   * The factory is called on first resolve, then the result is cached.
   *
   * @param token - Token symbol identifying the dependency.
   * @param factory - Factory function that creates the instance.
   */
  registerFactory<T>(token: TokenType, factory: Factory<T>): void {
    this.factories.set(token, factory);
  }

  /**
   * Resolve a dependency by token.
   * Returns singleton instance if registered, or calls factory if registered.
   *
   * @param token - Token symbol identifying the dependency.
   * @returns Resolved instance.
   * @throws {ConfigurationError} If no binding exists for the token.
   */
  resolve<T>(token: TokenType): T {
    // Check if instance exists
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    // Check if factory exists
    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const instance = factory();
      this.instances.set(token, instance);
      return instance as T;
    }

    throw new ConfigurationError(
      `No binding found for token: ${token.toString()}`
    );
  }

  /**
   * Check if a binding exists for a token.
   *
   * @param token - Token symbol to check.
   * @returns True if instance or factory is registered, false otherwise.
   */
  has(token: TokenType): boolean {
    return this.instances.has(token) || this.factories.has(token);
  }

  /**
   * Clear all registered bindings (instances and factories).
   */
  clear(): void {
    this.instances.clear();
    this.factories.clear();
  }

  /**
   * Remove a specific binding by token.
   *
   * @param token - Token symbol to remove.
   */
  remove(token: TokenType): void {
    this.instances.delete(token);
    this.factories.delete(token);
  }
}

// Global registry instance
let globalRegistry: Registry | null = null;

/**
 * Get the global registry instance.
 * Creates a new registry if one doesn't exist.
 *
 * @returns Global Registry instance.
 */
export function getRegistry(): Registry {
  if (!globalRegistry) {
    globalRegistry = new Registry();
  }
  return globalRegistry;
}

/**
 * Set the global registry instance.
 * Useful for testing or custom registry implementations.
 *
 * @param registry - Registry instance to use globally.
 */
export function setRegistry(registry: Registry): void {
  globalRegistry = registry;
}

/**
 * Reset the global registry to a new empty instance.
 * Useful for testing to clear state between tests.
 */
export function resetRegistry(): void {
  globalRegistry = new Registry();
}
