import mongoose, { Schema, Document } from "mongoose";

export interface IQuota {
  userId: mongoose.Types.ObjectId;
  proId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  laborCost: number;
  materialCost: number;
  additionalCharges: number;
  totalCost: number;
  paymentStatus: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotaDocument extends IQuota, Document {
  _id: mongoose.Types.ObjectId;
}

const quotaSchema = new Schema<QuotaDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    proId: { type: Schema.Types.ObjectId, ref: "ApprovedPro", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    laborCost: { type: Number, required: true, min: 0 },
    materialCost: { type: Number, default: 0, min: 0 },
    additionalCharges: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  },
  { timestamps: true }
);

quotaSchema.pre("save", function (next) {
  this.totalCost = this.laborCost + (this.materialCost || 0) + (this.additionalCharges || 0);
  next();
});

export const QuotaModel = mongoose.model<QuotaDocument>("Quota", quotaSchema);
export default QuotaModel;