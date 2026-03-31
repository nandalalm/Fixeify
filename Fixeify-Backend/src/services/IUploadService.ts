
import type { Express } from "express";

export interface IUploadService {
  uploadFile(file: Express.Multer.File, folder: string): Promise<string>;
}
