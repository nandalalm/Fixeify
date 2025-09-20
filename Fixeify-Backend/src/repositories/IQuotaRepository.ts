import { QuotaDocument } from "../models/quotaModel";
import { QuotaResponse } from "../dtos/response/quotaDtos";
import { Types } from "mongoose";
import { Document } from "mongoose";

 interface PopulatedUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
}

 interface PopulatedPro {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
}

 interface PopulatedCategory {
  _id: Types.ObjectId;
  name: string;
  image?: string;
}

export interface PopulatedQuotaDocument extends Document {
  _id: Types.ObjectId;
  userId: PopulatedUser;
  proId: PopulatedPro;
  bookingId: Types.ObjectId;
  categoryId: PopulatedCategory;
  laborCost: number;
  materialCost: number;
  additionalCharges: number;
  totalCost: number;
  paymentStatus: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuotaRepository {
  createQuota(quotaData: Partial<QuotaDocument>): Promise<QuotaResponse>;
  findQuotaByBookingId(bookingId: string): Promise<QuotaResponse | null>;
  updateQuota(quotaId: string, data: Partial<QuotaDocument>): Promise<QuotaResponse | null>;
  markPaymentCompletedIfPending(quotaId: string): Promise<QuotaResponse | null>;
}