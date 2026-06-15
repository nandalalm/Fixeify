import type { PendingProDocument } from "../models/pendingProModel";
import type { ApprovedProDocument, ITimeSlot } from "../models/approvedProModel";
import type { ClientSession } from "mongoose";
import type { NearbyProRecord, PopulatedApprovedProRecord, ProProfileRecord } from "../contracts/repository/proRecords";

export interface IProRepository {
  createPendingPro(proData: Partial<PendingProDocument>): Promise<PendingProDocument>;
  findPendingProByEmail(email: string): Promise<PendingProDocument | null>;
  findApprovedProByEmail(email: string): Promise<ApprovedProDocument | null>;
  getPendingProsWithPagination(skip: number, limit: number, sortBy?: "latest" | "oldest"): Promise<PendingProDocument[]>;
  getTotalPendingProsCount(): Promise<number>;
  findById(id: string, session?: ClientSession): Promise<PendingProDocument | null>;
  approvePro(id: string, password: string, about: string, session?: ClientSession): Promise<{ email: string; firstName: string; lastName: string; approvedProId: string }>;
  rejectPro(id: string): Promise<void>;
  getApprovedProsWithPagination(skip: number, limit: number, sortBy?: "latest" | "oldest"): Promise<PopulatedApprovedProRecord[]>;
  findApprovedProById(id: string, session?: ClientSession): Promise<ApprovedProDocument | null>;
  getTotalApprovedProsCount(): Promise<number>;
  findApprovedProByIdWithCategory(id: string): Promise<PopulatedApprovedProRecord | null>;
  findApprovedProProfileById(id: string): Promise<ProProfileRecord | null>;
  updateBanStatus(proId: string, isBanned: boolean): Promise<ApprovedProDocument | null>;
  deletePendingPro(id: string): Promise<void>;
  updatePendingPro(id: string, data: Partial<PendingProDocument>): Promise<PendingProDocument | null>;
  updateApprovedPro(id: string, data: Partial<ApprovedProDocument>): Promise<ApprovedProDocument | null>;
  findNearbyPros(
    categoryId: string, 
    longitude: number, 
    latitude: number, 
    skip?: number, 
    limit?: number, 
    sortBy?: string, 
    availabilityFilter?: string
  ): Promise<{ pros: NearbyProRecord[]; total: number; hasMore: boolean }>;
  updateAvailability(proId: string, dayOfWeek: string, timeSlots: ITimeSlot[],booked: boolean, session?: ClientSession ): Promise<ApprovedProDocument | null>;
}
