/**
 * Production-safe logger utility
 *
 * In development: logs to console
 * In production: silences logs and sends errors to tracking service
 *
 * Usage:
 *   import logger from '@/lib/logger';
 *   logger.log('Debug info');
 *   logger.error('Error message', error);
 *   logger.warn('Warning message');
 */

const isDev = process.env.NODE_ENV === "development";

const logger = {
  /**
   * Log general information (only in development)
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log errors (development: console, production: error tracking)
   */
  error: (message, error = null) => {
    if (isDev) {
      console.error(message, error);
    } else {
      // In production, send to error tracking service
      if (typeof window !== "undefined") {
        // TODO: Initialize Sentry or similar service
        // window.Sentry?.captureException(error || new Error(message));
        // For now, fail silently in production
        // This prevents sensitive data leakage in browser console
      }
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log informational messages (only in development)
   */
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Group logs together (only in development)
   */
  group: (label) => {
    if (isDev) {
      console.group(label);
    }
  },

  /**
   * End log group (only in development)
   */
  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },
};

export default logger;
