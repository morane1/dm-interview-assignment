import { MongoDB } from '../services/mongo/mongo';
import { RabbitMQ } from '../services/rabbitmq/rabbitmq';
import { Logger } from '../services/logger';
import { Monitoring } from '../services/monitoring/monitoring';

async function consumeStreets() {
    try {
        // Get monitoring instance
        const monitoring = Monitoring.getInstance();
        
        // Connect to MongoDB using singleton
        const mongo = await MongoDB.getInstance();
        
        // Get RabbitMQ instance
        const rabbitmq = await RabbitMQ.getInstance();

        Logger.info('Waiting for streets...');

        // Consume messages
        await rabbitmq.consumeStreets(async (street) => {
            try {
                // Store in MongoDB using singleton
                await mongo.insertStreet(street);
                Logger.debug(`Stored street: ${street.street_name}`);
                monitoring.incrementProcessedStreets();
            } catch (error) {
                Logger.error('Error processing message:', error as Error);
                monitoring.incrementFailedStreets(error as Error);
                throw error; // This will trigger nack in the RabbitMQ class
            }
        });

        // Handle process termination
        process.on('SIGINT', async () => {
            Logger.info('Closing connections...');
            await rabbitmq.close();
            await mongo.close();
            process.exit(0);
        });
    } catch (error) {
        Logger.error('Error in consumer:', error as Error);
        process.exit(1);
    }
}

consumeStreets(); 