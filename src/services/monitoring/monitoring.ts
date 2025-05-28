import { Logger } from '../logger';

export class Monitoring {
    private static instance: Monitoring;
    private metrics: {
        processedStreets: number;
        failedStreets: number;
        startTime: Date;
        lastError?: Error;
    };

    private constructor() {
        this.metrics = {
            processedStreets: 0,
            failedStreets: 0,
            startTime: new Date()
        };
    }

    public static getInstance(): Monitoring {
        if (!Monitoring.instance) {
            Monitoring.instance = new Monitoring();
        }
        return Monitoring.instance;
    }

    public incrementProcessedStreets(): void {
        this.metrics.processedStreets++;
        this.logMetrics();
    }

    public incrementFailedStreets(error: Error): void {
        this.metrics.failedStreets++;
        this.metrics.lastError = error;
        this.logMetrics();
    }

    private logMetrics(): void {
        const uptime = this.getUptime();
        Logger.info('Monitoring Metrics', {
            uptime,
            processedStreets: this.metrics.processedStreets,
            failedStreets: this.metrics.failedStreets,
            successRate: this.getSuccessRate(),
            lastError: this.metrics.lastError?.message
        });
    }

    private getUptime(): string {
        const uptime = new Date().getTime() - this.metrics.startTime.getTime();
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    private getSuccessRate(): string {
        const total = this.metrics.processedStreets + this.metrics.failedStreets;
        if (total === 0) return '0%';
        return `${((this.metrics.processedStreets / total) * 100).toFixed(2)}%`;
    }
} 