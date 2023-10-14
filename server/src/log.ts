/**
 * @module log
 * This module contains functions for logging (Just the same as console.log) but it allows
 * us to disable logging in production, save logs etc etc.
 */

export type LogType = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
export const log_types = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
};



/**
 * @name log_header
 * Logs a header to the console
 * 
 * @example [INFO: 12:00:00]
 * 
 * @param {LogType} type - The type of log
 * 
 * @returns {string} The header
 */
export const log_header = (type: LogType): string => {
    const date = new Date();
    return `[${type}: ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}]`;
};



/**
 * @name log
 * Logs a message to the console
 * 
 * @param {LogType} type - The type of log
 * @param {Array<unknown>} args - The arguments to log
 * 
 * @returns {void} - Nothing, it just logs
 */
export const log = (type: LogType, ...args: Array<unknown>): void => {
    // -- Only log if we are in debug mode or an ERROR has occured
    // if (!LOG && type !== log_types.ERROR) return;
    const header = log_header(type),
        bold_style = 'font-weight: bold;';

    switch (type) {
    case log_types.INFO:
        console.log(`${header}`, ...args);
        break;

    case log_types.WARN:
        console.log(`${header}`, ...args);
        break;

    case log_types.ERROR:
        console.error(`${header}`, ...args);
        throw new Error(`[${type}] ${args.join(' ')}`);
        break;

    case log_types.DEBUG:
        console.log(`${header}`, ...args);
        break;
    }
};