// services/authService.ts
import bcrypt from "bcryptjs";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserRepository } from "../repositories/IUserRepository";
import { IAdminRepository } from "../repositories/IAdminRepository";
import { IProRepository } from "../repositories/IProRepository";
import { generateAccessToken, generateRefreshToken } from "../utils/jwtUtils";
import { IUser } from "../models/userModel";
import { IAdmin } from "../models/adminModel";
import { ApprovedProDocument } from "../models/approvedProModel";
import { UserResponse } from "../dtos/response/userDtos";
import { createClient } from "redis";
import nodemailer from "nodemailer";
import { UserRole } from "../enums/roleEnum";
import { getOtpEmailTemplate } from "../utils/emailTemplates";
import { IAuthService } from "./IAuthService";
import { HttpError } from "../middleware/errorMiddleware";
import logger from "../config/logger";
import { mapUserDtoToModel } from "../utils/mappers";
import { MESSAGES } from "../constants/messages";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";

@injectable()
export class AuthService implements IAuthService {
  private _redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: {
      keepAlive: 10000,
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    },
  });
  private _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  constructor(
    @inject(TYPES.IUserRepository) private _userRepository: IUserRepository,
    @inject(TYPES.IAdminRepository) private _adminRepository: IAdminRepository,
    @inject(TYPES.IProRepository) private _proRepository: IProRepository
  ) {
    this._redisClient.connect().catch((err) => logger.error("Failed to connect to Redis:", err));
    this._redisClient.on("error", (err) => logger.error("Redis error:", err));
  }

  async sendOtp(email: string): Promise<void> {
    const existingUser = await this._userRepository.findUserByEmail(email);
    if (existingUser) throw new HttpError(400, MESSAGES.EMAIL_PASSWORD_ROLE_REQUIRED);
    const existingAdmin = await this._adminRepository.findAdminByEmail(email);
    if (existingAdmin) throw new HttpError(400, MESSAGES.EMAIL_PASSWORD_ROLE_REQUIRED);
    const existingPro = await this._proRepository.findApprovedProByEmail(email);
    if (existingPro) throw new HttpError(400, MESSAGES.EMAIL_PASSWORD_ROLE_REQUIRED);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this._redisClient.setEx(`otp:${email}`, 60, otp);

    try {
      await this._transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code",
        html: getOtpEmailTemplate(otp),
      });
    } catch (error) {
      logger.error("Failed to send OTP email:", error);
      throw new HttpError(500, MESSAGES.SERVER_ERROR);
    }
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const storedOtp = await this._redisClient.get(`otp:${email}`);
    if (storedOtp && storedOtp === otp) {
      await this._redisClient.setEx(`verified:${email}`, 3600, "true");
      await this._redisClient.del(`otp:${email}`);
      return true;
    }
    return false;
  }

  async isEmailVerified(email: string): Promise<boolean> {
    const verified = await this._redisClient.get(`verified:${email}`);
    return verified === "true";
  }

  async register(name: string, email: string, password: string, role: UserRole): Promise<IUser | IAdmin> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = mapUserDtoToModel({ name, email, password: hashedPassword });
    if (role === UserRole.USER) {
      return this._userRepository.createUser(userData);
    } else if (role === UserRole.ADMIN) {
      return this._adminRepository.createAdmin(userData);
    } else {
      throw new HttpError(400, MESSAGES.ACCESS_DENIED);
    }
  }

  async login(
    email: string,
    password: string,
    role: UserRole,
    res: Response
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
  }> {
    let user: IUser | IAdmin | ApprovedProDocument | null = null;
    let actualRole: UserRole;

    // Check all possible account types
    const userRecord = await this._userRepository.findUserByEmail(email);
    const adminRecord = await this._adminRepository.findAdminByEmail(email);
    const proRecord = await this._proRepository.findApprovedProByEmail(email);

    if (userRecord) {
      user = userRecord;
      actualRole = UserRole.USER;
    } else if (adminRecord) {
      user = adminRecord;
      actualRole = UserRole.ADMIN;
    } else if (proRecord) {
      user = proRecord;
      actualRole = UserRole.PRO;
    } else {
      throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
    }

    // Verify role match
    if (role !== actualRole) {
      throw new HttpError(400, MESSAGES.INVALID_ROLE);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(401, MESSAGES.INCORRECT_PASSWORD);
    }

    // Check if banned
    if ("isBanned" in user && user.isBanned) {
      throw new HttpError(403, MESSAGES.ACCOUNT_BANNED);
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await this._redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userResponse = new UserResponse({
      id: user.id,
      name:
        "name" in user
          ? user.name
          : `${(user as ApprovedProDocument).firstName || ""} ${(user as ApprovedProDocument).lastName || ""}`.trim(),
      email: user.email,
      role: actualRole,
      isBanned: "isBanned" in user ? user.isBanned : false,
    });

    return {
      accessToken,
      refreshToken,
      user: userResponse,
    };
  }

  async refreshAccessToken(req: Request, res: Response): Promise<string> {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) throw new HttpError(500, MESSAGES.SERVER_ERROR);

    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw new HttpError(401, MESSAGES.INVALID_TOKEN);

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret) as { userId: string };
    } catch (err) {
      console.error("Token verification failed:", err);
      throw new HttpError(401, MESSAGES.INVALID_TOKEN);
    }

    const storedToken = await this._redisClient.get(`refresh:${decoded.userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new HttpError(401, MESSAGES.INVALID_TOKEN);
    }

    let user: IUser | IAdmin | ApprovedProDocument | null = await this._userRepository.findUserById(decoded.userId);
    if (!user) user = await this._adminRepository.findAdminById(decoded.userId);
    if (!user) user = await this._proRepository.findApprovedProById(decoded.userId);
    if (!user) throw new HttpError(401, MESSAGES.INVALID_TOKEN);

    if ("isBanned" in user && user.isBanned) {
      throw new HttpError(403, MESSAGES.ACCOUNT_BANNED);
    }

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    await this._redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, newRefreshToken);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return newAccessToken;
  }

  async getUserById(userId: string): Promise<UserResponse> {
    let user: IUser | IAdmin | ApprovedProDocument | null = await this._userRepository.findUserById(userId);
    let role: UserRole = UserRole.USER;

    if (!user) {
      user = await this._adminRepository.findAdminById(userId);
      role = UserRole.ADMIN;
    }
    if (!user) {
      user = await this._proRepository.findApprovedProById(userId);
      role = UserRole.PRO;
    }

    if (!user) throw new HttpError(404, MESSAGES.USER_NOT_FOUND);

    if ("isBanned" in user && user.isBanned) {
      throw new HttpError(403, MESSAGES.ACCOUNT_BANNED);
    }

    return new UserResponse({
      id: user.id,
      name:
        "name" in user
          ? user.name
          : `${(user as ApprovedProDocument).firstName || ""} ${(user as ApprovedProDocument).lastName || ""}`.trim(),
      email: user.email,
      role,
      isBanned: "isBanned" in user ? user.isBanned : false,
    });
  }

  async logout(refreshToken: string, role: UserRole, res: Response): Promise<void> {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) throw new HttpError(500, MESSAGES.SERVER_ERROR);

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret) as { userId: string };
    } catch (err) {
      throw new HttpError(401, MESSAGES.INVALID_TOKEN);
    }

    let user: IUser | IAdmin | ApprovedProDocument | null = null;
    if (role === UserRole.USER) {
      user = await this._userRepository.findUserById(decoded.userId);
    } else if (role === UserRole.ADMIN) {
      user = await this._adminRepository.findAdminById(decoded.userId);
    } else if (role === UserRole.PRO) {
      user = await this._proRepository.findApprovedProById(decoded.userId);
    } else {
      throw new HttpError(400, MESSAGES.ACCESS_DENIED);
    }

    if (!user) {
      throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
    }

    await this._redisClient.del(`refresh:${decoded.userId}`);
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }
}