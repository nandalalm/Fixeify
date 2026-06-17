import type { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../types";
import type { IUploadService } from "../services/IUploadService";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";

@injectable()
export class UploadController {
  constructor(@inject(TYPES.IUploadService) private _uploadService: IUploadService) { }

  async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      const { folder } = req.body;

      if (!file) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.NO_FILE_UPLOADED });
        return;
      }

      if (!folder) {
        res.status(HttpStatus.BAD_REQUEST).json({ message: MESSAGES.FOLDER_NAME_REQUIRED });
        return;
      }

      const imageUrl = await this._uploadService.uploadFile(file, folder);

      res.status(HttpStatus.OK).json({ imageUrl });
    } catch (error) {
      next(error);
    }
  }
}
