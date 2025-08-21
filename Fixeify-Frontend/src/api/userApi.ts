import api from "./axios";
import { UserProfile } from "../interfaces/userInterface";
import { IApprovedPro, ILocation, ITimeSlot } from "../interfaces/adminInterface";
import { BookingResponse, BookingCompleteResponse } from "../interfaces/bookingInterface";
import { UserBase } from "@/Constants/BaseRoutes";

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await api.get(`${UserBase}/fetchProfile/${userId}`, { withCredentials: true });
  return response.data;
};

export const updateUserProfile = async (userId: string, data: Partial<Omit<UserProfile, "email">>): Promise<UserProfile> => {
  const response = await api.put(`${UserBase}/updateProfile/${userId}`, data, { withCredentials: true });
  return response.data;
};

export const changeUserPassword = async (
  userId: string,
  data: { currentPassword: string; newPassword: string }
): Promise<{ message: string }> => {
  const response = await api.put(`${UserBase}/changePassword/${userId}`, data, { withCredentials: true });
  return response.data;
};

export const getNearbyPros = async (
  categoryId: string, 
  longitude: number, 
  latitude: number, 
  page: number = 1, 
  limit: number = 5, 
  sortBy: string = 'nearest', 
  availabilityFilter?: string
): Promise<{ pros: IApprovedPro[]; total: number; hasMore: boolean }> => {
  const params: any = { categoryId, longitude, latitude, page, limit, sortBy };
  if (availabilityFilter) {
    params.availabilityFilter = availabilityFilter;
  }
  
  const response = await api.get(`${UserBase}/nearbyPros`, {
    params,
    withCredentials: true,
  });
  return response.data;
};

export const createBooking = async (
  userId: string,
  proId: string,
  bookingData: {
    categoryId: string;
    issueDescription: string;
    location: ILocation;
    phoneNumber: string;
    preferredDate: string;
    preferredTime: ITimeSlot[];
  }
): Promise<BookingResponse> => {
  const response = await api.post(
    `${UserBase}/book`,
    {
      userId,
      proId,
      ...bookingData,
    },
    { withCredentials: true }
  );
  return response.data;
};

export const fetchBookingDetails = async (userId: string, page: number = 1, limit: number = 5): Promise<{ bookings: BookingResponse[]; total: number }> => {
  const response = await api.get(`${UserBase}/bookings/${userId}`, {
    withCredentials: true,
    params: { page, limit },
  });
  return response.data; 
};

export const fetchBookingHistoryDetails = async (userId: string, page: number = 1, limit: number = 5): Promise<{ bookings: BookingResponse[]; total: number }> => {
  const response = await api.get(`${UserBase}/bookings/history/${userId}`, {
    withCredentials: true,
    params: { page, limit },
  });
  return response.data; 
};

export const createPaymentIntent = async (bookingId: string, amount: number): Promise<{ clientSecret: string }> => {
  const response = await api.post(`${UserBase}/create-payment-intent`, { bookingId, amount }, { withCredentials: true });
  return response.data;
};

export const cancelBooking = async (userId: string, bookingId: string, cancelReason: string): Promise<BookingResponse> => {
  const response = await api.post(`${UserBase}/bookings/${userId}/cancel`, { bookingId, cancelReason }, { withCredentials: true });
  return response.data;
};

export const fetchBookingById = async (bookingId: string): Promise<BookingCompleteResponse> => {
  const response = await api.get(`${UserBase}/booking/${bookingId}`, { withCredentials: true });
  return response.data;
};

export const fetchQuotaByBookingId = async (bookingId: string): Promise<any> => {
  const response = await api.get(`${UserBase}/quota/by-booking/${bookingId}`, { withCredentials: true });
  return response.data;
};