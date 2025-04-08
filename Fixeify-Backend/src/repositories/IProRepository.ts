import { PendingProDocument } from "../models/pendingProModel";

export interface IProRepository {
  createPendingPro(proData: Partial<PendingProDocument>): Promise<PendingProDocument>;
  findPendingProByEmail(email: string): Promise<PendingProDocument | null>;
  getPendingProsWithPagination(skip: number, limit: number): Promise<PendingProDocument[]>;
  getTotalPendingProsCount(): Promise<number>;
  findById(id: string): Promise<PendingProDocument | null>; // Updated to match BaseRepository
}