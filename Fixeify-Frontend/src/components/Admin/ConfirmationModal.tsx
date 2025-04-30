import { type FC } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  action: "approve" | "reject" | "ban" | "unban" | "logout" | null;
  entityType?: "pro" | "user"; // New prop to distinguish between pro and user
  reason?: string;
  setReason?: (reason: string) => void;
  customReason?: string;
  setCustomReason?: (reason: string) => void;
  error?: string | null;
  isProcessing?: boolean;
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  action,
  entityType = "pro", // Default to "pro" for backward compatibility
  reason,
  setReason,
  customReason,
  setCustomReason,
  error,
  isProcessing,
}) => {
  if (!isOpen) return null;

  const reasons = ["Incomplete documentation", "Insufficient skills", "Background check failed", "Other"];

  return (
    <div className="fixed inset-0 p-5 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 supports-[backdrop-filter]:bg-transparent supports-[backdrop-filter]:bg-opacity-0">
      <div className={`p-6 rounded-lg shadow-lg w-96 relative ${action === "logout" ? "bg-white dark:bg-[#1E2939]" : "bg-white"}`}>
        {isProcessing && (
          <div className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="spinner"></div>
          </div>
        )}
        <h3 className={`text-lg font-semibold mb-4 ${action === "logout" ? "dark:text-white" : ""}`}>
          {action === "approve" && `Approve ${entityType === "pro" ? "Pro" : "User"}`}
          {action === "reject" && `Reject ${entityType === "pro" ? "Pro" : "User"}`}
          {action === "ban" && `Ban ${entityType === "pro" ? "Pro" : "User"}`}
          {action === "unban" && `Unban ${entityType === "pro" ? "Pro" : "User"}`}
          {action === "logout" && "Confirm Logout"}
        </h3>
        <p className={`mb-4 ${action === "logout" ? "dark:text-white" : ""}`}>
          {action === "approve" && `Are you sure you want to approve this ${entityType === "pro" ? "pro" : "user"}?`}
          {action === "reject" && "Please select a reason for rejection:"}
          {action === "ban" && `Are you sure you want to ban this ${entityType === "pro" ? "pro" : "user"}?`}
          {action === "unban" && `Are you sure you want to unban this ${entityType === "pro" ? "pro" : "user"}?`}
          {action === "logout" && "Are you sure you want to log out?"}
        </p>
        {action === "reject" && setReason && setCustomReason && (
          <div className="mb-4">
            <select
              value={reason === customReason && customReason ? "Other" : reason}
              onChange={(e) => {
                if (e.target.value === "Other") {
                  setReason("");
                } else {
                  setReason(e.target.value);
                  setCustomReason("");
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isProcessing}
            >
              <option value="">Select a reason</option>
              {reasons.map((r, index) => (
                <option key={index} value={r}>{r}</option>
              ))}
            </select>
            {reason === "" && (
              <textarea
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setReason(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                placeholder="Enter custom reason"
                disabled={isProcessing}
              />
            )}
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        )}
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-md ${
              action === "logout"
                ? "bg-red-600 text-white hover:bg-red-700 dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                : "bg-red-600 text-white hover:bg-red-700"
            } disabled:opacity-50`}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md ${
              action === "logout"
                ? "bg-green-600 text-white hover:bg-green-700 dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                : "bg-green-600 text-white hover:bg-green-700"
            } disabled:opacity-50`}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};