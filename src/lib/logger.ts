/**
 * Logger System for Production
 *
 * Rules:
 * - DEBUG: Only in development, for detailed troubleshooting
 * - INFO: Only in development, for general flow tracking
 * - WARN: Always shown, for potential issues
 * - ERROR: Always shown, for critical failures
 *
 * Usage:
 *   logger.debug('Detailed info for debugging'); // Dev only
 *   logger.info('User logged in'); // Dev only
 *   logger.warn('API rate limit approaching'); // Always shown
 *   logger.error('Database connection failed', error); // Always shown
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Color codes for console (development only)
const colors = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m'
};

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: any[]): string {
    const timestamp = new Date().toISOString();
    const color = isDevelopment ? colors[level] : '';
    const reset = isDevelopment ? colors.RESET : '';

    if (meta && meta.length > 0) {
      return `${color}[${timestamp}] [${level}]${reset} ${message}`;
    }
    return `${color}[${timestamp}] [${level}]${reset} ${message}`;
  }

  private log(level: LogLevel, message: string, ...meta: any[]) {
    // In production, only show WARN and ERROR
    if (!isDevelopment && !isTest && level !== 'WARN' && level !== 'ERROR') {
      return;
    }

    const formattedMessage = this.formatMessage(level, message);

    switch (level) {
      case 'DEBUG':
      case 'INFO':
        if (isDevelopment) {
        }
        break;
      case 'WARN':
        break;
      case 'ERROR':
        break;
    }
  }

  /**
   * Debug level - Only shown in development/test
   * Use for: Detailed troubleshooting, variable values, flow tracking
   */
  debug(message: string, ...meta: any[]) {
    this.log('DEBUG', message, ...meta);
  }

  /**
   * Info level - Only shown in development/test
   * Use for: General information, successful operations
   */
  info(message: string, ...meta: any[]) {
    this.log('INFO', message, ...meta);
  }

  /**
   * Warning level - Always shown
   * Use for: Potential issues, deprecated usage, unexpected but not critical
   */
  warn(message: string, ...meta: any[]) {
    this.log('WARN', message, ...meta);
  }

  /**
   * Error level - Always shown
   * Use for: Critical failures, exceptions, data corruption
   * NOTE: Never log sensitive data (passwords, tokens, personal info)
   */
  error(message: string, ...meta: any[]) {
    // Sanitize meta data to remove sensitive information
    const sanitizedMeta = this.sanitizeData(meta);
    this.log('ERROR', message, ...sanitizedMeta);
  }

  /**
   * Remove sensitive data from logs
   */
  private sanitizeData(data: any[]): any[] {
    if (!data || data.length === 0) return [];

    const sensitiveKeys = [
      'password',
      'token',
      'apiKey',
      'secret',
      'accessToken',
      'refreshToken',
      'session',
      'creditCard',
      'ssn',
      'pin'
    ];

    try {
      return data.map(item => {
        if (typeof item === 'object' && item !== null) {
          const str = JSON.stringify(item);
          const parsed = JSON.parse(str);

          // Remove sensitive keys
          Object.keys(parsed).forEach(key => {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
              parsed[key] = '[REDACTED]';
            }
          });

          return parsed;
        }
        return item;
      });
    } catch {
      // If sanitization fails, return generic message
      return ['[Data sanitized]'];
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { Logger };
