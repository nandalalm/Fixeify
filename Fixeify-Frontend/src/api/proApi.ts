import api from "./axios";
import { ProProfile, Availability } from "../interfaces/proInterface";
import { BookingResponse } from "../interfaces/bookingInterface";
import { QuotaRequest, QuotaResponse } from "../interfaces/quotaInterface";

export const getProProfile = async (userId: string): Promise<ProProfile> => {
  const response = await api.get(`/pro/fetchProfile/${userId}`, { withCredentials: true });
  const proData = response.data;
  return {
    id: proData._id,
    firstName: proData.firstName,
    lastName: proData.lastName,
    email: proData.email,
    phoneNumber: proData.phoneNumber,
    location: proData.location,
    profilePhoto: proData.profilePhoto,
    about: proData.about,
    isBanned: proData.isBanned,
  };
};

export const updateProProfile = async (userId: string, data: Partial<ProProfile>): Promise<ProProfile> => {
  const response = await api.put(`/pro/updateProfile/${userId}`, data, { withCredentials: true });
  const proData = response.data;
  return {
    id: proData._id,
    firstName: proData.firstName,
    lastName: proData.lastName,
    email: proData.email,
    phoneNumber: proData.phoneNumber,
    location: proData.location,
    profilePhoto: proData.profilePhoto,
    about: proData.about,
    isBanned: proData.isBanned,
  };
};

export const changeProPassword = async (
  userId: string,
  data: { currentPassword: string; newPassword: string }
): Promise<{ message: string }> => {
  const response = await api.put(`/pro/changePassword/${userId}`, data, { withCredentials: true });
  return response.data;
};

export const getProAvailability = async (userId: string): Promise<{ availability: Availability; isUnavailable: boolean }> => {
  const response = await api.get(`/pro/fetchAvailability/${userId}`, { withCredentials: true });
  return response.data;
};

export const updateProAvailability = async (userId: string, data: { availability: Availability; isUnavailable: boolean }): Promise<{ availability: Availability; isUnavailable: boolean }> => {
  const response = await api.put(`/pro/updateAvailability/${userId}`, data, { withCredentials: true });
  return response.data;
};

export const fetchProBookings = async (proId: string): Promise<BookingResponse[]> => {
  const response = await api.get(`/pro/bookings/${proId}`, { withCredentials: true });
  return response.data;
};

export const acceptBooking = async (bookingId: string): Promise<{ message: string }> => {
  const response = await api.put(`/pro/acceptBooking/${bookingId}`, {}, { withCredentials: true });
  return response.data;
};

export const rejectBooking = async (bookingId: string, reason: string): Promise<{ message: string }> => {
  const response = await api.put(`/pro/rejectBooking/${bookingId}`, { rejectedReason: reason }, { withCredentials: true });
  return response.data;
};

export const generateQuota = async (bookingId: string, data: QuotaRequest): Promise<QuotaResponse> => {
  const response = await api.post(`/pro/generateQuota/${bookingId}`, data, { withCredentials: true });
  return response.data;
};

export const fetchQuotaByBookingId = async (bookingId: string): Promise<QuotaResponse | null> => {
  const response = await api.get(`/pro/fetchQuota/${bookingId}`, { withCredentials: true });
  return response.data;
};