/**
 * Logger utility for development and production environments
 * In production, logs are disabled to improve performance and security
 */

const isDevelopment = __DEV__;

export const logger = {
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    error: (...args: any[]) => {
        // Always log errors, even in production
        console.error(...args);
    },

    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },

    debug: (...args: any[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },

    info: (...args: any[]) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },
};

/**
 * Development-only logger for temporary debugging
 * Use this for debug logs that should be removed later
 */
export const devLog = (...args: any[]) => {
    if (isDevelopment) {
        console.log('[DEV]', ...args);
    }
};
