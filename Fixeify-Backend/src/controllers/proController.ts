import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IProService } from "../services/IProService";
import { HttpError } from "../middleware/errorMiddleware";

@injectable()
export class ProController {
  constructor(@inject(TYPES.IProService) private _proService: IProService) {}

  async applyPro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proData = req.body;
      const { message, pendingPro } = await this._proService.applyPro(proData);
      res.status(201).json({ message, pendingPro });
    } catch (error) {
      next(error);
    }
  }
}