
export interface IUploadService {
  uploadFile(file: Express.Multer.File, folder: string): Promise<string>;
}
