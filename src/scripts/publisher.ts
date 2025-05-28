import { StreetsService } from '../israeliStreets/StreetsService';
import { cities, city } from '../israeliStreets/cities';
import { RabbitMQ } from '../services/rabbitmq/rabbitmq';
import { Logger } from '../services/logger';
import { CONCURRENCY_LIMIT } from '../config/config';


async function publishStreets(cityName: city) {
    try {
        // Validate city name
        if (!cityName || !cities[cityName]) {
            throw new Error(`Invalid city name. Available cities: ${Object.keys(cities).join(', ')}`);
        }

        // Get RabbitMQ instance
        const rabbitmq = await RabbitMQ.getInstance();

        // Get streets for the city
        const { streets } = await StreetsService.getStreetsInCity(cityName);
        Logger.info(`Found ${streets.length} streets in ${cityName}`);

        // Get full street info and publish each street
        for (let i = 0; i < streets.length; i += CONCURRENCY_LIMIT) {
            const batch = streets.slice(i, i + CONCURRENCY_LIMIT);
            await Promise.allSettled(
                batch.map(async (street) => {
                    try {
                        const fullStreetInfo = await StreetsService.getStreetInfoById(street.streetId);
                        await rabbitmq.publishStreet(fullStreetInfo);
                    } catch (error) {
                        Logger.error(`Failed to publish street with ID ${street.streetId}:`, error as Error);
                    }
                })
            );
        }

        Logger.info('Finished publishing streets');
        await rabbitmq.close();
    } catch (error) {
        Logger.error('Error in publisher:', error as Error);
        process.exit(1);
    }
}

// Get city name from command line argument
const cityName = process.argv[2] as city;
if (!cityName || !cities[cityName]) {
    Logger.error('Please provide a valid city name as a command line argument');
    process.exit(1);
}

publishStreets(cityName); 