import { type FC, useState, useCallback } from "react";
import { addCategory } from "../../api/adminApi";
import { ICategory } from "../../interfaces/adminInterface";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ConfirmationModal } from "./ConfirmationModal";
import { ArrowLeft } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface AddCategoryProps {
  onClose: () => void;
  onSuccess: (category: ICategory) => void;
}

const nameRegex = /^[A-Za-z-]+$/;

const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

const formatName = (name: string): string => {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const getCroppedImg = async (imageSrc: string, crop: Area): Promise<File> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx?.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], "cropped-image.jpg", { type: "image/jpeg" }));
      }
    }, "image/jpeg");
  });
};

export const AddCategory: FC<AddCategoryProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; image?: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const validateName = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return "Category name is required";
    if (trimmed.length < 4) return "Name must be at least 4 characters";
    if (!nameRegex.test(trimmed)) return "Name can only contain letters and hyphens";
    return undefined;
  };

  const validateImage = (value: string): string | undefined => {
    if (!value) return "Category image is required";
    return undefined;
  };

  const uploadToS3 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const params = {
      Bucket: import.meta.env.VITE_S3_BUCKET_NAME as string,
      Key: `category-images/${Date.now()}-${file.name}`,
      Body: uint8Array,
      ContentType: file.type,
    };
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://${params.Bucket}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${params.Key}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/i)) {
        setErrors((prev) => ({ ...prev, image: "Only images (jpeg, jpg, png, gif) are allowed" }));
        setImage("");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/i)) {
        setErrors((prev) => ({ ...prev, image: "Only images (jpeg, jpg, png, gif) are allowed" }));
        setImage("");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      setIsUploadingImage(true);
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const url = await uploadToS3(croppedImage);
      setImage(url);
      setErrors((prev) => ({ ...prev, image: undefined }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, image: "Failed to upload image" }));
      setImage("");
    } finally {
      setIsUploadingImage(false);
      setCropModalOpen(false);
      setImageToCrop(null);
      setCroppedAreaPixels(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      const formattedName = formatName(name.trim());
      const newCategory = await addCategory({ name: formattedName, image });
      onSuccess(newCategory);
      setName("");
      setImage("");
      setErrors({});
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message === "Category name already exists") {
        setErrors({ name: "Category name already exists" });
      } else {
        setErrors({ name: "Failed to add category" });
      }
    } finally {
      setIsProcessing(false);
      setIsConfirmModalOpen(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const nameError = validateName(trimmedName);
    const imageError = validateImage(image);

    if (nameError || imageError) {
      setErrors({ name: nameError, image: imageError });
      return;
    }

    setErrors({});
    setIsConfirmModalOpen(true);
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto shadow-lg relative">
      <button
        onClick={onClose}
        className="absolute top-0 left-0 border border-gray-300 text-gray-800 p-2 rounded-md hover:bg-gray-100 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">Add New Category</h2>
      <form onSubmit={handleFormSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10 p-2 ${errors.name ? "border-red-500" : ""}`}
            placeholder="Enter category name"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category Image</label>
          <div
            className="border-2 border-dashed border-gray-300 p-6 text-center rounded-lg bg-gray-50 mt-2 hover:bg-gray-100 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <h3 className="text-lg font-medium text-gray-700">Upload Category Image</h3>
            {isUploadingImage ? (
              <div className="flex justify-center items-center mt-2">
                <svg
                  className="animate-spin h-8 w-8 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                </svg>
              </div>
            ) : (
              <>
                <p className="text-gray-500 mt-1">Drag an image here</p>
                <p className="text-gray-500">Or if you prefer...</p>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="categoryImageInput"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                />
                <label
                  htmlFor="categoryImageInput"
                  className="mt-3 inline-block px-4 py-2 bg-blue-900 text-white rounded-md cursor-pointer hover:bg-blue-800 transition-colors duration-200"
                >
                  Choose an image to upload
                </label>
              </>
            )}
          </div>
          {image && (
            <div className="mt-4 flex justify-center">
              <img src={image} alt="Category Preview" className="w-16 h-16 object-cover rounded-full border border-gray-200" />
            </div>
          )}
          {errors.image && <p className="text-red-500 text-sm mt-1 text-center">{errors.image}</p>}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
            disabled={isProcessing || isUploadingImage}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing || isUploadingImage}
            className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors duration-200 disabled:opacity-50"
          >
            {isProcessing ? "Adding..." : "Add Category"}
          </button>
        </div>
      </form>
      {cropModalOpen && imageToCrop && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-opacity-0 supports-[backdrop-filter]:bg-transparent supports-[backdrop-filter]:bg-opacity-0 flex items-center justify-center z-50">
          <div className="bg-gray-200 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Crop Image</h3>
            <div className="relative w-full h-64">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setCropModalOpen(false);
                  setImageToCrop(null);
                  setCroppedAreaPixels(null);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCropConfirm}
                className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800"
              >
                Confirm Crop
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onConfirm={handleSubmit}
        onCancel={() => setIsConfirmModalOpen(false)}
        action="addCategory"
        isProcessing={isProcessing}
      />
    </div>
  );
};