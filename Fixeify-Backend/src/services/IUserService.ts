import { UserResponse } from "../dtos/response/userDtos";
import { ProResponse } from "../dtos/response/proDtos";
import { BookingResponse } from "../dtos/response/bookingDtos";

export interface IUserService {
  getUserProfile(userId: string): Promise<UserResponse | null>;
  updateUserProfile(
    userId: string,
    data: {
      name: string;
      email: string;
      phoneNo: string | null;
      address?: {
        address: string;
        city: string;
        state: string;
        coordinates: { type: "Point"; coordinates: [number, number] };
      } | null;
      photo?: string | null;
    }
  ): Promise<UserResponse | null>;
  changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<UserResponse | null>;
  getNearbyPros(categoryId: string, longitude: number, latitude: number): Promise<ProResponse[]>;
  createBooking(
    userId: string,
    proId: string,
    bookingData: {
      categoryId: string;
      issueDescription: string;
      location: {
        address: string;
        city: string;
        state: string;
        coordinates: { type: "Point"; coordinates: [number, number] };
      };
      phoneNumber: string;
      preferredDate: Date;
      preferredTime: string;
    }
  ): Promise<BookingResponse>;
  fetchBookingDetails(userId: string): Promise<BookingResponse[]>;
}