/**
 * Tiny logger seam shared by the CLI and the worker. Tests can pass a collector
 * instead of writing to stdout.
 */

export interface SyncLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

export const consoleLogger: SyncLogger = {
  info(message) {
    console.log(message);
  },
  warn(message) {
    console.warn(message);
  },
  error(message, error) {
    console.error(message, error);
  },
};

export const silentLogger: SyncLogger = {
  info() {},
  warn() {},
  error() {},
};
