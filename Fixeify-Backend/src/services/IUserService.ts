import { UserResponse } from "../dtos/response/userDtos";

export interface IUserService {
  getUserProfile(userId: string): Promise<UserResponse | null>;
  updateUserProfile(userId: string, data: {
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
  }): Promise<UserResponse | null>;
  changePassword(userId: string, data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<UserResponse | null>;
}