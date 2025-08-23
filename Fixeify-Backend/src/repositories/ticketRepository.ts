import mongoose from "mongoose";
import Ticket, { TicketDocument } from "../models/ticketModel";
import { TicketResponse } from "../dtos/response/ticketDto";
import { CreateTicketRequest, UpdateTicketStatusRequest } from "../dtos/request/ticketDtos";
import { ITicketRepository } from "./ITicketRepository";
import { injectable } from "inversify";

@injectable()
export class MongoTicketRepository implements ITicketRepository {
  async create(ticketData: CreateTicketRequest): Promise<TicketDocument> {
    const ticket = new Ticket(ticketData);
    return await ticket.save();
  }

  async findById(id: string): Promise<TicketDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return await Ticket.findById(id)
      .populate('complainantId', 'name firstName lastName')
      .populate('againstId', 'name firstName lastName')
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name');
  }

  async findByTicketId(ticketId: string): Promise<TicketDocument | null> {
    return await Ticket.findOne({ ticketId })
      .populate('complainantId', 'name firstName lastName')
      .populate('againstId', 'name firstName lastName')
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name');
  }

  async findByComplainant(complainantId: string, page: number = 1, limit: number = 10): Promise<{ tickets: TicketResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [tickets, total] = await Promise.all([
      Ticket.find({ complainantId })
        .populate('complainantId', 'name firstName lastName')
        .populate('againstId', 'name firstName lastName')
        .populate('bookingId', 'issueDescription preferredDate status')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments({ complainantId })
    ]);

    return {
      tickets: tickets.map(this.formatTicketResponse),
      total
    };
  }

  async findByAgainst(againstId: string, page: number = 1, limit: number = 10): Promise<{ tickets: TicketResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [tickets, total] = await Promise.all([
      Ticket.find({ againstId })
        .populate('complainantId', 'name firstName lastName')
        .populate('againstId', 'name firstName lastName')
        .populate('bookingId', 'issueDescription preferredDate status')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments({ againstId })
    ]);

    return {
      tickets: tickets.map(this.formatTicketResponse),
      total
    };
  }

  async findAll(page: number = 1, limit: number = 10, status?: string): Promise<{ tickets: TicketResponse[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter = status ? { status } : {};
    
    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('complainantId', 'name firstName lastName')
        .populate('againstId', 'name firstName lastName')
        .populate('bookingId', 'issueDescription preferredDate status')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(filter)
    ]);

    return {
      tickets: tickets.map(this.formatTicketResponse),
      total
    };
  }

  async updateStatus(id: string, updateData: UpdateTicketStatusRequest): Promise<TicketDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateFields: any = {
      status: updateData.status,
      updatedAt: new Date()
    };

    if (updateData.adminComment) {
      updateFields.adminComment = updateData.adminComment;
    }

    if (updateData.status === 'resolved') {
      updateFields.resolvedAt = new Date();
      if (updateData.resolvedBy) {
        updateFields.resolvedBy = updateData.resolvedBy;
      }
    }

    return await Ticket.findByIdAndUpdate(id, updateFields, { new: true })
      .populate('complainantId', 'name firstName lastName')
      .populate('againstId', 'name firstName lastName')
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name');
  }

  async updateBanStatus(ticketId: string, isUserBanned?: boolean, isProBanned?: boolean): Promise<TicketDocument | null> {
    const updateFields: any = {};
    if (isUserBanned !== undefined) updateFields.isUserBanned = isUserBanned;
    if (isProBanned !== undefined) updateFields.isProBanned = isProBanned;
    
    return await Ticket.findByIdAndUpdate(ticketId, updateFields, { new: true })
      .populate('complainantId', 'name firstName lastName')
      .populate('againstId', 'name firstName lastName')
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name');
  }

  async getTicketStats(): Promise<{ pending: number; underReview: number; resolved: number; total: number }> {
    const [pending, underReview, resolved, total] = await Promise.all([
      Ticket.countDocuments({ status: 'pending' }),
      Ticket.countDocuments({ status: 'under_review' }),
      Ticket.countDocuments({ status: 'resolved' }),
      Ticket.countDocuments({})
    ]);

    return { pending, underReview, resolved, total };
  }

  private formatTicketResponse(ticket: any): TicketResponse {
    return {
      _id: ticket._id.toString(),
      ticketId: ticket.ticketId,
      complainantType: ticket.complainantType,
      complainantId: ticket.complainantId._id.toString(),
      complainantName: ticket.complainantId.name || `${ticket.complainantId.firstName || ''} ${ticket.complainantId.lastName || ''}`.trim(),
      againstType: ticket.againstType,
      againstId: ticket.againstId._id.toString(),
      againstName: ticket.againstId.name || `${ticket.againstId.firstName || ''} ${ticket.againstId.lastName || ''}`.trim(),
      bookingId: ticket.bookingId._id.toString(),
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      adminComment: ticket.adminComment,
      resolvedBy: ticket.resolvedBy?._id.toString(),
      resolvedAt: ticket.resolvedAt,
      isUserBanned: ticket.isUserBanned,
      isProBanned: ticket.isProBanned,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt
    };
  }
}
