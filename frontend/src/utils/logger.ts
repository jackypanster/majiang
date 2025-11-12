/**
 * Logger utility
 *
 * Wraps console API with game context (game_id, player_id)
 * - Development: INFO level
 * - Production: ERROR level
 */

import { DEBUG_MODE } from './constants';

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  gameId?: string;
  playerId?: string;
  [key: string]: any;
}

class Logger {
  private context: LogContext = {};

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = Object.entries(this.context)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');

    return `[${timestamp}] [${level.toUpperCase()}] ${contextStr ? `[${contextStr}] ` : ''}${message}`;
  }

  log(message: string, ...args: any[]) {
    if (DEBUG_MODE) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (DEBUG_MODE) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: any[]) {
    // Always log errors, even in production
    console.error(this.formatMessage('error', message), ...args);
  }
}

export const logger = new Logger();
export default logger;
