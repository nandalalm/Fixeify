import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";
import { LoginResponse } from "../dtos/userDtos";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";

@injectable()
export class AuthController {
  constructor(@inject(TYPES.AuthService) private authService: AuthService) {}

  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }
      await this.authService.sendOtp(email);
      res.status(200).json({ message: "OTP sent to email" });
    } catch (error) {
      console.error("Error in sendOtp:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        res.status(400).json({ message: "Email and OTP are required" });
        return;
      }
      const isValid = await this.authService.verifyOtp(email, otp);
      if (isValid) {
        res.status(200).json({ message: "OTP verified" });
      } else {
        res.status(400).json({ message: "Invalid or expired OTP" });
      }
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password || !role) {
        res.status(400).json({ message: "Name, email, password, and role are required" });
        return;
      }
      if (role === "user") {
        const isVerified = await this.authService.isEmailVerified(email);
        if (!isVerified) {
          res.status(403).json({ message: "Email not verified" });
          return;
        }
      }
      await this.authService.register(name, email, password, role);
      const loginResult = await this.authService.login(email, password, role);
      res.cookie("refreshToken", loginResult.refreshToken, { httpOnly: true, secure: true });
      res.status(201).json(new LoginResponse(loginResult.accessToken, loginResult.user));
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, role } = req.body;
      if (!email || !password || !role) {
        res.status(400).json({ message: "Email, password, and role are required" });
        return;
      }
      const loginResult = await this.authService.login(email, password, role);
      res.cookie("refreshToken", loginResult.refreshToken, { httpOnly: true, secure: true });
      res.json(new LoginResponse(loginResult.accessToken, loginResult.user));
    } catch (error) {
      res.status(401).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ message: "No refresh token provided" });
        return;
      }
      const accessToken = await this.authService.refreshAccessToken(refreshToken);
      res.status(200).json({ accessToken });
    } catch (error) {
      res.status(401).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  }
}