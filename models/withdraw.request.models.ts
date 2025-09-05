import mongoose, { Schema, Types } from 'mongoose';

interface Withdraw {
    host: Types.ObjectId;
    amount: number;
    status: 'Processing' | 'Cancelled' | 'Successful';
    currency: string;
    reason: string
}

const withdrawSchema = new mongoose.Schema<Withdraw>({
    host: {
        type: Schema.Types.ObjectId,
        ref: 'restr-users',
        required: true,
    },
    currency: {type: String},
    amount: { 
        type: Number,
        required: true,
    },
    reason: {
        type: String
    },
    status: {
        type: String,
        default: "Processing",
    }
}, { timestamps: true });

export default mongoose.model<Withdraw>("rester-Withdraw", withdrawSchema);