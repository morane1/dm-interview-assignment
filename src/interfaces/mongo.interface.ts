import { Street } from '../types/street';

export interface IMongoDB {
    insertStreet(street: Street): Promise<void>;
    close(): Promise<void>;
} 