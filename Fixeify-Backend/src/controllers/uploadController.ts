import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../types";
import { IUploadService } from "../services/IUploadService";
import { MESSAGES } from "../constants/messages";
import { HttpStatus } from "../enums/httpStatus";

@injectable()
export class UploadController {
  private uploadService: IUploadService;

  constructor(@inject(TYPES.IUploadService) uploadService: IUploadService) {
    this.uploadService = uploadService;
  }

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

      const imageUrl = await this.uploadService.uploadFile(file, folder);

      res.status(HttpStatus.OK).json({ imageUrl });
    } catch (error) {
      next(error);
    }
  }
}
