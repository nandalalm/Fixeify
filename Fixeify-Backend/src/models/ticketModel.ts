import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITicket {
  ticketId: string;
  complainantType: "user" | "pro";
  complainantId: mongoose.Types.ObjectId;
  againstType: "user" | "pro";
  againstId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  status: "pending" | "under_review" | "resolved";
  priority: "low" | "medium" | "high";
  adminComment?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketDocument extends ITicket, Document {
  _id: mongoose.Types.ObjectId;
}

const ticketSchema = new Schema<TicketDocument>(
  {
    ticketId: { 
      type: String, 
      required: true, 
      unique: true,
      default: function() {
        return 'TKT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
      }
    },
    complainantType: { 
      type: String, 
      enum: ["user", "pro"], 
      required: true 
    },
    complainantId: { 
      type: Schema.Types.ObjectId, 
      required: true,
      refPath: 'complainantType === "user" ? "User" : "ApprovedPro"'
    },
    againstType: { 
      type: String, 
      enum: ["user", "pro"], 
      required: true 
    },
    againstId: { 
      type: Schema.Types.ObjectId, 
      required: true,
      refPath: 'againstType === "user" ? "User" : "ApprovedPro"'
    },
    bookingId: { 
      type: Schema.Types.ObjectId, 
      ref: "Booking", 
      required: true 
    },
    subject: { 
      type: String, 
      required: true,
      maxlength: 200
    },
    description: { 
      type: String, 
      required: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ["pending", "under_review", "resolved"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    adminComment: { 
      type: String,
      maxlength: 500
    },
    resolvedBy: { 
      type: Schema.Types.ObjectId, 
      ref: "Admin" 
    },
    resolvedAt: { type: Date },
  },
  { 
    timestamps: true 
  }
);

ticketSchema.index({ complainantId: 1, createdAt: -1 });
ticketSchema.index({ againstId: 1, createdAt: -1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ bookingId: 1 });

const Ticket: Model<TicketDocument> = mongoose.model<TicketDocument>("Ticket", ticketSchema);
export default Ticket;
