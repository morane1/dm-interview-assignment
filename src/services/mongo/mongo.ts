import { MongoClient, Collection } from 'mongodb';
import { Street } from '../../types/street';
import { Logger } from '../logger';
import { MONGODB_URL, DB_NAME, COLLECTION_NAME, MONGODB_CONSTANTS } from '../../config';
import { IMongoDB } from '../../interfaces/mongo.interface';
import { MongoDBError } from '../../errors/mongo.error';

export class MongoDB implements IMongoDB {
    private static instance: MongoDB;
    private client: MongoClient;
    private collection: Collection<Street>;
    
    private readonly MONGODB_URL = MONGODB_URL;
    private readonly DB_NAME = DB_NAME;
    private readonly COLLECTION_NAME = COLLECTION_NAME;

    private constructor() {}

    public static async getInstance(): Promise<MongoDB> {
        if (!MongoDB.instance) {
            MongoDB.instance = new MongoDB();
            await MongoDB.instance.connect();
        }
        return MongoDB.instance;
    }

    private async connect(): Promise<void> {
        try {
            this.client = new MongoClient(this.MONGODB_URL, {
                serverSelectionTimeoutMS: MONGODB_CONSTANTS.CONNECTION_TIMEOUT
            });
            await this.client.connect();
            const db = this.client.db(this.DB_NAME);
            this.collection = db.collection<Street>(this.COLLECTION_NAME);
            // Ensure unique index on street_code
        await this.collection.createIndex({ streetId: 1 }, { unique: true });
            Logger.info('Connected to MongoDB');
        } catch (error) {
            Logger.error('MongoDB connection error:', error as Error);
            throw new MongoDBError('Failed to connect to MongoDB', error as Error);
        }
    }

    public async insertStreet(street: Street): Promise<void> {
        try {
            await this.collection.updateOne(
            { streetId: street.streetId }, // match by unique field
            { $set: street },                    // update all fields
            { upsert: true }                     // insert if not exists
        );
            Logger.debug('Inserted or updated street', { streetName: street.street_name });
        } catch (error) {
            Logger.error('Error inserting/updating street:', error as Error);
            throw new MongoDBError('Failed to insert/update street', error as Error);
        }
    }

    public async close(): Promise<void> {
        try {
            await this.client.close();
            Logger.info('MongoDB connection closed');
        } catch (error) {
            Logger.error('Error closing MongoDB connection:', error as Error);
            throw new MongoDBError('Failed to close MongoDB connection', error as Error);
        }
    }
} 