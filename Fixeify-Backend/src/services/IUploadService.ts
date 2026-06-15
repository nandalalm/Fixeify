import type { Request } from "express";

export type UploadFile = NonNullable<Request["file"]>;

export interface IUploadService {
  uploadFile(file: UploadFile, folder: string): Promise<string>;
}
