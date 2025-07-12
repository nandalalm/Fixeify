import { ILocation, ITimeSlot } from "../../models/bookingModel";

export class QuotaResponse {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  pro: {
    id: string;
    firstName: string;
    lastName: string;
  };
  bookingId: string;
  category: {
    id: string;
    name: string;
    image?: string;
  };
  laborCost: number;
  materialCost: number;
  additionalCharges: number;
  totalCost: number;
  paymentStatus: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    user: { id: string; name: string; email: string };
    pro: { id: string; firstName: string; lastName: string };
    bookingId: string;
    category: { id: string; name: string; image?: string };
    laborCost: number;
    materialCost: number;
    additionalCharges: number;
    totalCost: number;
    paymentStatus: "pending" | "completed" | "failed";
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.user = data.user;
    this.pro = data.pro;
    this.bookingId = data.bookingId;
    this.category = data.category;
    this.laborCost = data.laborCost;
    this.materialCost = data.materialCost;
    this.additionalCharges = data.additionalCharges;
    this.totalCost = data.totalCost;
    this.paymentStatus = data.paymentStatus;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export interface QuotaRequest {
  laborCost: number;
  materialCost?: number;
  additionalCharges?: number;
}