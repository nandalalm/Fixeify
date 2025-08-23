export type TicketStatus = "pending" | "under_review" | "resolved";
export type TicketPriority = "low" | "medium" | "high";

export interface CreateTicketRequest {
  complainantType: "user" | "pro";
  complainantId: string;
  againstType: "user" | "pro";
  againstId: string;
  bookingId: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus;
  adminComment?: string;
  resolvedBy?: string;
}

export interface TicketResponse {
  _id: string;
  ticketId: string;
  complainantType: "user" | "pro";
  complainantId: string;
  complainantName?: string;
  againstType: "user" | "pro";
  againstId: string;
  againstName?: string;
  bookingId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  adminComment?: string;
  resolvedBy?: string;
  resolvedAt?: string | Date;
  isUserBanned?: boolean;
  isProBanned?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface TicketListResponse {
  tickets: TicketResponse[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
