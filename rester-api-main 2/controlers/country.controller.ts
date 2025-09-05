import { Request, Response } from 'express';
import CountryModel, { ICountry } from '../models/country.model';


interface IRegion {
    _id: string;
    name: string;
    capital?: string;
    population?: number;
    area?: number;
    uniqueFeatures?: string[];
    description?: string;
    cities: ICity[];
}

interface ICity {
    _id: string;
    name: string;
    population?: number;
    landmarks?: string[];
    description?: string;
}

export const getAllCountries = async (req: Request, res: Response): Promise<void> => {
    try {
        const countries: ICountry[] = await CountryModel.find();
        res.json(countries);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const getCountryById = async (req: Request, res: Response): Promise<void> => {
    try {
        const country: ICountry | null = await CountryModel.findById(req.params.id);
        if (!country) {
            res.status(404).json({ message: 'Country not found' });
            return;
        }
        res.json(country);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const createCountry = async (req: Request, res: Response): Promise<void> => {
    const country: ICountry = new CountryModel(req.body);
    try {
        const newCountry: ICountry = await country.save();
        res.status(201).json(newCountry);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateCountry = async (req: Request, res: Response): Promise<void> => {
    try {
        const updatedCountry: ICountry | null = await CountryModel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedCountry) {
            res.status(404).json({ message: 'Country not found' });
            return;
        }
        res.json(updatedCountry);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const deleteCountry = async (req: Request, res: Response): Promise<void> => {
    try {
      const deletedCountry = await CountryModel.findByIdAndDelete(req.params.id).lean().exec();
      
      if (!deletedCountry) {
        res.status(404).json({ message: 'Country not found' });
        return;
      }
      
      res.json({ 
        message: 'Country deleted successfully', 
        deletedCountry: deletedCountry as ICountry 
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  };

export const addRegion = async (req: Request, res: Response): Promise<void> => {
    try {
        const updatedCountry: ICountry | null = await CountryModel.findByIdAndUpdate(
            req.params.id,
            { $push: { regions: req.body } },
            { new: true, runValidators: true }
        );
        if (!updatedCountry) {
            res.status(404).json({ message: 'Country not found' });
            return;
        }
        res.status(201).json(updatedCountry);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateRegion = async (req: Request, res: Response): Promise<void> => {
    try {
        const updatedCountry: ICountry | null = await CountryModel.findOneAndUpdate(
            { _id: req.params.id, 'regions._id': req.params.regionId },
            { $set: { 'regions.$': req.body } },
            { new: true, runValidators: true }
        );
        if (!updatedCountry) {
            res.status(404).json({ message: 'Country or Region not found' });
            return;
        }
        res.json(updatedCountry);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const deleteRegion = async (req: Request, res: Response): Promise<void> => {
    try {
        const updatedCountry: ICountry | null = await CountryModel.findByIdAndUpdate(
            req.params.id,
            { $pull: { regions: { _id: req.params.regionId } } },
            { new: true }
        );
        if (!updatedCountry) {
            res.status(404).json({ message: 'Country or Region not found' });
            return;
        }
        res.json(updatedCountry);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const addCity = async (req: Request, res: Response): Promise<void> => {
    try {
        const updatedCountry: ICountry | null = await CountryModel.findOneAndUpdate(
            { _id: req.params.id, 'regions._id': req.params.regionId },
            { $push: { 'regions.$.cities': req.body } },
            { new: true, runValidators: true }
        );
        if (!updatedCountry) {
            res.status(404).json({ message: 'Country or Region not found' });
            return;
        }
        res.status(201).json(updatedCountry);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const updateCity = async (req: Request, res: Response): Promise<void> => {
    try {
        const updatedCountry: ICountry | null = await CountryModel.findOneAndUpdate(
            {
                _id: req.params.id,
                'regions._id': req.params.regionId,
                'regions.cities._id': req.params.cityId
            },
            { $set: { 'regions.$[region].cities.$[city]': req.body } },
            {
                new: true,
                runValidators: true,
                arrayFilters: [
                    { 'region._id': req.params.regionId },
                    { 'city._id': req.params.cityId }
                ]
            }
        );
        if (!updatedCountry) {
            res.status(404).json({ message: 'Country, Region, or City not found' });
            return;
        }
        res.json(updatedCountry);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};

export const deleteCity = async (req: Request, res: Response): Promise<void> => {
    try {
        const updatedCountry: ICountry | null = await CountryModel.findOneAndUpdate(
            { _id: req.params.id, 'regions._id': req.params.regionId },
            { $pull: { 'regions.$.cities': { _id: req.params.cityId } } },
            { new: true }
        );
        if (!updatedCountry) {
            res.status(404).json({ message: 'Country, Region, or City not found' });
            return;
        }
        res.json(updatedCountry);
    } catch (error) {
        res.status(400).json({ message: (error as Error).message });
    }
};