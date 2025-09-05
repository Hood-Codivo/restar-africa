import mongoose, { Document, Model, Schema } from "mongoose";

interface IRoom extends Document {
  guestId: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema: Schema<IRoom> = new Schema(
  {
    guestId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const roomModel: Model<IRoom> = mongoose.model("Room", RoomSchema);

export { roomModel, IRoom };
