import { PendingProDocument } from "../models/pendingProModel";
import { ApprovedProDocument } from "../models/approvedProModel";
import { ProResponse } from "../dtos/response/proDtos";

export interface IProRepository {
  createPendingPro(proData: Partial<PendingProDocument>): Promise<PendingProDocument>;
  findPendingProByEmail(email: string): Promise<PendingProDocument | null>;
  findApprovedProByEmail(email: string): Promise<ApprovedProDocument | null>;
  getPendingProsWithPagination(skip: number, limit: number): Promise<PendingProDocument[]>;
  getTotalPendingProsCount(): Promise<number>;
  findById(id: string): Promise<PendingProDocument | null>;
  approvePro(id: string, password: string, about: string): Promise<{ email: string; firstName: string; lastName: string }>;
  rejectPro(id: string): Promise<void>;
  getApprovedProsWithPagination(skip: number, limit: number): Promise<ProResponse[]>;
  findApprovedProById(id: string): Promise<ApprovedProDocument | null>;
  getTotalApprovedProsCount(): Promise<number>;
  findApprovedProByIdAsResponse(id: string): Promise<ProResponse | null>;
  updateBanStatus(proId: string, isBanned: boolean): Promise<ApprovedProDocument | null>;
}
