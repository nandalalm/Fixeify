import { UserResponse } from "../dtos/response/userDtos";
import { IPendingPro } from "../models/pendingProModel";
import { IApprovedPro } from "../models/approvedProModel";
import { ProResponse } from "../dtos/response/proDtos";

export interface IAdminService {
  getUsers(page: number, limit: number): Promise<{ users: UserResponse[]; total: number }>;
  banUser(userId: string, isBanned: boolean): Promise<UserResponse | null>;
  banPro(proId: string, isBanned: boolean): Promise<ProResponse | null>;
  getPendingPros(page: number, limit: number): Promise<{ pros: IPendingPro[]; total: number }>;
  getPendingProById(id: string): Promise<IPendingPro>;
  approvePro(id: string, about: string): Promise<void>;
  rejectPro(id: string, reason: string): Promise<void>;
  getApprovedPros(page: number, limit: number): Promise<{ pros: ProResponse[]; total: number }>;
  getApprovedProById(id: string): Promise<ProResponse>;
}
