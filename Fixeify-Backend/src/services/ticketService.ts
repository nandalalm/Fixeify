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
    const flagUpdate: any = {};
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
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_NOTIFICATION + ":", error);
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
    } catch (error) {
      console.error(MESSAGES.FAILED_SEND_NOTIFICATION + ":", error);
    }

    return this.formatTicketResponse(ticket);
  }

  async getTicketById(id: string): Promise<TicketResponse | null> {
    const ticket = await this._ticketRepository.findById(id);
    return ticket ? this.formatTicketResponse(ticket) : null;
  }

  async getTicketByTicketId(ticketId: string): Promise<TicketResponse | null> {
    const ticket = await this._ticketRepository.findByTicketId(ticketId);
    return ticket ? this.formatTicketResponse(ticket) : null;
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
      const complainantIdStr = (ticket as any)?.complainantId?._id?.toString?.() ?? (ticket as any)?.complainantId?.toString?.();
      const bookingIdStr = (ticket as any)?.bookingId?._id?.toString?.() ?? (ticket as any)?.bookingId?.toString?.();

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
        } catch (err) {
          console.error(MESSAGES.FAILED_SEND_NOTIFICATION + ":", err);
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
        } catch (err) {
          console.error(MESSAGES.FAILED_SEND_NOTIFICATION + ":", err);
        }
      }
    }

    return ticket ? this.formatTicketResponse(ticket) : null;
  }

  async updateTicketBanStatus(ticketId: string, isUserBanned?: boolean, isProBanned?: boolean): Promise<TicketResponse | null> {
    const ticket = await this._ticketRepository.updateBanStatus(ticketId, isUserBanned, isProBanned);
    return ticket ? this.formatTicketResponse(ticket) : null;
  }

  async getTicketStats(): Promise<{ pending: number; underReview: number; resolved: number; total: number }> {
    return await this._ticketRepository.getTicketStats();
  }

  private formatTicketResponse(ticket: any): TicketResponse {
    return {
      _id: ticket._id.toString(),
      ticketId: ticket.ticketId,
      complainantType: ticket.complainantType,
      complainantId: ticket.complainantId._id ? ticket.complainantId._id.toString() : ticket.complainantId.toString(),
      complainantName: ticket.complainantId.name || `${ticket.complainantId.firstName || ''} ${ticket.complainantId.lastName || ''}`.trim(),
      againstType: ticket.againstType,
      againstId: ticket.againstId._id ? ticket.againstId._id.toString() : ticket.againstId.toString(),
      againstName: ticket.againstId.name || `${ticket.againstId.firstName || ''} ${ticket.againstId.lastName || ''}`.trim(),
      bookingId: ticket.bookingId._id ? ticket.bookingId._id.toString() : ticket.bookingId.toString(),
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      adminComment: ticket.adminComment,
      resolvedBy: ticket.resolvedBy?._id?.toString(),
      resolvedAt: ticket.resolvedAt,
      isUserBanned: ticket.isUserBanned,
      isProBanned: ticket.isProBanned,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt
    };
  }
}
