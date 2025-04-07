import { IUser } from "../models/UserModel";

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  photo?: string | null;
  phoneNo?: string | null;
  address?: string | null;
}

export interface IUserRepository {
  createUser(userData: Partial<IUser>): Promise<IUser>;
  findUserByEmail(email: string): Promise<IUser | null>;
  updateRefreshToken(userId: string, refreshToken: string): Promise<IUser | null>;
  getAllUsers(): Promise<IUser[]>;
  updateBanStatus(userId: string, isBanned: boolean): Promise<IUser | null>;
}