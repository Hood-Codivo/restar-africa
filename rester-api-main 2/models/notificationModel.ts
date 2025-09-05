import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotification extends Document {
    content: string;
    type: string;
    status: string;
    read: boolean;
    recipient: mongoose.Schema.Types.ObjectId;
    booking: mongoose.Schema.Types.ObjectId;
}

const notificationSchema = new Schema<INotification>({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'restr-users',
        required: true
    },
    type: {
        type: String,
        required: true
    },
    read: { type: Boolean, default: false },
    status: {
        type: String,
    },
    content: {
        type: String,
        required: true
    },
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'restr-booking'
    },

}, {
    timestamps: true
});

const Notification: Model<INotification> = mongoose.model("Notification", notificationSchema);

export default Notification;
