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
      if (!email || !otp) throw new HttpError(400, MESSAGES.EMAIL_OTP_REQUIRED);
      const isValid = await this._authService.verifyOtp(email, otp);
      if (isValid) {
        res.status(200).json({ message: MESSAGES.OTP_VERIFIED });
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

   async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { credential, role } = req.body;
      if (!credential || !role) {
        throw new HttpError(400, "Credential and role are required");
      }
      if (role !== UserRole.USER) {
        throw new HttpError(400, "Google login is only available for users");
      }
      const loginResult = await this._authService.googleLogin(credential, role, res);
      res.status(200).json(new LoginResponse(loginResult.accessToken, loginResult.user));
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) throw new HttpError(401, MESSAGES.NO_REFRESH_TOKEN);
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
      if (!userId) throw new HttpError(401, MESSAGES.UNAUTHORIZED);
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
        throw new HttpError(401, MESSAGES.NO_REFRESH_TOKEN);
      }
      if (!role || ![UserRole.USER, UserRole.ADMIN, UserRole.PRO].includes(role)) {
        throw new HttpError(400, MESSAGES.VALID_ROLE_REQUIRED);
      }
      await this._authService.logout(refreshToken, role, res);
      res.status(200).json({ message: MESSAGES.LOGGED_OUT });
    } catch (error) {
      next(error);
    }
  }

  async checkBanStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      if (!userId) throw new HttpError(400, MESSAGES.USERID_REQUIRED);
      const result = await this._authService.checkBanStatus(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) throw new HttpError(400, MESSAGES.EMAIL_REQUIRED);
      await this._authService.requestPasswordReset(email);
      res.status(200).json({ message: "Password reset link sent to your email" });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, token, newPassword } = req.body;
      if (!userId || !token || !newPassword) {
        throw new HttpError(400, "User ID, token, and new password are required");
      }
      await this._authService.resetPassword(userId, token, newPassword);
      res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      next(error);
    }
  }
}