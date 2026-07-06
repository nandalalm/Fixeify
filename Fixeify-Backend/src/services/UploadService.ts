import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import { injectable } from "inversify";
import { IUploadService, UploadFile } from "./IUploadService";

@injectable()
export class UploadService implements IUploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(file: UploadFile, folder: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image" },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error ?? !result) {
            return reject(error ?? new Error("Cloudinary upload failed"));
          }
          resolve(result.secure_url);
        }
      );

      stream.end(file.buffer);
    });
  }
}
