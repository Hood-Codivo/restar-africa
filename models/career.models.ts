import mongoose, { Document, Schema } from 'mongoose';

export interface ICareer extends Document {
    title: string;
    description: string;
    requirements: string;
    location: string;
    type: string; // e.g., full-time, part-time, contract
    experience: number; // in years
    skills: string[];
    cv_link: string
    user: mongoose.Types.ObjectId;
}

const careerSchema = new Schema<ICareer>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, required: true, enum: ['full-time', 'part-time', 'contract'] },
    experience: { type: Number, required: true },
    skills: { type: [String], required: true },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'restr-users',
        required: true,
      },
    cv_link: { type: String }
}, {
    timestamps: true,
});

const Career = mongoose.model('reCareer', careerSchema);

export default Career;