import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IProRepository } from "../repositories/IProRepository";
import { IPendingPro } from "../models/pendingProModel";
import { IProService } from "./IProService";
import { HttpError } from "../middleware/errorMiddleware";

@injectable()
export class ProService implements IProService {
  constructor(@inject(TYPES.IProRepository) private _proRepository: IProRepository) {}

  async applyPro(proData: Partial<IPendingPro>): Promise<{ message: string; pendingPro: IPendingPro }> {
    const existingPending = await this._proRepository.findPendingProByEmail(proData.email!);
    if (existingPending) throw new HttpError(400, "Application already pending");
    const pendingPro = await this._proRepository.createPendingPro(proData);
    return { message: "Application submitted successfully", pendingPro };
  }
}