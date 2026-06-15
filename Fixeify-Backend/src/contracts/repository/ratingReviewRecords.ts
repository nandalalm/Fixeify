import type { Types } from "mongoose";

export interface PopulatedRatingReviewUserRecord {
  _id: Types.ObjectId;
  name: string;
  email?: string | null;
  phoneNo?: string | null;
  photo?: string | null;
}

export interface PopulatedRatingReviewProRecord {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email?: string | null;
  phoneNumber?: string | null;
  profilePhoto?: string | null;
}

export interface PopulatedRatingReviewCategoryRecord {
  _id: Types.ObjectId;
  name: string;
  image?: string;
}

export interface PopulatedRatingReviewBookingRecord {
  _id: Types.ObjectId;
  issueDescription?: string;
}

export interface PopulatedRatingReviewRecord {
  _id: Types.ObjectId;
  userId: PopulatedRatingReviewUserRecord;
  proId: PopulatedRatingReviewProRecord;
  categoryId?: PopulatedRatingReviewCategoryRecord;
  bookingId?: PopulatedRatingReviewBookingRecord | Types.ObjectId;
  quotaId?: Types.ObjectId;
  rating: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRatingReviewData {
  userId: Types.ObjectId;
  proId: Types.ObjectId;
  categoryId: Types.ObjectId;
  bookingId?: Types.ObjectId;
  quotaId?: Types.ObjectId;
  rating: number;
  review?: string;
}

export interface RatingReviewListRecord {
  items: PopulatedRatingReviewRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface RatingReviewTotalAggregateRecord {
  total: number;
}
