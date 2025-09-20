import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaymentEvent {
  paymentIntentId: string;
  processedAt: Date;
}

export interface PaymentEventDocument extends IPaymentEvent, Document {}

const paymentEventSchema = new Schema<PaymentEventDocument>({
  paymentIntentId: { type: String, required: true, unique: true, index: true },
  processedAt: { type: Date, default: Date.now },
});

const PaymentEventModel: Model<PaymentEventDocument> = mongoose.model<PaymentEventDocument>(
  "PaymentEvent",
  paymentEventSchema
);

export default PaymentEventModel;
