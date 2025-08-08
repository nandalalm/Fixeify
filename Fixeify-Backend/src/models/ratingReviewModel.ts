import mongoose, { Schema, Document } from "mongoose";

export interface IRatingReview extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  proId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  quotaId?: mongoose.Types.ObjectId;
  rating: number; 
  review?: string; 
  createdAt: Date;
  updatedAt: Date;
}

const ratingReviewSchema = new Schema<IRatingReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    proId: {
      type: Schema.Types.ObjectId,
      ref: "ApprovedPro",
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    quotaId: {
      type: Schema.Types.ObjectId,
      ref: "Quota",
      required: false,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      required: false,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

ratingReviewSchema.index(
  { userId: 1, proId: 1, bookingId: 1 },
  { unique: true, partialFilterExpression: { bookingId: { $exists: true, $ne: null } } }
);


ratingReviewSchema.index({ proId: 1, createdAt: -1 });
ratingReviewSchema.index({ userId: 1, createdAt: -1 });

export const RatingReview = mongoose.model<IRatingReview>("RatingReview", ratingReviewSchema);
