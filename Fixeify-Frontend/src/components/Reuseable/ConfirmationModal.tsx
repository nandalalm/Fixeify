import { type FC, useState } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  action:
    | "approve"
    | "reject"
    | "ban"
    | "unban"
    | "logout"
    | "saveSlot"
    | "addCategory"
    | "updateCategory"
    | "acceptBooking"
    | "rejectBooking"
    | "addQuota"
    | "requestWithdrawal"
    | "cancel"
    | "acceptWithdrawal"
    | "rejectWithdrawal"
    | "rating"
    | "openTicket"
    | "closeTicket"
    | null;
  entityType?: "pro" | "user" | "booking" | "wallet";
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
    "Other",
  ];
  const cancellationReasons = [
    "Change of Plans",
    "Found Another Professional",
    "Issue Resolved",
    "Other",
  ];
  const withdrawalRejectionReasons = [
    "Insufficient Funds",
    "Invalid Account Details",
    "Suspicious Activity",
    "Other",
  ];

  const [selectValue, setSelectValue] = useState("");

  return (
    <div
      className="fixed inset-0 p-5 flex items-center justify-center z-50 bg-gray-800/30 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className={`p-6 rounded-lg shadow-lg w-96 relative ${
          action === "logout" ? "bg-white dark:bg-[#1E2939]" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {isProcessing && (
          <div className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="spinner border-t-4 border-blue-500 rounded-full w-8 h-8 animate-spin"></div>
          </div>
        )}
        <h3
          className={`text-lg font-semibold mb-4 ${action === "logout" ? "dark:text-white" : ""}`}
        >
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
          {action === "addQuota" && (customTitle || "Confirm Quota Generation")}
          {action === "requestWithdrawal" && (customTitle || "Confirm Withdrawal Request")}
          {action === "cancel" && (customTitle || "Cancel Booking")}
          {action === "acceptWithdrawal" && "Confirm Accept Withdrawal"}
          {action === "rejectWithdrawal" && "Reject Withdrawal Request"}
          {action === "rating" && "Rate/Review Professional"}
          {action === "openTicket" && (customTitle || "Open Ticket")}
          {action === "closeTicket" && (customTitle || "Close Ticket")}
        </h3>
        <p className={`mb-4 ${action === "logout" ? "dark:text-white" : ""}`}>
          {action === null && customReason
            ? customReason
            : action === "approve" && `Are you sure you want to approve this ${entityType === "pro" ? "pro" : "user"}?`}
          {action === "reject" && `Please select a reason for rejection:`}
          {action === "ban" && `Are you sure you want to ban this ${entityType === "pro" ? "pro" : "user"}?`}
          {action === "unban" && `Are you sure you want to unban this ${entityType === "pro" ? "pro" : "user"}?`}
          {action === "logout" && "Are you sure you want to log out?"}
          {action === "saveSlot" && "Are you sure you want to save your slot changes?"}
          {action === "addCategory" && "Are you sure you want to add this category?"}
          {action === "updateCategory" && "Are you sure you want to update this category?"}
          {action === "acceptBooking" && "Are you sure you want to accept this booking?"}
          {action === "rejectBooking" && "Please select a reason for rejecting this booking:"}
          {action === "addQuota" && "Are you sure you want to generate the quota for this booking?"}
          {action === "requestWithdrawal" && (customReason || "Are you sure you want to request this withdrawal?")}
          {action === "cancel" && (customTitle === "Select Cancellation Reason"
            ? "Please select a reason for cancelling this booking:"
            : "Are you sure you want to cancel this booking?")}
          {action === "acceptWithdrawal" && "Are you sure you want to accept this withdrawal request?"}
          {action === "rejectWithdrawal" && "Please select a reason for rejecting this withdrawal request:"}
          {action === "rating" && "Are you sure you want to rate/review this professional?"}
          {action === "openTicket" && (customReason || "Open this pending ticket and mark it Under Review?")}
          {action === "closeTicket" && (customReason || "Close this ticket as Resolved?")}
        </p>
        {(action === "reject" || action === "rejectBooking" || action === "rejectWithdrawal" || (action === "cancel" && customTitle === "Select Cancellation Reason")) && setReason && setCustomReason && (
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
              {(action === "cancel" ? cancellationReasons : action === "rejectBooking" ? bookingRejectionReasons : action === "rejectWithdrawal" ? withdrawalRejectionReasons : reasons).map((r, index) => (
                <option key={index} value={r}>
                  {r}
                </option>
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
        {error && (action === "acceptBooking" || action === "addQuota" || action === "requestWithdrawal" || action === "acceptWithdrawal" || (action === "cancel" && customTitle === "Confirm Cancellation")) && (
          <p className="text-red-600 text-sm mb-4">{error}</p>
        )}
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 dark:!bg-gray-500 dark:!text-gray-100 dark:!hover:!bg-gray-300 dark:!border-gray-600 dark:!shadow-sm dark:!focus-visible:ring-gray-500 dark:!focus-visible:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md text-white hover:opacity-95 border shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:!bg-gray-700 dark:!text-gray-100 dark:!hover:bg-gray-600 dark:!border-gray-600 dark:!shadow-sm dark:!focus-visible:ring-gray-500 dark:!focus-visible:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#032b44", borderColor: "#032b44" }}
            disabled={isProcessing || ((action === "reject" || action === "rejectBooking" || action === "rejectWithdrawal" || (action === "cancel" && customTitle === "Select Cancellation Reason")) && !reason)}
          >
            {isProcessing ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};