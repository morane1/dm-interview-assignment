// RabbitMQ Configuration
export const RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
export const QUEUE_NAME = 'streets_queue';
export const RABBITMQ_CONSTANTS = {
    RECONNECT_DELAY: 1000,
    MAX_RETRIES: 3,
    QUEUE_OPTIONS: {
        durable: true,
        // other options
    }
} as const;

// MongoDB Configuration
export const MONGODB_URL = 'mongodb://localhost:27017';
export const DB_NAME = 'streets_db';
export const COLLECTION_NAME = 'streets';
export const MONGODB_CONSTANTS = {
    CONNECTION_TIMEOUT: 5000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
} as const; 