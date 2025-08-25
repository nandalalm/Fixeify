import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { changeProPassword } from "../../api/proApi";
import { z } from "zod";
import { changePasswordSchema } from "../../Validation/validationSchemas";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { ClipLoader } from "react-spinners";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";

interface ProChangePasswordProps {
  onCancel: () => void;
}

const ProChangePassword = ({ onCancel }: ProChangePasswordProps) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trim() }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
    setSuccessMessage("");
  };

  const executeSubmit = async () => {
    setErrors({});
    setServerError("");
    setSuccessMessage("");
    try {
      const validatedData = changePasswordSchema.parse(formData);
      setIsSubmitting(true);
      const response = await changeProPassword(user.id, {
        currentPassword: validatedData.currentPassword,
        newPassword: validatedData.newPassword,
      });
      setSuccessMessage(response.message);
      setFormData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setTimeout(() => {
        setSuccessMessage("");
        onCancel();
      }, 1000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          fieldErrors[err.path[0]] = err.message as string;
        });
        setErrors(fieldErrors);
      } else {
        setServerError(
          (error as any) === "Incorrect current password. Please try again."
            ? "Incorrect current password"
            : "Incorrect current password. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setSuccessMessage("");
    try {
      // Validate only; if valid, open confirmation
      changePasswordSchema.parse(formData);
      setConfirmOpen(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          fieldErrors[err.path[0]] = err.message as string;
        });
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <>
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Change Password</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-[#032B44] focus:ring-[#032B44]"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              >
                {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-[#032B44] focus:ring-[#032B44]"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmNewPassword ? "text" : "password"}
                name="confirmNewPassword"
                value={formData.confirmNewPassword}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:border-[#032B44] focus:ring-[#032B44]"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              >
                {showConfirmNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmNewPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmNewPassword}</p>}
          </div>
          {successMessage && (
            <p className="text-green-500 text-sm mt-4 text-center">{successMessage}</p>
          )}
          {serverError && <p className="text-red-500 text-sm mt-4 text-center">{serverError}</p>}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              type="submit"
              className="flex-1 bg-[#032B44] text-white py-3 px-6 rounded-md hover:bg-[#054869] transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ClipLoader size={20} color="#ffffff" className="mr-2" />
                  Saving...
                </>
              ) : (
                "Change Password"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  currentPassword: "",
                  newPassword: "",
                  confirmNewPassword: "",
                });
                setErrors({});
                setServerError("");
                setSuccessMessage("");
                onCancel();
              }}
              className="flex-1 bg-white border border-[#032B44] text-[#032B44] hover:bg-[#032B44] hover:text-white py-3 px-6 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <ConfirmationModal
        isOpen={confirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          executeSubmit();
        }}
        onCancel={() => setConfirmOpen(false)}
        action={null}
        customTitle="Change Password"
        customReason="Are you sure you want to change your password?"
        isProcessing={isSubmitting}
      />
    </>
  );
};

export default ProChangePassword;