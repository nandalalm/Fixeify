import type { Types } from "mongoose";

export interface PopulatedQuotaUserRecord {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

export interface PopulatedQuotaProRecord {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
}

export interface PopulatedQuotaCategoryRecord {
  _id: Types.ObjectId;
  name: string;
  image?: string;
}

export interface PopulatedQuotaRecord {
  _id: Types.ObjectId;
  userId: PopulatedQuotaUserRecord;
  proId: PopulatedQuotaProRecord;
  bookingId: Types.ObjectId;
  categoryId: PopulatedQuotaCategoryRecord;
  laborCost: number;
  materialCost: number;
  additionalCharges: number;
  totalCost: number;
  paymentStatus: "pending" | "completed" | "failed";
  paymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
