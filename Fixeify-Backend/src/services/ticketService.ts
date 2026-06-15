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
import { toTicketResponse } from "../mappers/ticketMapper";
import type {
  CreateTicketData,
  TicketPartyReference,
  UpdateTicketStatusData,
} from "../contracts/repository/ticketRecords";

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

    const createData: CreateTicketData = {
      complainantType: ticketData.complainantType,
      complainantId: new mongoose.Types.ObjectId(ticketData.complainantId),
      againstType: ticketData.againstType,
      againstId: new mongoose.Types.ObjectId(ticketData.againstId),
      bookingId: new mongoose.Types.ObjectId(ticketData.bookingId),
      subject: ticketData.subject,
      description: ticketData.description,
      priority: ticketData.priority,
    };
    const ticket = await this._ticketRepository.create(createData);
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

    return toTicketResponse(ticket);
  }

  async getTicketById(id: string): Promise<TicketResponse | null> {
    const ticket = await this._ticketRepository.findById(id);
    return ticket ? toTicketResponse(ticket) : null;
  }

  async getTicketByTicketId(ticketId: string): Promise<TicketResponse | null> {
    const ticket = await this._ticketRepository.findByTicketId(ticketId);
    return ticket ? toTicketResponse(ticket) : null;
  }

  async getTicketsByComplainant(complainantId: string, page: number = 1, limit: number = 10): Promise<TicketListResponse> {
    const { tickets, total } = await this._ticketRepository.findByComplainant(complainantId, page, limit);
    const hasMore = page * limit < total;

    return { tickets: tickets.map(toTicketResponse), total, page, limit, hasMore };
  }

  async getTicketsByAgainst(againstId: string, page: number = 1, limit: number = 10): Promise<TicketListResponse> {
    const { tickets, total } = await this._ticketRepository.findByAgainst(againstId, page, limit);
    const hasMore = page * limit < total;

    return { tickets: tickets.map(toTicketResponse), total, page, limit, hasMore };
  }

  async getAllTickets(page: number = 1, limit: number = 10, status?: string): Promise<TicketListResponse> {
    const { tickets, total } = await this._ticketRepository.findAll(page, limit, status);
    const hasMore = page * limit < total;

    return { tickets: tickets.map(toTicketResponse), total, page, limit, hasMore };
  }

  async updateTicketStatus(id: string, updateData: UpdateTicketStatusRequest): Promise<TicketResponse | null> {
    const repositoryUpdate: UpdateTicketStatusData = {
      status: updateData.status,
      adminComment: updateData.adminComment,
      resolvedBy: updateData.resolvedBy
        ? new mongoose.Types.ObjectId(updateData.resolvedBy)
        : undefined,
    };
    const ticket = await this._ticketRepository.updateStatus(id, repositoryUpdate);

    if (ticket) {
      const complainantId = this.getPartyReferenceId(ticket.complainantId);
      const bookingId = ticket.bookingId instanceof mongoose.Types.ObjectId
        ? ticket.bookingId.toString()
        : ticket.bookingId._id.toString();

      if (updateData.status === 'under_review') {
        try {
          await this._notificationService.createNotification({
            type: "general",
            title: "Complaint Under Review",
            description: `Your complaint (${ticket.ticketId}) is now under review.`,
            userId: ticket.complainantType === "user" ? complainantId : undefined,
            proId: ticket.complainantType === "pro" ? complainantId : undefined,
            bookingId
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
            userId: ticket.complainantType === "user" ? complainantId : undefined,
            proId: ticket.complainantType === "pro" ? complainantId : undefined,
            bookingId
          });
        } catch {
          // Notification failed, continue execution
        }
      }
    }

    return ticket ? toTicketResponse(ticket) : null;
  }

  async updateTicketBanStatus(ticketId: string, isUserBanned?: boolean, isProBanned?: boolean): Promise<TicketResponse | null> {
    const ticket = await this._ticketRepository.updateBanStatus(ticketId, isUserBanned, isProBanned);
    return ticket ? toTicketResponse(ticket) : null;
  }

  async getTicketStats(): Promise<{ pending: number; underReview: number; resolved: number; total: number }> {
    return await this._ticketRepository.getTicketStats();
  }

  private getPartyReferenceId(reference: TicketPartyReference): string {
    return reference instanceof mongoose.Types.ObjectId
      ? reference.toString()
      : reference._id.toString();
  }
}
