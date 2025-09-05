import mongoose, { Document, Schema } from "mongoose";

interface IAttraction {
  image: { public_id: string; url: string };
  name: string;
  description: string;
  distance: number;
}

interface ILocation {
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  postal_code?: string;
}

interface IEventCenter {
  capacity: number;
  seating: string;
  stage: string;
  audio_visual: string;
  kitchen: string;
  parking: string;
  generator: string;
  pricing: number;
  currency: "NGN" | "USD";
  minimum_rental_hours: number;
}

interface ILandmark {
  name: string;
  distance_km: number;
}

interface Bed {
  type: string;
  count: number;
}

interface IRoomType {
  name: string;
  description?: string;
  max_occupancy?: number;
  beds: Bed[];
  size_sqm?: number;
  amenities: string[];
  price: {
    nightly_rate: number;
    currency: "NGN" | "USD";
    tax_included: boolean;
  };
  availability: Date[];
  images: { public_id: string; url: string }[];
}

interface IApartmentPrice {
  nightly_rate: number;
  currency: "NGN" | "USD";
  cleaning_fee?: number;
  security_deposit?: number;
  discounts?: {
    weekly?: number;
    monthly?: number;
  };
}

interface IAmenities {
  wifi: boolean;
  kitchen: boolean;
  parking: boolean;
  air_conditioning: boolean;
  heating: boolean;
  washer: boolean;
  dryer: boolean;
  tv: boolean;
  pets_allowed: boolean;
  pool: boolean;
  gym: boolean;
  breakfast_included: boolean;
  smoking_allowed: boolean;
  wheelchair_accessible: boolean;
  stage: boolean;
  sound_system: boolean;
  rest_rooms: boolean;
  table: boolean;
  chairs: boolean;
  decorative_items: boolean;
  backup_generator: boolean;
  wardrobe: boolean;
  luggage_rack: boolean;
  mini_fridge: boolean;
  towels_and_bathrobes: boolean;
  currency_exchange: boolean;
  spa: boolean;
  meeting_rooms: boolean;
  printer_and_scanner: boolean;
  security: boolean;
  grilling_area: boolean;
  elevators: boolean;
  // new
  shuttle: boolean;
  mosquito_net: boolean;
  window_guards: boolean;
  cooking_basics: boolean;
  fridge: boolean;
  oven: boolean;
  outdoor_dining_area: boolean;
  blender: boolean;
  hot_water: boolean;
}

interface IApartmentAvailability {
  check_in_time: string;
  check_out_time: string;
  minimum_nights: number;
  maximum_nights: number;
  available_dates: string[];
}

interface ICancellationPolicy {
  policy_type: string;
  description: string;
}

interface IHouseRules {
  check_in_time?: string;
  check_out_time?: string;
  smoking: string;
  self_check_in: boolean;
  additional_rules?: string;
}

interface ISafetyFeatures {
  smoke_detector: boolean;
  carbon_monoxide_detector: boolean;
  first_aid_kit: boolean;
  fire_extinguisher: boolean;
}

interface IGeneralRules {
  no_pets: boolean;
  no_smoking: boolean;
  parties_allowed: boolean;
  additional_rules?: string;
}

interface IHotelCancellationPolicy {
  cancellation: string;
  check_in_time?: string;
  check_out_time?: string;
  smoking: string;
  pets: string;
  child_friendly: true;
}

interface ISpecialOffer {
  title: string;
  description: string;
  valid_from?: Date;
  valid_to?: Date;
}

interface IReview {
  user: mongoose.Types.ObjectId;
  cleanliness: number;
  customer_service: number;
  overall_rating: number;
  comment: string;
  date: Date;
}

export interface IListing extends Document {
  title: string;
  description: string;
  property_type: string;
  location: ILocation;
  event_center: IEventCenter;
  rankingBoost: number;
  boostPoints: number;
  views: number;
  bookings: number;
  revenue: number;
  boostEffectiveness: number;
  boostExpiry: Date;
  paymentRef: string;
  amountPaid: number;
  all_views: string;
  boostSuspendedAt: Date;
  remainingBoostDuration: number;

  price: Number;
  isAprove: "pending" | "approved" | "rejected";
  isSuspend: boolean;
  reason: string;
  host: {
    host_id: mongoose.Types.ObjectId;
  };
  facility_images: { public_id: string; url: string }[];
  landmarks: ILandmark[];
  hotel_categories: string[];
  hotel_room_types: IRoomType[];
  apartment_price: IApartmentPrice;
  amenities: IAmenities;
  apartment_availability: IApartmentAvailability;
  apartment_cancellation_policy: ICancellationPolicy;
  apartment_house_rules: IHouseRules;
  safety_features: ISafetyFeatures;
  general_rules: IGeneralRules;
  hotel_cancellation_policy: IHotelCancellationPolicy;
  general_special_offers: ISpecialOffer;
  reviews: IReview[];
  attractions: IAttraction[];
  average_rating: number;
}

// Mongoose schema for Bed
const BedSchema: Schema = new Schema({
  type: { type: String, required: true },
  count: { type: Number, required: true },
});

const AttractionSchema: Schema = new Schema({
  image: {
    public_id: { type: String },
    url: { type: String },
  },
  name: { type: String },
  description: { type: String },
  distance: { type: Number, default: 0 },
});

const ReviewSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "restr-users", required: true },
  cleanliness: { type: Number, required: true, min: 1, max: 5 },
  customer_service: { type: Number, required: true, min: 1, max: 5 },
  overall_rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const listingSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    property_type: { type: String, required: true },
    isAprove: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
    isSuspend: { type: Boolean, default: false },
    all_views: { type: String },
    reason: { type: String },

    location: {
      address: { type: String},
      latitude: { type: Number },
      longitude: { type: Number },
      city: { type: String },
      state: { type: String},
      country: { type: String },
      postal_code: { type: String },
    },

    event_center: {
      capacity: { type: Number },
      seating: { type: String },
      stage: { type: String },
      audio_visual: { type: String },
      kitchen: { type: String },
      parking: { type: String },
      generator: { type: String },
      pricing: { type: Number },
      currency: {
        type: String,
        enum: ["USD", "NGN"],
        default: "NGN",
      },
      minimum_rental_hours: { type: Number },
    },

    host: {
      host_id: { type: String },
    },
    facility_images: [
      {
        public_id: { type: String },
        url: { type: String },
      },
    ],
    landmarks: [
      {
        name: { type: String },
        distance_km: { type: Number },
      },
    ],
    hotel_categories: [{ type: String }],
    hotel_room_types: [
      {
        name: { type: String },
        description: { type: String },
        max_occupancy: { type: Number },
        beds: [BedSchema],
        size_sqm: { type: Number },
        amenities: [{ type: String }],
        price: {
          nightly_rate: { type: Number },
          currency: {
            type: String,
            enum: ["USD", "NGN"],
            default: "NGN",
          },
          tax_included: { type: Boolean, default: true },
        },
        availability: [{ type: Date }],
        images: [
          {
            public_id: { type: String },
            url: { type: String },
          },
        ],
      },
    ],
    apartment_price: {
      nightly_rate: { type: Number },
      currency: {
        type: String,
        enum: ["USD", "NGN"],
        default: "NGN",
      },
      cleaning_fee: { type: Number },
      security_deposit: { type: Number },
      discounts: {
        weekly: { type: Number },
        monthly: { type: Number },
      },
    },
    amenities: {
      wifi: { type: Boolean, default: false },
      kitchen: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
      air_conditioning: { type: Boolean, default: false },
      heating: { type: Boolean, default: false },
      washer: { type: Boolean, default: false },
      dryer: { type: Boolean, default: false },
      tv: { type: Boolean, default: false },
      pets_allowed: { type: Boolean, default: false },
      pool: { type: Boolean, default: false },
      gym: { type: Boolean, default: false },
      breakfast_included: { type: Boolean, default: false },
      smoking_allowed: { type: Boolean, default: false },
      wheelchair_accessible: { type: Boolean, default: false },

      stage: { type: Boolean, default: false },
      sound_system: { type: Boolean, default: false },
      rest_rooms: { type: Boolean, default: false },
      table: { type: Boolean, default: false },
      chairs: { type: Boolean, default: false },
      decorative_items: { type: Boolean, default: false },
      backup_generator: { type: Boolean, default: false },
      wardrobe: { type: Boolean, default: false },
      luggage_rack: { type: Boolean, default: false },
      mini_fridge: { type: Boolean, default: false },
      towels_and_bathrobes: { type: Boolean, default: false },
      currency_exchange: { type: Boolean, default: false },
      spa: { type: Boolean, default: false },
      meeting_rooms: { type: Boolean, default: false },
      printer_and_scanner: { type: Boolean, default: false },
      security: { type: Boolean, default: false },
      grilling_area: { type: Boolean, default: false },
      elevators: { type: Boolean, default: false },

      shuttle: { type: Boolean, default: false },
      mosquito_net: { type: Boolean, default: false },
      window_guards: { type: Boolean, default: false },
      cooking_basics: { type: Boolean, default: false },
      fridge: { type: Boolean, default: false },
      oven: { type: Boolean, default: false },
      outdoor_dining_area: { type: Boolean, default: false },
      blender: { type: Boolean, default: false },
      hot_water: { type: Boolean, default: false },
    },
    apartment_availability: {
      check_in_time: { type: String },
      check_out_time: { type: String },
      minimum_nights: { type: Number },
      maximum_nights: { type: Number },
      available_dates: [String],
    },
    apartment_cancellation_policy: {
      policy_type: { type: String },
      description: { type: String },
    },
    apartment_house_rules: {
      check_in_time: { type: String },
      check_out_time: { type: String },
      smoking: { type: String },
      self_check_in: { type: Boolean },
      additional_rules: { type: String },
    },
    safety_features: {
      smoke_detector: { type: Boolean, default: false },
      carbon_monoxide_detector: { type: Boolean, default: false },
      first_aid_kit: { type: Boolean, default: false },
      fire_extinguisher: { type: Boolean, default: false },
    },
    general_rules: {
      no_pets: { type: Boolean, default: false },
      no_smoking: { type: Boolean, default: false },
      parties_allowed: { type: Boolean, default: false },
      additional_rules: { type: String },
    },
    hotel_cancellation_policy: {
      cancellation: { type: String },
      check_in_time: { type: String },
      check_out_time: { type: String },
      smoking: { type: String },
      pets: { type: String },
    },
    general_special_offers: {
      title: { type: String },
      description: { type: String },
      valid_from: { type: Date },
      valid_to: { type: Date },
    },

    views: { type: Number },
    bookings: { type: Number },
    revenue: { type: Number },
    boostEffectiveness: { type: Number },
    boostPoints: { type: Number },
    boostSuspendedAt: { type: Date },
    remainingBoostDuration: { type: Number },
    rankingBoost: {
      type: Number,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    boostExpiry: {
      type: Date,
    },
    paymentRef: {
      type: String,
    },

    reviews: [ReviewSchema],
    attractions: [AttractionSchema],
    average_rating: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Calculate average rating when a new review is added
listingSchema.pre("save", function (next) {
  // Add a defensive check to ensure this.reviews is an array before accessing .length
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce(
      (sum: any, review: any) => sum + review.overall_rating,
      0
    );
    this.average_rating = totalRating / this.reviews.length;
  }
  next();
});

export default mongoose.model<IListing>("restr-listing", listingSchema);
