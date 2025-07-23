import mongoose, { Schema, Document } from "mongoose";

export interface ILocation {
  address: string;
  city: string;
  state: string;
  coordinates: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface ITimeSlot {
  startTime: string;
  endTime: string;
  booked: boolean;
}

export interface IAvailability {
  monday?: ITimeSlot[];
  tuesday?: ITimeSlot[];
  wednesday?: ITimeSlot[];
  thursday?: ITimeSlot[];
  friday?: ITimeSlot[];
  saturday?: ITimeSlot[];
  sunday?: ITimeSlot[];
}

export interface IPendingPro {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  categoryId: mongoose.Types.ObjectId;
  customService?: string;
  location: ILocation;
  profilePhoto: string;
  idProof: string[];
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  availability: IAvailability;
  createdAt?: Date;
  isRejected?: boolean;
}

export interface PendingProDocument extends IPendingPro, Document {
  _id: mongoose.Types.ObjectId;
}

const locationSchema = new Schema<ILocation>(
  {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  { _id: false }
);

locationSchema.index({ coordinates: "2dsphere" });

const timeSlotSchema = new Schema<ITimeSlot>(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    booked: { type: Boolean, default: false },
  },
  { _id: false }
);

const availabilitySchema = new Schema<IAvailability>(
  {
    monday: { type: [timeSlotSchema], default: [] },
    tuesday: { type: [timeSlotSchema], default: [] },
    wednesday: { type: [timeSlotSchema], default: [] },
    thursday: { type: [timeSlotSchema], default: [] },
    friday: { type: [timeSlotSchema], default: [] },
    saturday: { type: [timeSlotSchema], default: [] },
    sunday: { type: [timeSlotSchema], default: [] },
  },
  { _id: false }
);

const pendingProSchema = new Schema<PendingProDocument>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    customService: { type: String },
    location: { type: locationSchema, required: true },
    profilePhoto: { type: String, required: true },
    idProof: { type: [String], required: true },
    accountHolderName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    availability: { type: availabilitySchema, required: true },
    createdAt: { type: Date, default: Date.now },
    isRejected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PendingProModel = mongoose.model<PendingProDocument>("PendingPro", pendingProSchema);
export default PendingProModel;