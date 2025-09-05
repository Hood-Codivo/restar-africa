import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICity {
  name: string;
  population?: number;
  landmarks?: string[];
  description?: string;
}

export interface IRegion {
  name: string;
  capital?: string;
  population?: number;
  area?: number;
  uniqueFeatures?: string[];
  description?: string;
  cities: ICity[];
}

export interface ICountry extends Document {
  name: string;
  capital: string;
  population: number;
  area: number;
  countryCode: string;
  currency: string;
  languages: string[];
  continent: string;
  description?: string;
  regions: IRegion[];
}

const citySchema = new Schema<ICity>({
  name: { type: String, required: true },
  population: { type: Number },
  landmarks: [String],
  description: String,
});

const regionSchema = new Schema<IRegion>({
  name: { type: String, required: true },
  capital: String,
  population: Number,
  area: Number,
  uniqueFeatures: [String],
  description: String,
  cities: [citySchema],
});

const countrySchema = new Schema<ICountry>({
  name: { type: String, required: true, unique: true },
  capital: { type: String, required: true },
  countryCode: { type: String, required: true },
  population: { type: Number, required: true },
  area: { type: Number, required: true },
  currency: { type: String, required: true },
  languages: [String],
  continent: { type: String, required: true },
  description: String,
  regions: [regionSchema],
});

const CountryModel = mongoose.model<ICountry>('Country', countrySchema);

export default CountryModel;