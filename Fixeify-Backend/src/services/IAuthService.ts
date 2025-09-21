import { Request, Response } from "express";
import { UserResponse } from "../dtos/response/userDtos";
import { UserRole } from "../enums/roleEnum";

export interface IAuthService {
  sendOtp(email: string, role?: UserRole): Promise<void>;
  verifyOtp(email: string, otp: string): Promise<boolean>;
  isEmailVerified(email: string): Promise<boolean>;
  register(name: string, email: string, password: string, role: UserRole): Promise<any>;
  login(email: string, password: string, role: UserRole, res: Response): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
  }>;
  googleLogin(credential: string, role: UserRole, res: Response): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
  }>;
  refreshAccessToken(req: Request, res: Response): Promise<string>;
  getUserById(userId: string): Promise<UserResponse>;
  logout(refreshToken: string, role: UserRole, res: Response): Promise<void>;
  checkBanStatus(userId: string): Promise<{ isBanned: boolean }>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(userId: string, token: string, newPassword: string): Promise<void>;
}