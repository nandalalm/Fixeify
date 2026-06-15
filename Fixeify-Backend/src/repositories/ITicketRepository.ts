import type {
  CreateTicketData,
  TicketRecord,
  UpdateTicketStatusData,
} from "../contracts/repository/ticketRecords";

export interface ITicketRepository {
  create(ticketData: CreateTicketData): Promise<TicketRecord>;
  findById(id: string): Promise<TicketRecord | null>;
  findByTicketId(ticketId: string): Promise<TicketRecord | null>;
  findByComplainant(complainantId: string, page: number, limit: number): Promise<{ tickets: TicketRecord[]; total: number }>;
  findByAgainst(againstId: string, page: number, limit: number): Promise<{ tickets: TicketRecord[]; total: number }>;
  findAll(page: number, limit: number, status?: string): Promise<{ tickets: TicketRecord[]; total: number }>;
  updateStatus(id: string, updateData: UpdateTicketStatusData): Promise<TicketRecord | null>;
  updateBanStatus(ticketId: string, isUserBanned?: boolean, isProBanned?: boolean): Promise<TicketRecord | null>;
  getTicketStats(): Promise<{ pending: number; underReview: number; resolved: number; total: number }>;
}
