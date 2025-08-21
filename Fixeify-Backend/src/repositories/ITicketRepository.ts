import { TicketDocument } from "../models/ticketModel";
import { TicketResponse } from "../dtos/response/ticketDto";
import { CreateTicketRequest, UpdateTicketStatusRequest } from "../dtos/request/ticketDtos";

export interface ITicketRepository {
  create(ticketData: CreateTicketRequest): Promise<TicketDocument>;
  findById(id: string): Promise<TicketDocument | null>;
  findByTicketId(ticketId: string): Promise<TicketDocument | null>;
  findByComplainant(complainantId: string, page: number, limit: number): Promise<{ tickets: TicketResponse[]; total: number }>;
  findByAgainst(againstId: string, page: number, limit: number): Promise<{ tickets: TicketResponse[]; total: number }>;
  findAll(page: number, limit: number, status?: string): Promise<{ tickets: TicketResponse[]; total: number }>;
  updateStatus(id: string, updateData: UpdateTicketStatusRequest): Promise<TicketDocument | null>;
  getTicketStats(): Promise<{ pending: number; underReview: number; resolved: number; total: number }>;
}
