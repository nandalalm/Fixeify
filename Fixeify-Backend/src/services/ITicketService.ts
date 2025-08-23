import { TicketResponse, TicketListResponse } from "../dtos/response/ticketDto";
import { CreateTicketRequest, UpdateTicketStatusRequest } from "../dtos/request/ticketDtos";

export interface ITicketService {
  createTicket(ticketData: CreateTicketRequest): Promise<TicketResponse>;
  getTicketById(id: string): Promise<TicketResponse | null>;
  getTicketByTicketId(ticketId: string): Promise<TicketResponse | null>;
  getTicketsByComplainant(complainantId: string, page: number, limit: number): Promise<TicketListResponse>;
  getTicketsByAgainst(againstId: string, page: number, limit: number): Promise<TicketListResponse>;
  getAllTickets(page: number, limit: number, status?: string): Promise<TicketListResponse>;
  updateTicketStatus(id: string, updateData: UpdateTicketStatusRequest): Promise<TicketResponse | null>;
  updateTicketBanStatus(ticketId: string, isUserBanned?: boolean, isProBanned?: boolean): Promise<TicketResponse | null>;
  getTicketStats(): Promise<{ pending: number; underReview: number; resolved: number; total: number }>;
}
