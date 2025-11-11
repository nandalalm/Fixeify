import { ITicketRepository } from "../repositories/ITicketRepository";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";
import { HttpStatus } from "../enums/httpStatus";
import { ITicketService } from "./ITicketService";
import { TicketResponse, TicketListResponse } from "../dtos/response/ticketDto";
import { CreateTicketRequest, UpdateTicketStatusRequest } from "../dtos/request/ticketDtos";
import mongoose from "mongoose";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { INotificationService } from "./INotificationService";
import { IAdminRepository } from "../repositories/IAdminRepository";
import Ticket from "../models/ticketModel";
import Booking from "../models/bookingModel";

@injectable()
export class TicketService implements ITicketService {
  constructor(
    @inject(TYPES.ITicketRepository) private _ticketRepository: ITicketRepository,
    @inject(TYPES.INotificationService) private _notificationService: INotificationService,
    @inject(TYPES.IAdminRepository) private _adminRepository: IAdminRepository
  ) { }

  async createTicket(ticketData: CreateTicketRequest): Promise<TicketResponse> {
    const existing = await Ticket.findOne({
      complainantId: new mongoose.Types.ObjectId(ticketData.complainantId),
      bookingId: new mongoose.Types.ObjectId(ticketData.bookingId),
    });
    if (existing) {
      throw new HttpError(HttpStatus.BAD_REQUEST, MESSAGES.COMPLAINT_ALREADY_RAISED);
    }

    const ticket = await this._ticketRepository.create(ticketData);
    const flagUpdate: Record<string, boolean> = {};
    if (ticketData.complainantType === "user") {
      flagUpdate.hasComplaintRaisedByUser = true;
    } else if (ticketData.complainantType === "pro") {
      flagUpdate.hasComplaintRaisedByPro = true;
    }
    if (Object.keys(flagUpdate).length) {
      await Booking.findByIdAndUpdate(ticketData.bookingId, flagUpdate).exec();
    }

    try {
      await this._notificationService.createNotification({
        type: "general",
        title: "Complaint Created",
        description: `Your complaint has been created. Ticket ID: ${ticket.ticketId}. Issue: ${ticketData.subject}`,
        userId: ticketData.complainantType === "user" ? ticketData.complainantId : undefined,
        proId: ticketData.complainantType === "pro" ? ticketData.complainantId : undefined,
        bookingId: ticketData.bookingId
      });
    } catch {
      // Notification failed, continue execution
    }

    try {
      const admin = await this._adminRepository.find();
      if (admin) {
        await this._notificationService.createNotification({
          type: "general",
          title: "New Complaint Raised",
          description: `A new complaint (${ticket.ticketId}) has been raised by ${ticketData.complainantType}. Subject: ${ticketData.subject}`,
          adminId: admin.id,
          bookingId: ticketData.bookingId
        });
      }
    } catch {
      // Notification failed, continue execution
    }

    return this.formatTicketResponse(ticket as unknown);
  }

  async getTicketById(id: string): Promise<TicketResponse | null> {
    const ticket = await this._ticketRepository.findById(id);
    return ticket ? this.formatTicketResponse(ticket as unknown) : null;
  }

  async getTicketByTicketId(ticketId: string): Promise<TicketResponse | null> {
    const ticket = await this._ticketRepository.findByTicketId(ticketId);
    return ticket ? this.formatTicketResponse(ticket as unknown) : null;
  }

  async getTicketsByComplainant(complainantId: string, page: number = 1, limit: number = 10): Promise<TicketListResponse> {
    const { tickets, total } = await this._ticketRepository.findByComplainant(complainantId, page, limit);
    const hasMore = page * limit < total;

    return {tickets,total,page,limit,hasMore};
  }

  async getTicketsByAgainst(againstId: string, page: number = 1, limit: number = 10): Promise<TicketListResponse> {
    const { tickets, total } = await this._ticketRepository.findByAgainst(againstId, page, limit);
    const hasMore = page * limit < total;

    return {tickets,total,page,limit,hasMore};
  }

  async getAllTickets(page: number = 1, limit: number = 10, status?: string): Promise<TicketListResponse> {
    const { tickets, total } = await this._ticketRepository.findAll(page, limit, status);
    const hasMore = page * limit < total;

    return {tickets,total,page,limit,hasMore};
  }

  async updateTicketStatus(id: string, updateData: UpdateTicketStatusRequest): Promise<TicketResponse | null> {
    const ticket = await this._ticketRepository.updateStatus(id, updateData);

    if (ticket) {
      const ticketData = ticket as unknown as Record<string, unknown>;
      const complainantIdStr = (ticketData?.complainantId as Record<string, unknown>)?._id?.toString?.() ?? (ticketData?.complainantId as Record<string, unknown>)?.toString?.();
      const bookingIdStr = (ticketData?.bookingId as Record<string, unknown>)?._id?.toString?.() ?? (ticketData?.bookingId as Record<string, unknown>)?.toString?.();

      if (updateData.status === 'under_review') {
        try {
          await this._notificationService.createNotification({
            type: "general",
            title: "Complaint Under Review",
            description: `Your complaint (${ticket.ticketId}) is now under review.`,
            userId: ticket.complainantType === "user" ? complainantIdStr : undefined,
            proId: ticket.complainantType === "pro" ? complainantIdStr : undefined,
            bookingId: bookingIdStr
          });
        } catch {
          // Notification failed, continue execution
        }
      }

      if (updateData.status === 'resolved') {
        try {
          await this._notificationService.createNotification({
            type: "general",
            title: "Complaint Resolved",
            description: `Your complaint (${ticket.ticketId}) has been resolved. ${updateData.adminComment ? 'Admin Comment: ' + updateData.adminComment : ''}`,
            userId: ticket.complainantType === "user" ? complainantIdStr : undefined,
            proId: ticket.complainantType === "pro" ? complainantIdStr : undefined,
            bookingId: bookingIdStr
          });
        } catch {
          // Notification failed, continue execution
        }
      }
    }

    return ticket ? this.formatTicketResponse(ticket as unknown) : null;
  }

  async updateTicketBanStatus(ticketId: string, isUserBanned?: boolean, isProBanned?: boolean): Promise<TicketResponse | null> {
    const ticket = await this._ticketRepository.updateBanStatus(ticketId, isUserBanned, isProBanned);
    return ticket ? this.formatTicketResponse(ticket as unknown) : null;
  }

  async getTicketStats(): Promise<{ pending: number; underReview: number; resolved: number; total: number }> {
    return await this._ticketRepository.getTicketStats();
  }

  private formatTicketResponse(ticket: unknown): TicketResponse {
    const ticketData = ticket as Record<string, unknown>;
    return {
      _id: (ticketData._id as Record<string, unknown>).toString(),
      ticketId: ticketData.ticketId as string,
      complainantType: ticketData.complainantType as "user" | "pro",
      complainantId: (ticketData.complainantId as Record<string, unknown>)._id ? ((ticketData.complainantId as Record<string, unknown>)._id as Record<string, unknown>).toString() : (ticketData.complainantId as Record<string, unknown>).toString(),
      complainantName: (ticketData.complainantId as Record<string, unknown>).name as string || `${((ticketData.complainantId as Record<string, unknown>).firstName as string) || ''} ${((ticketData.complainantId as Record<string, unknown>).lastName as string) || ''}`.trim(),
      againstType: ticketData.againstType as "user" | "pro",
      againstId: (ticketData.againstId as Record<string, unknown>)._id ? ((ticketData.againstId as Record<string, unknown>)._id as Record<string, unknown>).toString() : (ticketData.againstId as Record<string, unknown>).toString(),
      againstName: (ticketData.againstId as Record<string, unknown>).name as string || `${((ticketData.againstId as Record<string, unknown>).firstName as string) || ''} ${((ticketData.againstId as Record<string, unknown>).lastName as string) || ''}`.trim(),
      bookingId: (ticketData.bookingId as Record<string, unknown>)._id ? ((ticketData.bookingId as Record<string, unknown>)._id as Record<string, unknown>).toString() : (ticketData.bookingId as Record<string, unknown>).toString(),
      subject: ticketData.subject as string,
      description: ticketData.description as string,
      status: ticketData.status as "pending" | "under_review" | "resolved",
      priority: ticketData.priority as "low" | "medium" | "high",
      adminComment: ticketData.adminComment as string | undefined,
      resolvedBy: (ticketData.resolvedBy as Record<string, unknown>)?._id?.toString(),
      resolvedAt: ticketData.resolvedAt as Date | undefined,
      isUserBanned: ticketData.isUserBanned as boolean | undefined,
      isProBanned: ticketData.isProBanned as boolean | undefined,
      createdAt: ticketData.createdAt as Date,
      updatedAt: ticketData.updatedAt as Date
    };
  }
}
