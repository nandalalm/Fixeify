import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IUserRepository } from "../repositories/IUserRepository";
import { IUserService } from "./IUserService";
import { UserResponse } from "../dtos/response/userDtos";
import { UserRole } from "../enums/roleEnum";
import { IUser } from "../models/userModel";
import { HttpError } from "../middleware/errorMiddleware";
import { MESSAGES } from "../constants/messages";
import bcrypt from "bcryptjs";

@injectable()
export class UserService implements IUserService {
  constructor(@inject(TYPES.IUserRepository) private _userRepository: IUserRepository) {}

  async getUserProfile(userId: string): Promise<UserResponse | null> {
    const user = await this._userRepository.findUserById(userId);
    if (!user) return null;
    return this.mapToUserResponse(user);
  }

  async updateUserProfile(userId: string, data: {
    name: string;
    email?: string; // Email is optional and ignored
    phoneNo: string | null;
    address?: {
      address: string;
      city: string;
      state: string;
      coordinates: { type: "Point"; coordinates: [number, number] };
    } | null;
    photo?: string | null;
  }): Promise<UserResponse | null> {
    const user = await this._userRepository.findUserById(userId);
    if (!user) return null;

    const updateData: Partial<IUser> = {
      name: data.name || user.name,
      email: user.email, // Always use existing email, ignore data.email
      phoneNo: data.phoneNo !== undefined ? data.phoneNo : user.phoneNo,
      address: data.address !== undefined ? data.address : user.address,
      photo: data.photo !== undefined ? data.photo : user.photo,
    };

    const updatedUser = await this._userRepository.updateUser(userId, updateData);
    if (!updatedUser) return null;

    return this.mapToUserResponse(updatedUser);
  }

  async changePassword(userId: string, data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<UserResponse | null> {
    const user = await this._userRepository.findUserById(userId);
    if (!user) return null;

    // Verify current password
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new HttpError(400, MESSAGES.INCORRECT_PASSWORD);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);

    // Update user with new password
    const updateData: Partial<IUser> = {
      password: hashedNewPassword,
    };

    const updatedUser = await this._userRepository.updateUser(userId, updateData);
    if (!updatedUser) return null;

    return this.mapToUserResponse(updatedUser);
  }

  private mapToUserResponse(user: IUser): UserResponse {
    return new UserResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: UserRole.USER,
      photo: user.photo ?? null,
      phoneNo: user.phoneNo ?? null,
      address: user.address ? {
        address: user.address.address,
        city: user.address.city,
        state: user.address.state,
        coordinates: user.address.coordinates,
      } : null,
      isBanned: user.isBanned,
    });
  }
}