export class Logger {
    static info(message: string, meta?: Record<string, unknown>): void {
        if (meta) {
            console.log(`[INFO] ${message}`, JSON.stringify(meta, null, 2));
        } else {
            console.log(`[INFO] ${message}`);
        }
    }
    
    static error(message: string, error?: Error): void {
        if (error) {
            console.error(`[ERROR] ${message}:`, error.message);
        } else {
            console.error(`[ERROR] ${message}`);
        }
    }

    static warn(message: string, meta?: Record<string, unknown>): void {
        if (meta) {
            console.warn(`[WARN] ${message}`, JSON.stringify(meta, null, 2));
        } else {
            console.warn(`[WARN] ${message}`);
        }
    }

    static debug(message: string, meta?: Record<string, unknown>): void {
        if (meta) {
            console.debug(`[DEBUG] ${message}`, JSON.stringify(meta, null, 2));
        } else {
            console.debug(`[DEBUG] ${message}`);
        }
    }
} 