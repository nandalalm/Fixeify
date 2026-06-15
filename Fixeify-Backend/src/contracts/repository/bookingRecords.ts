import type { Types } from "mongoose";
import type { BookingDocument } from "../../models/bookingModel";
import type { BookingLocation, BookingStatus, BookingTimeSlot } from "../api/bookingTypes";

export interface PopulatedBookingUserRecord {
  _id: Types.ObjectId;
  name: string;
  email: string;
  photo?: string;
}

export interface PopulatedBookingProRecord {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  email?: string;
  phoneNumber?: string;
}

export interface PopulatedBookingCategoryRecord {
  _id: Types.ObjectId;
  name: string;
  image?: string;
}

export interface PopulatedBookingRecord {
  _id: Types.ObjectId;
  bookingId: string;
  userId: PopulatedBookingUserRecord;
  proId: PopulatedBookingProRecord;
  categoryId: PopulatedBookingCategoryRecord;
  issueDescription: string;
  location: BookingLocation;
  phoneNumber: string;
  preferredDate: Date;
  preferredTime: BookingTimeSlot[];
  status: BookingStatus;
  rejectedReason?: string;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
  isRated?: boolean;
  hasComplaintRaisedByPro?: boolean;
  hasComplaintRaisedByUser?: boolean;
  adminRevenue?: number;
  proRevenue?: number;
}

export type BookingCompleteRecord = PopulatedBookingRecord;

export type BookingListProjectionRecord = PopulatedBookingRecord;

export type BookingConflictQueryRecord = Pick<
  BookingDocument,
  "_id" | "bookingId" | "userId" | "proId" | "categoryId" | "preferredDate" | "preferredTime" | "status"
>;
