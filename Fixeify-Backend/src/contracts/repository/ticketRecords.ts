import type { Types } from "mongoose";

export interface TicketPartyRecord {
  _id: Types.ObjectId;
  name?: string;
  firstName?: string;
  lastName?: string;
}

export interface TicketBookingRecord {
  _id: Types.ObjectId;
}

export interface TicketResolverRecord {
  _id: Types.ObjectId;
}

export type TicketPartyReference = Types.ObjectId | TicketPartyRecord;
export type TicketBookingReference = Types.ObjectId | TicketBookingRecord;
export type TicketResolverReference = Types.ObjectId | TicketResolverRecord;

export interface TicketRecord {
  _id: Types.ObjectId;
  ticketId: string;
  complainantType: "user" | "pro";
  complainantId: TicketPartyReference;
  againstType: "user" | "pro";
  againstId: TicketPartyReference;
  bookingId: TicketBookingReference;
  subject: string;
  description: string;
  status: "pending" | "under_review" | "resolved";
  priority: "low" | "medium" | "high";
  adminComment?: string;
  resolvedBy?: TicketResolverReference;
  resolvedAt?: Date;
  isUserBanned?: boolean;
  isProBanned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTicketData {
  complainantType: "user" | "pro";
  complainantId: Types.ObjectId;
  againstType: "user" | "pro";
  againstId: Types.ObjectId;
  bookingId: Types.ObjectId;
  subject: string;
  description: string;
  priority?: "low" | "medium" | "high";
}

export interface UpdateTicketStatusData {
  status: "pending" | "under_review" | "resolved";
  adminComment?: string;
  resolvedBy?: Types.ObjectId;
}
