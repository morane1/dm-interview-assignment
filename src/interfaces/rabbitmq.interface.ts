import { Street } from '../types/street';

export interface IRabbitMQ {
    publishStreet(street: Street): Promise<void>;
    consumeStreets(callback: (street: Street) => Promise<void>): Promise<void>;
    close(): Promise<void>;
} 