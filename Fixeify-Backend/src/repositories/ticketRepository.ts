import mongoose from "mongoose";
import Ticket from "../models/ticketModel";
import User from "../models/userModel";
import { ApprovedProModel } from "../models/approvedProModel";
import { ITicketRepository } from "./ITicketRepository";
import { injectable } from "inversify";
import type {
  CreateTicketData,
  TicketPartyRecord,
  TicketPartyReference,
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
    const ticket = await Ticket.findById(id)
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name')
      .lean<TicketRecord>()
      .exec();

    return ticket ? this.populateTicketParties([ticket]).then(([populatedTicket]) => populatedTicket) : null;
  }

  async findByTicketId(ticketId: string): Promise<TicketRecord | null> {
    const ticket = await Ticket.findOne({ ticketId })
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name')
      .lean<TicketRecord>()
      .exec();

    return ticket ? this.populateTicketParties([ticket]).then(([populatedTicket]) => populatedTicket) : null;
  }

  async findByComplainant(complainantId: string, page: number = 1, limit: number = 10): Promise<{ tickets: TicketRecord[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [tickets, total] = await Promise.all([
      Ticket.find({ complainantId })
        .populate('bookingId', 'issueDescription preferredDate status')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<TicketRecord[]>()
        .exec(),
      Ticket.countDocuments({ complainantId })
    ]);

    return { tickets: await this.populateTicketParties(tickets), total };
  }

  async findByAgainst(againstId: string, page: number = 1, limit: number = 10): Promise<{ tickets: TicketRecord[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [tickets, total] = await Promise.all([
      Ticket.find({ againstId })
        .populate('bookingId', 'issueDescription preferredDate status')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<TicketRecord[]>()
        .exec(),
      Ticket.countDocuments({ againstId })
    ]);

    return { tickets: await this.populateTicketParties(tickets), total };
  }

  async findAll(page: number = 1, limit: number = 10, status?: string): Promise<{ tickets: TicketRecord[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter = status ? { status } : {};
    
    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('bookingId', 'issueDescription preferredDate status')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<TicketRecord[]>()
        .exec(),
      Ticket.countDocuments(filter)
    ]);

    return { tickets: await this.populateTicketParties(tickets), total };
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

    const ticket = await Ticket.findByIdAndUpdate(id, updateFields, { new: true })
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name')
      .lean<TicketRecord>()
      .exec();

    return ticket ? this.populateTicketParties([ticket]).then(([populatedTicket]) => populatedTicket) : null;
  }

  async updateBanStatus(ticketId: string, isUserBanned?: boolean, isProBanned?: boolean): Promise<TicketRecord | null> {
    const updateFields: Record<string, boolean> = {};
    if (isUserBanned !== undefined) updateFields.isUserBanned = isUserBanned;
    if (isProBanned !== undefined) updateFields.isProBanned = isProBanned;
    
    const ticket = await Ticket.findByIdAndUpdate(ticketId, updateFields, { new: true })
      .populate('bookingId', 'issueDescription preferredDate status')
      .populate('resolvedBy', 'name')
      .lean<TicketRecord>()
      .exec();

    return ticket ? this.populateTicketParties([ticket]).then(([populatedTicket]) => populatedTicket) : null;
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

  private async populateTicketParties(tickets: TicketRecord[]): Promise<TicketRecord[]> {
    const userIds = new Set<string>();
    const proIds = new Set<string>();

    for (const ticket of tickets) {
      this.collectPartyId(ticket.complainantType, ticket.complainantId, userIds, proIds);
      this.collectPartyId(ticket.againstType, ticket.againstId, userIds, proIds);
    }

    const [users, pros] = await Promise.all([
      userIds.size > 0
        ? User.find({ _id: { $in: this.toObjectIds(userIds) } })
          .select("name")
          .lean<TicketPartyRecord[]>()
          .exec()
        : Promise.resolve([] as TicketPartyRecord[]),
      proIds.size > 0
        ? ApprovedProModel.find({ _id: { $in: this.toObjectIds(proIds) } })
          .select("firstName lastName")
          .lean<TicketPartyRecord[]>()
          .exec()
        : Promise.resolve([] as TicketPartyRecord[]),
    ]);

    const partiesByKey = new Map<string, TicketPartyRecord>();
    for (const user of users) {
      partiesByKey.set(`user:${user._id.toString()}`, user);
    }
    for (const pro of pros) {
      partiesByKey.set(`pro:${pro._id.toString()}`, pro);
    }

    return tickets.map((ticket) => ({
      ...ticket,
      complainantId: this.getPartyRecord(
        ticket.complainantType,
        ticket.complainantId,
        partiesByKey
      ),
      againstId: this.getPartyRecord(ticket.againstType, ticket.againstId, partiesByKey),
    }));
  }

  private collectPartyId(
    partyType: "user" | "pro",
    reference: TicketPartyReference,
    userIds: Set<string>,
    proIds: Set<string>
  ): void {
    const partyId = this.getPartyId(reference);
    if (partyType === "user") {
      userIds.add(partyId);
      return;
    }

    proIds.add(partyId);
  }

  private getPartyRecord(
    partyType: "user" | "pro",
    reference: TicketPartyReference,
    partiesByKey: Map<string, TicketPartyRecord>
  ): TicketPartyReference {
    return partiesByKey.get(`${partyType}:${this.getPartyId(reference)}`) ?? reference;
  }

  private getPartyId(reference: TicketPartyReference): string {
    return reference instanceof mongoose.Types.ObjectId
      ? reference.toString()
      : reference._id.toString();
  }

  private toObjectIds(ids: Set<string>): mongoose.Types.ObjectId[] {
    return Array.from(ids, (id) => new mongoose.Types.ObjectId(id));
  }
}
