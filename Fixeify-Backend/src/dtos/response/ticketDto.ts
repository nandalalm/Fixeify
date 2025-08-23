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
  status: "pending" | "under_review" | "resolved";
  priority: "low" | "medium" | "high";
  adminComment?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  isUserBanned?: boolean;
  isProBanned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketListResponse {
  tickets: TicketResponse[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
