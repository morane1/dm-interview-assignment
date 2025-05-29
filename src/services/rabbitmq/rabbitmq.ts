import { Connection, Channel, connect } from 'amqplib';
import { Street } from '../../types/street';
import { Logger } from '../logger';
import { RABBITMQ_URL, QUEUE_NAME, RABBITMQ_CONSTANTS } from '../../config';
import { IRabbitMQ } from '../../interfaces/rabbitmq.interface';
import { RabbitMQError } from '../../errors/rabbitmq.error';
import { MAX_RECONNECT_ATTEMPTS, PREFETCH_COUNT } from '../../config/config';

export class RabbitMQ implements IRabbitMQ {
    private static instance: RabbitMQ;
    private connection: any = null;
    private channel: Channel | null = null;
    private reconnectAttempts = 0;
    
    private readonly RABBITMQ_URL = RABBITMQ_URL;
    private readonly QUEUE_NAME = QUEUE_NAME;

    private constructor() {}

    public static async getInstance(): Promise<RabbitMQ> {
        if (!RabbitMQ.instance) {
            RabbitMQ.instance = new RabbitMQ();
            await RabbitMQ.instance.connectWithRetry();
        }
        return RabbitMQ.instance;
    }

    private async connect(): Promise<void> {
    try {
        this.connection = await connect(this.RABBITMQ_URL);
        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(this.QUEUE_NAME, RABBITMQ_CONSTANTS.QUEUE_OPTIONS);
        await this.channel.prefetch(PREFETCH_COUNT);

        this.listenToEvents();

        Logger.info('Connected to RabbitMQ');
    } catch (error) {
        Logger.error('RabbitMQ connection error:', error as Error);
        throw new RabbitMQError('Failed to connect to RabbitMQ', error as Error);
    }
}

    private async listenToEvents(): Promise<void> {
     // Add listeners for errors and close events
        this.connection.on('error', (err) => {
            Logger.error('RabbitMQ connection error:', err);
            this.handleReconnect();
        });
        this.connection.on('close', () => {
            Logger.warn('RabbitMQ connection closed');
            this.handleReconnect();
        });
        this.channel.on('error', (err) => {
            Logger.error('RabbitMQ channel error:', err);
            this.handleReconnect();
        });
        this.channel.on('close', () => {
            Logger.warn('RabbitMQ channel closed');
            this.handleReconnect();
        });
    }

    private async handleReconnect() {
    Logger.warn('Attempting to reconnect to RabbitMQ...');
    try {
        if (this.channel) {
            await this.channel.close().catch(() => {});
            this.channel = null;
        }
        if (this.connection) {
            await this.connection.close().catch(() => {});
            this.connection = null;
        }
        await this.connectWithRetry();
        this.reconnectAttempts = 0; // Reset on success
        Logger.info('Reconnected to RabbitMQ');
    } catch (error) {
        this.reconnectAttempts++;
        Logger.error('RabbitMQ reconnection failed:', error as Error);
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            Logger.error('Max RabbitMQ reconnection attempts reached. Exiting process.');
            process.exit(1);
        } else {
            setTimeout(() => this.handleReconnect(), 5000);
        }
    }
}

    private async connectWithRetry(): Promise<void> {
        for (let i = 0; i < RABBITMQ_CONSTANTS.MAX_RETRIES; i++) {
            try {
                await this.connect();
                return;
            } catch (error) {
                if (i === RABBITMQ_CONSTANTS.MAX_RETRIES - 1) throw error;
                Logger.warn(`Connection attempt ${i + 1} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, RABBITMQ_CONSTANTS.RECONNECT_DELAY * (i + 1)));
            }
        }
    }

    public async publishStreet(street: Street): Promise<void> {
        if (!this.channel) throw new RabbitMQError('Channel not initialized');
        try {
            this.channel.sendToQueue(
                this.QUEUE_NAME,
                Buffer.from(JSON.stringify(street))
            );
            Logger.debug('Published street', { streetName: street.street_name });
        } catch (error) {
            Logger.error('Error publishing street:', error as Error);
            throw new RabbitMQError('Failed to publish street', error as Error);
        }
    }

    public async consumeStreets(
        callback: (street: Street) => Promise<void>
    ): Promise<void> {
        if (!this.channel) throw new RabbitMQError('Channel not initialized');
        try {
            await this.channel.consume(this.QUEUE_NAME, async (msg) => {
                if (msg) {
                    try {
                        const street: Street = JSON.parse(msg.content.toString());
                        await callback(street);
                        this.channel?.ack(msg);
                        Logger.debug('Processed street', { streetName: street.street_name });
                    } catch (error) {
                        Logger.error('Error processing message:', error as Error);
                        this.channel?.nack(msg);
                    }
                }
            });
            Logger.info('Started consuming streets');
        } catch (error) {
            Logger.error('Error setting up consumer:', error as Error);
            throw new RabbitMQError('Failed to set up consumer', error as Error);
        }
    }

    public async close(): Promise<void> {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
            Logger.info('RabbitMQ connection closed');
        } catch (error) {
            Logger.error('Error closing RabbitMQ connection:', error as Error);
            throw new RabbitMQError('Failed to close RabbitMQ connection', error as Error);
        }
    }
} 