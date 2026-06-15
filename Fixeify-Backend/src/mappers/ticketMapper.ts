import { Types } from "mongoose";
import type { TicketResponse } from "../dtos/response/ticketDto";
import type {
  TicketBookingReference,
  TicketPartyRecord,
  TicketPartyReference,
  TicketRecord,
  TicketResolverReference,
} from "../contracts/repository/ticketRecords";

const isTicketPartyRecord = (
  reference: TicketPartyReference
): reference is TicketPartyRecord => !(reference instanceof Types.ObjectId);

const getReferenceId = (
  reference: TicketBookingReference | TicketPartyReference | TicketResolverReference
): string => reference instanceof Types.ObjectId
  ? reference.toString()
  : reference._id.toString();

const getPartyName = (reference: TicketPartyReference): string => {
  if (!isTicketPartyRecord(reference)) {
    return "";
  }

  if (reference.name) {
    return reference.name;
  }

  const fullName = [reference.firstName, reference.lastName]
    .filter((name): name is string => Boolean(name))
    .join(" ");

  return fullName;
};

export const toTicketResponse = (ticket: TicketRecord): TicketResponse => ({
  _id: ticket._id.toString(),
  ticketId: ticket.ticketId,
  complainantType: ticket.complainantType,
  complainantId: getReferenceId(ticket.complainantId),
  complainantName: getPartyName(ticket.complainantId),
  againstType: ticket.againstType,
  againstId: getReferenceId(ticket.againstId),
  againstName: getPartyName(ticket.againstId),
  bookingId: getReferenceId(ticket.bookingId),
  subject: ticket.subject,
  description: ticket.description,
  status: ticket.status,
  priority: ticket.priority,
  adminComment: ticket.adminComment,
  resolvedBy: ticket.resolvedBy ? getReferenceId(ticket.resolvedBy) : undefined,
  resolvedAt: ticket.resolvedAt,
  isUserBanned: ticket.isUserBanned,
  isProBanned: ticket.isProBanned,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});
