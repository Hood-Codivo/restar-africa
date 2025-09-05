import express from 'express';
import {
    addCity, addRegion, createCountry,
    deleteCity, deleteCountry, deleteRegion,
    getAllCountries, getCountryById, updateCity,
    updateCountry, updateRegion
} from '../controlers/country.controller';

export const countryRouter = express.Router();

countryRouter.get('/get-country', getAllCountries);
countryRouter.get('/get-country/:id', getCountryById);
countryRouter.post('/create-country', createCountry);
countryRouter.put('/update-country/:id', updateCountry);
countryRouter.delete('/delete-country/:id', deleteCountry);
countryRouter.post('/country/:id/add-regions', addRegion);
countryRouter.put('/country/:id/update-regions/:regionId', updateRegion);
countryRouter.delete('/country-delete/:id/regions/:regionId', deleteRegion);

countryRouter.post('/country/:id/regions/:regionId/add-cities', addCity);
countryRouter.put('/country/:id/regions/:regionId/update-cities/:cityId', updateCity);
countryRouter.delete('/:id/regions/:regionId/delete-cities/:cityId', deleteCity);
