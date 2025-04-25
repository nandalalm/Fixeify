import { Request, Response, NextFunction } from "express"; 
import { AuthService } from "../services/AuthService";
import { LoginResponse } from "../dtos/response/userDtos";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { MESSAGES } from "../constants/messages";
import { HttpError } from "../middleware/errorMiddleware";
import { UserRole } from "../enums/roleEnum";

interface AuthRequest extends Request {
  userId?: string;
}

@injectable()
export class AuthController {
  constructor(@inject(TYPES.AuthService) private _authService: AuthService) {}

  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) throw new HttpError(400, MESSAGES.EMAIL_REQUIRED);
      await this._authService.sendOtp(email);
      res.status(200).json({ message: MESSAGES.OTP_SENT });
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) throw new HttpError(400, "Email and OTP are required");
      const isValid = await this._authService.verifyOtp(email, otp);
      if (isValid) {
        res.status(200).json({ message: "OTP verified" });
      } else {
        throw new HttpError(400, MESSAGES.INVALID_OTP);
      }
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password || !role) {
        throw new HttpError(400, MESSAGES.NAME_EMAIL_PASSWORD_ROLE_REQUIRED);
      }
      if (role === "user") {
        const isVerified = await this._authService.isEmailVerified(email);
        if (!isVerified) throw new HttpError(403, MESSAGES.EMAIL_NOT_VERIFIED);
      }
      await this._authService.register(name, email, password, role);
      const loginResult = await this._authService.login(email, password, role, res);
      res.status(201).json(new LoginResponse(loginResult.accessToken, loginResult.user));
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, role } = req.body;
      if (!email || !password || !role) {
        throw new HttpError(400, MESSAGES.EMAIL_PASSWORD_ROLE_REQUIRED);
      }
      const loginResult = await this._authService.login(email, password, role, res);
      res.status(200).json(new LoginResponse(loginResult.accessToken, loginResult.user));
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) throw new HttpError(401, "No refresh token provided");
      const accessToken = await this._authService.refreshAccessToken(req, res);
      res.status(200).json({ accessToken });
    } catch (error) {
      console.error("Refresh token error:", error);
      next(error);
    }
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) throw new HttpError(401, "Unauthorized");
      const user = await this._authService.getUserById(userId);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role } = req.body;
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new HttpError(401, "No refresh token provided");
      }
      if (!role || ![UserRole.USER, UserRole.ADMIN, UserRole.PRO].includes(role)) {
        throw new HttpError(400, "Valid role (user or admin) is required");
      }
      await this._authService.logout(refreshToken, role, res);
      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }
}