export class MongoDBError extends Error {
    constructor(message: string, public cause?: Error) {
        super(message);
        this.name = 'MongoDBError';
    }
} 