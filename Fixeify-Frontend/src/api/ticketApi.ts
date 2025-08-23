import api from "./axios";
import { CreateTicketRequest, TicketListResponse, TicketResponse, UpdateTicketStatusRequest } from "../interfaces/ticketInterface";
import { TicketBase } from "@/Constants/BaseRoutes";

export const createTicket = async (payload: CreateTicketRequest): Promise<TicketResponse> => {
  const res = await api.post(TicketBase + "/", payload, { withCredentials: true });
  return res.data.data ?? res.data; 
};

export const getTicketsByComplainant = async (
  complainantId: string,
  page: number = 1,
  limit: number = 10,
  sort?: string
): Promise<TicketListResponse> => {
  const res = await api.get(`${TicketBase}/complainant/${complainantId}`, {
    params: { page, limit, sort },
    withCredentials: true,
  });
  return res.data.data ?? res.data;
};

export const updateTicketStatus = async (
  id: string,
  payload: UpdateTicketStatusRequest
): Promise<TicketResponse> => {
  const res = await api.put(`${TicketBase}/${id}/status`, payload, { withCredentials: true });
  return res.data.data ?? res.data;
};

export const getTicketById = async (id: string): Promise<TicketResponse> => {
  const res = await api.get(`${TicketBase}/${id}`, { withCredentials: true });
  return res.data.data ?? res.data;
};

export const getAllTickets = async (
  page: number = 1,
  limit: number = 10,
  status?: string,
  sort?: string
): Promise<TicketListResponse> => {
  const res = await api.get(TicketBase + "/", { params: { page, limit, status, sort }, withCredentials: true });
  return res.data.data ?? res.data;
};

export const updateTicketBanStatus = async (
  ticketId: string,
  isUserBanned?: boolean,
  isProBanned?: boolean
): Promise<TicketResponse> => {
  const res = await api.put(`${TicketBase}/${ticketId}/ban-status`, 
    { isUserBanned, isProBanned }, 
    { withCredentials: true }
  );
  return res.data.data ?? res.data;
};
