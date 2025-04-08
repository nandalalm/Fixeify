import { IPendingPro } from "../models/pendingProModel";

export interface IProService {
  applyPro(proData: Partial<IPendingPro>): Promise<{ message: string; pendingPro: IPendingPro }>;
}