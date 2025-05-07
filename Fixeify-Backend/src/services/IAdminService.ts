import { UserResponse } from "../dtos/response/userDtos";
import { ProResponse, PendingProResponse } from "../dtos/response/proDtos";
import { CategoryResponse } from "../dtos/response/categoryDtos";

export interface IAdminService {
  getUsers(page: number, limit: number): Promise<{ users: UserResponse[]; total: number }>;
  banUser(userId: string, isBanned: boolean): Promise<UserResponse | null>;
  banPro(proId: string, isBanned: boolean): Promise<ProResponse | null>;
  getPendingPros(page: number, limit: number): Promise<{ pros: PendingProResponse[]; total: number }>;
  getPendingProById(id: string): Promise<PendingProResponse>;
  approvePro(id: string, about: string): Promise<void>;
  rejectPro(id: string, reason: string): Promise<void>;
  getApprovedPros(page: number, limit: number): Promise<{ pros: ProResponse[]; total: number }>;
  getApprovedProById(id: string): Promise<ProResponse>;
  createCategory(name: string, image: string): Promise<CategoryResponse>;
  getCategories(page: number, limit: number): Promise<{ categories: CategoryResponse[]; total: number }>;
  updateCategory(categoryId: string, data: { name?: string; image?: string }): Promise<CategoryResponse | null>;
}