import { UserResponse } from "../dtos/response/userDtos";
import { UserRole } from "../enums/roleEnum";

export interface IAuthService {
  sendOtp(email: string): Promise<void>;
  verifyOtp(email: string, otp: string): Promise<boolean>;
  isEmailVerified(email: string): Promise<boolean>;
  register(name: string, email: string, password: string, role: UserRole): Promise<any>;
  login(email: string, password: string, role: UserRole): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
  }>;
  refreshAccessToken(refreshToken: string): Promise<string>;
  getUserById(userId: string): Promise<UserResponse>;
  logout(refreshToken: string, role: UserRole): Promise<void>; // New method
}