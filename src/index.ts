// Main exports for the media library package
export * from './media/index';
export * from './types';

// Re-export commonly used items for convenience
export { initMediaLibrary, mediaRouter } from './media/index';
export { MediaLibrary } from './media/service';
export { createMediaRouter } from './media/routes';
