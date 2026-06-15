import mongoose from "mongoose";
import Ticket from "../models/ticketModel";
import { ITicketRepository } from "./ITicketRepository";
import { injectable } from "inversify";
import type {
  CreateTicketData,
  TicketRecord,
  UpdateTicketStatusData,
} from "../contracts/repository/ticketRecords";

@injectable()
export class MongoTicketRepository implements ITicketRepository {
  async create(ticketData: CreateTicketData): Promise<TicketRecord> {
    const ticket = new Ticket(ticketData);
    return await ticket.save();
  }

  async findById(id: string): Promise<TicketRecord | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return await Ticket.findById(id)
      .populate('complainantId', 'name firstName lastName')
      .populate('againstId', 'name firstName lastName')
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name')
      .lean<TicketRecord>()
      .exec();
  }

  async findByTicketId(ticketId: string): Promise<TicketRecord | null> {
    return await Ticket.findOne({ ticketId })
      .populate('complainantId', 'name firstName lastName')
      .populate('againstId', 'name firstName lastName')
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name')
      .lean<TicketRecord>()
      .exec();
  }

  async findByComplainant(complainantId: string, page: number = 1, limit: number = 10): Promise<{ tickets: TicketRecord[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [tickets, total] = await Promise.all([
      Ticket.find({ complainantId })
        .populate('complainantId', 'name firstName lastName')
        .populate('againstId', 'name firstName lastName')
        .populate('bookingId', 'issueDescription preferredDate status')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<TicketRecord[]>()
        .exec(),
      Ticket.countDocuments({ complainantId })
    ]);

    return { tickets, total };
  }

  async findByAgainst(againstId: string, page: number = 1, limit: number = 10): Promise<{ tickets: TicketRecord[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [tickets, total] = await Promise.all([
      Ticket.find({ againstId })
        .populate('complainantId', 'name firstName lastName')
        .populate('againstId', 'name firstName lastName')
        .populate('bookingId', 'issueDescription preferredDate status')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<TicketRecord[]>()
        .exec(),
      Ticket.countDocuments({ againstId })
    ]);

    return { tickets, total };
  }

  async findAll(page: number = 1, limit: number = 10, status?: string): Promise<{ tickets: TicketRecord[]; total: number }> {
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
        .limit(limit)
        .lean<TicketRecord[]>()
        .exec(),
      Ticket.countDocuments(filter)
    ]);

    return { tickets, total };
  }

  async updateStatus(id: string, updateData: UpdateTicketStatusData): Promise<TicketRecord | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateFields: Record<string, unknown> = {
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
      .populate('resolvedBy', 'name')
      .lean<TicketRecord>()
      .exec();
  }

  async updateBanStatus(ticketId: string, isUserBanned?: boolean, isProBanned?: boolean): Promise<TicketRecord | null> {
    const updateFields: Record<string, boolean> = {};
    if (isUserBanned !== undefined) updateFields.isUserBanned = isUserBanned;
    if (isProBanned !== undefined) updateFields.isProBanned = isProBanned;
    
    return await Ticket.findByIdAndUpdate(ticketId, updateFields, { new: true })
      .populate('complainantId', 'name firstName lastName')
      .populate('againstId', 'name firstName lastName')
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name')
      .lean<TicketRecord>()
      .exec();
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
}
