import mongoose from 'mongoose';



const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  exchangeRate: {
    type: Number,
    required: true,
  },
});

const Location = mongoose.model('Location', locationSchema);

export default Location;