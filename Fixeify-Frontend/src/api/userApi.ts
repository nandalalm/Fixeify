import api from "./axios";
import { UserProfile } from "../interfaces/userInterface";
import { IApprovedPro, ILocation, ITimeSlot } from "../interfaces/adminInterface";
import { BookingResponse } from "../interfaces/bookingInterface";

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await api.get(`/user/fetchProfile/${userId}`, { withCredentials: true });
  return response.data;
};

export const updateUserProfile = async (userId: string, data: Partial<Omit<UserProfile, "email">>): Promise<UserProfile> => {
  const response = await api.put(`/user/updateProfile/${userId}`, data, { withCredentials: true });
  return response.data;
};

export const changeUserPassword = async (
  userId: string,
  data: { currentPassword: string; newPassword: string }
): Promise<{ message: string }> => {
  const response = await api.put(`/user/changePassword/${userId}`, data, { withCredentials: true });
  return response.data;
};

export const getNearbyPros = async (categoryId: string, longitude: number, latitude: number): Promise<IApprovedPro[]> => {
  const response = await api.get("/user/nearbyPros", {
    params: { categoryId, longitude, latitude },
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
    "/user/book",
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
  const response = await api.get(`/user/bookings/${userId}`, {
    withCredentials: true,
    params: { page, limit },
  });
  return response.data; 
};

export const fetchBookingHistoryDetails = async (userId: string, page: number = 1, limit: number = 5): Promise<{ bookings: BookingResponse[]; total: number }> => {
  const response = await api.get(`/user/bookings/history/${userId}`, {
    withCredentials: true,
    params: { page, limit },
  });
  return response.data; 
};

export const createPaymentIntent = async (bookingId: string, amount: number): Promise<{ clientSecret: string }> => {
  const response = await api.post(`/user/create-payment-intent`, { bookingId, amount }, { withCredentials: true });
  return response.data;
};

export const cancelBooking = async (userId: string, bookingId: string, cancelReason: string): Promise<BookingResponse> => {
  const response = await api.post(`/user/bookings/${userId}/cancel`, { bookingId, cancelReason }, { withCredentials: true });
  return response.data;
};