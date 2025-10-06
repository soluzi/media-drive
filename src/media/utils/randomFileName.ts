import { randomBytes } from 'crypto';
import path from 'path';

/**
 * Generate a random filename while preserving the original extension
 */
export function randomFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const randomString = randomBytes(16).toString('hex');
  return `${randomString}${ext}`;
}

/**
 * Generate a random directory path (e.g., "ab/cd/ef/")
 */
export function randomDirectoryPath(): string {
  const parts: string[] = [];
  for (let i = 0; i < 3; i++) {
    parts.push(randomBytes(1).toString('hex'));
  }
  return parts.join('/') + '/';
}
