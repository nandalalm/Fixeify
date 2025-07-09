import { type FC, useState } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  action: "approve" | "reject" | "ban" | "unban" | "logout" | "saveSlot" | "addCategory" | "updateCategory" | "acceptBooking" | "rejectBooking" | null;
  entityType?: "pro" | "user" | "booking";
  reason?: string;
  setReason?: (reason: string) => void;
  customReason?: string;
  setCustomReason?: (reason: string) => void;
  customTitle?: string;
  error?: string | null;
  isProcessing?: boolean;
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  action,
  entityType = "pro",
  reason,
  setReason,
  customReason,
  setCustomReason,
  customTitle,
  error,
  isProcessing,
}) => {
  if (!isOpen) return null;

  const reasons = ["Incomplete documentation", "Insufficient skills", "Background check failed", "Other"];
  const bookingRejectionReasons = [
    "Schedule Conflict",
    "Not Enough Expertise",
    "Location Too Far",
    "Personal Reasons",
    "Other"
  ];

  // Track dropdown selection separately
  const [selectValue, setSelectValue] = useState("");

  return (
    <div
      className="fixed inset-0 p-5 flex items-center justify-center z-50 bg-gray-800/30 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className={`p-6 rounded-lg shadow-lg w-96 relative ${action === "logout" ? "bg-white dark:bg-[#1E2939]" : "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
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
          {action === "saveSlot" && "Confirm Slot Changes"}
          {action === "addCategory" && "Confirm Add Category"}
          {action === "updateCategory" && "Confirm Update Category"}
          {action === "acceptBooking" && "Confirm Accept Booking"}
          {action === "rejectBooking" && "Reject Booking"}
          {action === null && (customTitle || "Confirm Action")}
        </h3>
        <p className={`mb-4 ${action === "logout" ? "dark:text-white" : ""}`}>
          {action === null && customReason ? customReason : action === "approve" && `Are you sure you want to approve this ${entityType === "pro" ? "pro" : "user"}?`}
          {action === "reject" && `Please select a reason for rejection:`}
          {action === "ban" && `Are you sure you want to ban this ${entityType === "pro" ? "pro" : "user"}?`}
          {action === "unban" && `Are you sure you want to unban this ${entityType === "pro" ? "pro" : "user"}?`}
          {action === "logout" && "Are you sure you want to log out?"}
          {action === "saveSlot" && "Are you sure you want to save your slot changes?"}
          {action === "addCategory" && "Are you sure you want to add this category?"}
          {action === "updateCategory" && "Are you sure you want to update this category?"}
          {action === "acceptBooking" && "Are you sure you want to accept this booking?"}
          {action === "rejectBooking" && "Please select a reason for rejecting this booking:"}
        </p>
        {(action === "reject" || action === "rejectBooking") && setReason && setCustomReason && (
          <div className="mb-4">
            <select
              value={selectValue}
              onChange={(e) => {
                const value = e.target.value;
                setSelectValue(value);
                if (value === "Other") {
                  setReason("");
                  setCustomReason("");
                } else {
                  setReason(value);
                  setCustomReason("");
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isProcessing}
            >
              <option value="">Select a reason</option>
              {(action === "rejectBooking" ? bookingRejectionReasons : reasons).map((r, index) => (
                <option key={index} value={r}>{r}</option>
              ))}
            </select>
            {selectValue === "Other" && (
              <textarea
                value={customReason}
                onChange={(e) => {
                  e.stopPropagation();
                  setCustomReason(e.target.value);
                  setReason(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                placeholder="Enter custom reason"
                autoFocus
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
            disabled={isProcessing || (action === "reject" && !reason)}
          >
            {isProcessing ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};