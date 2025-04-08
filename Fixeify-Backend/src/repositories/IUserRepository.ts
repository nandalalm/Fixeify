import { IUser } from "../models/userModel";
import { UserResponse } from "../dtos/response/userDtos";

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  photo?: string | null;
  phoneNo?: string | null;
  address?: string | null;
}

export interface IUserRepository {
  findUserById(userId: string): Promise<IUser | null>; // Simplified return type
  createUser(userData: Partial<IUser>): Promise<IUser>;
  findUserByEmail(email: string): Promise<IUser | null>;
  getAllUsers(): Promise<UserResponse[]>;
  updateBanStatus(userId: string, isBanned: boolean): Promise<UserResponse | null>;
  getUsersWithPagination(skip: number, limit: number): Promise<UserResponse[]>;
  getTotalUsersCount(): Promise<number>;
}