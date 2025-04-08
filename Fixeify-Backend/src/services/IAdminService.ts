import { UserResponse } from "../dtos/response/userDtos";
import { IPendingPro } from "../models/pendingProModel"; // Import IPendingPro

export interface IAdminService {
  getUsers(page: number, limit: number): Promise<{ users: UserResponse[]; total: number }>;
  banUser(userId: string, isBanned: boolean): Promise<UserResponse | null>;
  getPendingPros(page: number, limit: number): Promise<{ pros: IPendingPro[]; total: number }>;
  getPendingProById(id: string): Promise<IPendingPro>; // Add this
}