import axios, { Axios } from 'axios';
import { omit } from 'lodash';
import { cities, city, enlishNameByCity } from './cities';
import { Logger } from '../services/logger';

export interface Street extends Omit<ApiStreet, '_id'>{
	streetId: number
}

interface ApiStreet{
	_id: number
	region_code: number
	region_name: string
	city_code: number
	city_name: string
	street_code: number
	street_name: string
	street_name_status: string
	official_code: number
}


export class StreetsService{
	private static _axios: Axios
	private static get axios(){
		if(!this._axios){
			this._axios = axios.create({})
		}
		return this._axios
	}
	static async getStreetsInCity(city: city): Promise<{city: city, streets: Street[]}> {
    const limit = 1000; // Use a reasonable value supported by the API
    let offset = 0;
    let allResults: ApiStreet[] = [];
    let hasMore = true;
    let iteration = 0;
    const MAX_ITERATIONS = 1000; // Safety to avoid infinite loop
    let total = 0;

    while (hasMore && iteration < MAX_ITERATIONS) {
        const res = (await this.axios.post(
            'https://data.gov.il/api/3/action/datastore_search',
            {
                resource_id: `1b14e41c-85b3-4c21-bdce-9fe48185ffca`,
                filters: { city_name: cities[city] },
                limit,
                offset,
                include_total: true // Request total count
            }
        )).data;
        const results: ApiStreet[] = res.result.records;

        if (iteration === 0) {
            // On the first request, get the total number of records
            if (res.result && typeof res.result.total === 'number') {
                total = res.result.total;
                Logger.info(`Fetching ${total} streets for ${city}...`);
            } else {
                // If total is not available on the first request, break to avoid infinite loop
                Logger.warn('Total count not available in API response, fetching only the first page.');
                break;
            }
        }

        if (!results || results.length === 0) {
            break; // No more records
        }

        allResults = allResults.concat(results);
        Logger.debug(`Fetched ${results.length} records, total collected: ${allResults.length}, offset: ${offset}`);

        offset += limit;

        // Stop if we have fetched all records or reached the max iterations
        if (allResults.length >= total || iteration >= MAX_ITERATIONS - 1) {
            hasMore = false;
        }
        iteration++;
    }

     if (iteration === MAX_ITERATIONS) {
         Logger.warn('Max iterations reached while fetching streets. Data may be incomplete.');
     }

     if (!allResults.length && total > 0) {
         Logger.error('Failed to fetch any streets despite total count being greater than 0.');
         throw new Error('Failed to fetch streets for city: ' + city);
     }
      if (!allResults.length && total === 0) { // No streets found for this city
         return {city, streets: []}; 
     }

     const streets: Street[] = allResults.map((street: ApiStreet) => {
         const cityName = enlishNameByCity[street.city_name];
         return {
             ...omit<ApiStreet>(street, '_id'),
             streetId: street._id,
             city_name: cityName, // Keep the Hebrew city name from the API
             region_name: street.region_name.trim(),
             street_name: street.street_name.trim(),
             street_name_status: street.street_name_status, // Include all fields from ApiStreet
             official_code: street.official_code
         };
     });
     return { city, streets };
}

	static async getStreetInfoById(id: number){
		const res = (await this.axios.post('https://data.gov.il/api/3/action/datastore_search', {resource_id:`1b14e41c-85b3-4c21-bdce-9fe48185ffca`, filters: {_id: id}, limit: 1})).data
		const results = res.result.records
		if (!results || !results.length) {
			throw new Error('No street found for id: ' + id)
		}
		const dbStreet: ApiStreet = results[0]
		const cityName = enlishNameByCity[dbStreet.city_name]
		const street: Street = {...omit<ApiStreet>(dbStreet, '_id'), streetId: dbStreet._id, city_name: cityName, region_name: dbStreet.region_name.trim(), street_name: dbStreet.street_name.trim()}
		return street
	}
}