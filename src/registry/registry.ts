/**
 * Dependency Registry
 *
 * Lightweight DI container for managing service instances
 */

import { TokenType } from "./tokens";
import { ConfigurationError } from "../core/errors";

type Factory<T = any> = () => T;
type Instance<T = any> = T;

export class Registry {
  private instances = new Map<TokenType, Instance>();
  private factories = new Map<TokenType, Factory>();

  /**
   * Register an instance
   */
  registerInstance<T>(token: TokenType, instance: T): void {
    this.instances.set(token, instance);
  }

  /**
   * Register a factory (lazy instantiation)
   */
  registerFactory<T>(token: TokenType, factory: Factory<T>): void {
    this.factories.set(token, factory);
  }

  /**
   * Resolve a dependency
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
   * Check if a binding exists
   */
  has(token: TokenType): boolean {
    return this.instances.has(token) || this.factories.has(token);
  }

  /**
   * Clear all bindings
   */
  clear(): void {
    this.instances.clear();
    this.factories.clear();
  }

  /**
   * Remove a specific binding
   */
  remove(token: TokenType): void {
    this.instances.delete(token);
    this.factories.delete(token);
  }
}

// Global registry instance
let globalRegistry: Registry | null = null;

export function getRegistry(): Registry {
  if (!globalRegistry) {
    globalRegistry = new Registry();
  }
  return globalRegistry;
}

export function setRegistry(registry: Registry): void {
  globalRegistry = registry;
}

export function resetRegistry(): void {
  globalRegistry = new Registry();
}
