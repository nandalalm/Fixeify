export interface CreateTicketRequest {
  complainantType: "user" | "pro";
  complainantId: string;
  againstType: "user" | "pro";
  againstId: string;
  bookingId: string;
  subject: string;
  description: string;
  priority?: "low" | "medium" | "high";
}

export interface UpdateTicketStatusRequest {
  status: "pending" | "under_review" | "resolved";
  adminComment?: string;
  resolvedBy?: string;
}
