import api from "./axios";

export const uploadFileToS3 = async (file: File, folder: string, isPublic: boolean = false): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const endpoint = isPublic ? "/upload/public" : "/upload";

  const response = await api.post<{ imageUrl: string }>(endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.imageUrl;
};
