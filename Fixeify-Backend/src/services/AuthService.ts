import bcrypt from "bcryptjs";
import { IUserRepository } from "../repositories/IUserRepository";
import { IAdminRepository } from "../repositories/IAdminRepository";
import { generateAccessToken, generateRefreshToken } from "../utils/jwtUtils";
import { IUser } from "../models/UserModel";
import { IAdmin } from "../models/AdminModel";
import { UserResponse } from "../dtos/userDtos";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { createClient } from "redis";
import nodemailer from "nodemailer";

@injectable()
export class AuthService {
  private redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    socket: {
      keepAlive: 10000,
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    },
  });
  private transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  constructor(
    @inject(TYPES.IUserRepository) private userRepository: IUserRepository,
    @inject(TYPES.IAdminRepository) private adminRepository: IAdminRepository
  ) {
    this.redisClient.connect().catch((err) => {
      console.error("Failed to connect to Redis:", err);
    });
    this.redisClient.on("error", (err) => console.error("Redis error:", err));
  }

  async sendOtp(email: string): Promise<void> {
    const existingUser = await this.userRepository.findUserByEmail(email);
    if (existingUser) {
      throw new Error("Email already registered");
    }
    const existingAdmin = await this.adminRepository.findAdminByEmail(email);
    if (existingAdmin) {
      throw new Error("Email already registered");
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisClient.setEx(`otp:${email}`, 60, otp);

    const htmlEmail = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your OTP Code</title>
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden; }
          .header { background-color: #00205B; padding: 20px; text-align: center; }
          .header img { max-width: 150px; }
          .content { padding: 30px; text-align: center; }
          .otp { font-size: 36px; font-weight: bold; color: #00205B; margin: 20px 0; letter-spacing: 5px; }
          .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
          </div>
          <div class="content">
            <h1>Welcome to Fixeify!</h1>
            <p>Your One-Time Password (OTP) is ready. Use it to verify your email:</p>
            <div class="otp">${otp}</div>
            <p>This OTP expires in <strong>1 minute</strong>. Please use it soon!</p>
          </div>
          <div class="footer">
            <p>© 2025 Fixeify. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code",
        html: htmlEmail,
      });
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      throw new Error("Failed to send OTP email: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const storedOtp = await this.redisClient.get(`otp:${email}`);
    if (storedOtp && storedOtp === otp) {
      await this.redisClient.setEx(`verified:${email}`, 3600, "true");
      await this.redisClient.del(`otp:${email}`);
      return true;
    }
    return false;
  }

  async isEmailVerified(email: string): Promise<boolean> {
    const verified = await this.redisClient.get(`verified:${email}`);
    return verified === "true";
  }

  async register(name: string, email: string, password: string, role: "user" | "admin"): Promise<IUser | IAdmin> {
    const hashedPassword = await bcrypt.hash(password, 10);
    if (role === "user") {
      const user = await this.userRepository.createUser({
        name,
        email,
        password: hashedPassword,
      });
      return user;
    } else if (role === "admin") {
      const admin = await this.adminRepository.createAdmin({
        name,
        email,
        password: hashedPassword,
      });
      return admin;
    } else {
      throw new Error("Invalid role");
    }
  }

  async login(
    email: string,
    password: string,
    role: "user" | "pro" | "admin"
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
  }> {
    if (!role) throw new Error("Role is required");
    let user: IUser | IAdmin | null = null;

    if (role === "user") {
      user = await this.userRepository.findUserByEmail(email);
    } else if (role === "pro") {
      throw new Error("FixeifyPro authentication not implemented yet");
    } else if (role === "admin") {
      user = await this.adminRepository.findAdminByEmail(email);
    } else {
      throw new Error("Invalid role");
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error("Invalid credentials");
    }

    if ("isBanned" in user && user.isBanned) {
      throw new Error("Your account is banned. Please contact support.");
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    return { accessToken, refreshToken, user: new UserResponse(user.name, user.email, role) };
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) throw new Error("REFRESH_TOKEN_SECRET not set");
    const decoded = require("jsonwebtoken").verify(refreshToken, secret) as { userId: string };
    let user: IUser | IAdmin | null = null;
    user = await this.userRepository.findUserByEmail(decoded.userId);
    if (!user) {
      user = await this.adminRepository.findAdminByEmail(decoded.userId);
    }
    if (!user) throw new Error("Invalid refresh token");
    return generateAccessToken(user.id);
  }
}