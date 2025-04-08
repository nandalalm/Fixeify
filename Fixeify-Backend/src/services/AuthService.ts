import bcrypt from "bcryptjs";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserRepository } from "../repositories/IUserRepository";
import { IAdminRepository } from "../repositories/IAdminRepository";
import { generateAccessToken, generateRefreshToken } from "../utils/jwtUtils";
import { IUser } from "../models/userModel";
import { IAdmin } from "../models/adminModel";
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
    @inject(TYPES.IAdminRepository) private _adminRepository: IAdminRepository
  ) {
    this._redisClient.connect().catch((err) => logger.error("Failed to connect to Redis:", err));
    this._redisClient.on("error", (err) => logger.error("Redis error:", err));
  }

  async sendOtp(email: string): Promise<void> {
    const existingUser = await this._userRepository.findUserByEmail(email);
    if (existingUser) throw new HttpError(400, MESSAGES.EMAIL_PASSWORD_ROLE_REQUIRED);
    const existingAdmin = await this._adminRepository.findAdminByEmail(email);
    if (existingAdmin) throw new HttpError(400, MESSAGES.EMAIL_PASSWORD_ROLE_REQUIRED);

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
    role: UserRole
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
  }> {
    let user: IUser | IAdmin | null = null;

    if (role === UserRole.USER) {
      user = await this._userRepository.findUserByEmail(email);
    } else if (role === UserRole.PRO) {
      throw new HttpError(501, MESSAGES.SERVER_ERROR);
    } else if (role === UserRole.ADMIN) {
      user = await this._adminRepository.findAdminByEmail(email);
    } else {
      throw new HttpError(400, MESSAGES.ACCESS_DENIED);
    }

    if (!user) {
      throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
    }

    if (!(await bcrypt.compare(password, user.password))) {
      throw new HttpError(401, MESSAGES.INCORRECT_PASSWORD);
    }

    if ("isBanned" in user && user.isBanned) {
      throw new HttpError(403, MESSAGES.ACCOUNT_BANNED);
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await this._redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

    return {
      accessToken,
      refreshToken,
      user:
        role === UserRole.ADMIN
          ? new UserResponse(user.id, user.name, user.email, role, null, null, null, false)
          : new UserResponse(
              user.id,
              user.name,
              user.email,
              role,
              (user as IUser).photo ?? null,
              (user as IUser).phoneNo ?? null,
              (user as IUser).address ?? null,
              (user as IUser).isBanned
            ),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) throw new HttpError(500, MESSAGES.SERVER_ERROR);
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret) as { userId: string };
    } catch (err) {
      console.error("Token verification failed:", err);
      throw new HttpError(401, MESSAGES.INVALID_TOKEN);
    }

    const storedToken = await this._redisClient.get(`refresh:${decoded.userId}`);
    if (storedToken !== refreshToken) {
      throw new HttpError(401, MESSAGES.INVALID_TOKEN);
    }

    let user: IUser | IAdmin | null = await this._userRepository.findUserById(decoded.userId);
    if (!user) user = await this._adminRepository.findAdminById(decoded.userId);
    if (!user) throw new HttpError(401, MESSAGES.INVALID_TOKEN);

    if ("isBanned" in user && user.isBanned) {
      throw new HttpError(403, MESSAGES.ACCOUNT_BANNED);
    }

    return generateAccessToken(user.id);
  }

  async getUserById(userId: string): Promise<UserResponse> {
    let user: IUser | IAdmin | null = await this._userRepository.findUserById(userId);
    let role: UserRole = UserRole.USER;

    if (!user) {
      user = await this._adminRepository.findAdminById(userId);
      role = UserRole.ADMIN;
    }

    if (!user) throw new HttpError(404, MESSAGES.USER_NOT_FOUND);

    if ("isBanned" in user && user.isBanned) {
      throw new HttpError(403, MESSAGES.ACCOUNT_BANNED);
    }

    return role === UserRole.ADMIN
      ? new UserResponse(user.id, user.name, user.email, role, null, null, null, false)
      : new UserResponse(
          user.id,
          user.name,
          user.email,
          role,
          (user as IUser).photo ?? null,
          (user as IUser).phoneNo ?? null,
          (user as IUser).address ?? null,
          (user as IUser).isBanned
        );
  }

  async logout(refreshToken: string, role: UserRole): Promise<void> {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) throw new HttpError(500, MESSAGES.SERVER_ERROR);

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret) as { userId: string };
    } catch (err) {
      throw new HttpError(401, MESSAGES.INVALID_TOKEN);
    }

    let user: IUser | IAdmin | null = null;
    if (role === UserRole.USER) {
      user = await this._userRepository.findUserById(decoded.userId);
    } else if (role === UserRole.ADMIN) {
      user = await this._adminRepository.findAdminById(decoded.userId);
    } else {
      throw new HttpError(400, MESSAGES.ACCESS_DENIED);
    }

    if (!user) {
      throw new HttpError(404, MESSAGES.USER_NOT_FOUND);
    }

    await this._redisClient.del(`refresh:${decoded.userId}`);
  }
}