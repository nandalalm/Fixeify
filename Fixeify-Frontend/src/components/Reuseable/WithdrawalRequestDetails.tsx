import React, { useEffect, useState } from "react";
import { ChevronLeft, Eye, Phone } from "lucide-react";
import { IWithdrawalRequest } from "@/interfaces/withdrawalRequestInterface";
import { ProProfile } from "@/interfaces/proInterface";
import { getProProfile, fetchBookingById as fetchProBookingById } from "@/api/proApi";
import { BookingResponse } from "@/interfaces/bookingInterface";
import { fetchApprovedProById } from "@/api/adminApi";

const LabelValue: React.FC<{ label: React.ReactNode; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1">
    <span className="w-44 text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
    <span className="text-sm text-gray-900 dark:text-gray-100 break-all">{value ?? "-"}</span>
  </div>
);

const Section: React.FC<{ title: string; rightSlot?: React.ReactNode; children: React.ReactNode }> = ({ title, rightSlot, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-md border dark:border-gray-700 p-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      {rightSlot}
    </div>
    <div className="divide-y divide-gray-100 dark:divide-gray-700">{children}</div>
  </div>
);

const WithdrawalStatusBadge: React.FC<{ value: string }> = ({ value }) => {
  const v = (value || "").toLowerCase();
  let classes = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap shrink-0 ";
  if (v === "pending") classes += "border-amber-500 text-amber-700";
  else if (v === "approved") classes += "border-emerald-600 text-emerald-700";
  else if (v === "rejected") classes += "border-rose-600 text-rose-700";
  else classes += "border-gray-300 text-gray-600";
  return <span className={classes}>{value}</span>;
};

interface WithdrawalRequestDetailsProps {
  withdrawal: IWithdrawalRequest;
  onBack: () => void;
  showProDetails?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
}

const WithdrawalRequestDetails: React.FC<WithdrawalRequestDetailsProps> = ({ withdrawal, onBack, showProDetails = true, onApprove, onReject, isProcessing }) => {
  const [pro, setPro] = useState<ProProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  useEffect(() => {
    if (!showProDetails) return; 
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (withdrawal.proId) {
          const p = await getProProfile(withdrawal.proId);
          setPro(p);
        }
        if (withdrawal.bookingId) {
          try {
            const b: BookingResponse = await fetchProBookingById(withdrawal.bookingId);
            setCategoryName((b as any)?.category?.name || null);
          } catch {
            setCategoryName(null);
          }
        }
        if (!categoryName) {
          try {
            const ap = await fetchApprovedProById(withdrawal.proId);
            setCategoryName((ap as any)?.category?.name || (ap as any)?.customService || null);
          } catch {
            // ignore
          }
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || "Failed to load pro details.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [withdrawal.proId, withdrawal.bookingId, showProDetails]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[#032B44] hover:text-[#054869]">
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>

      {showProDetails && (
        <Section
          title="Professional Details"
          rightSlot={
            (categoryName || pro?.categoryName) ? (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap"
                style={{ borderColor: "#032b44", color: "#032b44" }}
              >
                {categoryName || pro?.categoryName}
              </span>
            ) : null
          }
        >
          {loading && !pro ? (
            <div className="text-sm text-gray-500 py-1">Loading pro details...</div>
          ) : error ? (
            <div className="text-sm text-red-600 py-1">{error}</div>
          ) : pro ? (
            <>
              <div className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  className="relative group shrink-0"
                  aria-label="View pro image"
                  onClick={() => {}}
                >
                  <img
                    src={pro.profilePhoto || "/images/avatar-pro.png"}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/avatar-pro.png"; }}
                    alt="Pro"
                    className="w-10 h-10 rounded-full object-cover border transition filter group-hover:blur-[1px]"
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Eye className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                  </span>
                </button>
                <div className="text-sm">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{`${pro.firstName} ${pro.lastName}`}</div>
                  <div className="text-gray-600 dark:text-gray-300">{pro.email || "-"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 py-1 text-sm text-gray-900 dark:text-gray-100">
                <Phone className="w-4 h-4" />
                <span>{pro.phoneNumber || "-"}</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500 py-1">No pro details found.</div>
          )}
        </Section>
      )}

      <Section title="Withdrawal Details">
        <LabelValue label="Amount" value={`₹${withdrawal.amount.toFixed(2)}`} />
        <LabelValue label="Payment Mode" value={withdrawal.paymentMode === 'bank' ? 'Bank' : 'UPI'} />
        {withdrawal.paymentMode === 'bank' ? (
          <>
            <LabelValue label="Bank Name" value={withdrawal.bankName || 'N/A'} />
            <LabelValue label="Account Number" value={withdrawal.accountNumber || 'N/A'} />
            <LabelValue label="IFSC Code" value={withdrawal.ifscCode || 'N/A'} />
            <LabelValue label="Branch Name" value={withdrawal.branchName || 'N/A'} />
          </>
        ) : (
          <LabelValue label="UPI ID" value={withdrawal.upiCode || 'N/A'} />
        )}
        <div className="py-1 flex flex-col sm:flex-row sm:items-center gap-1">
          <span className="w-44 text-sm font-medium text-gray-600 dark:text-gray-300">Status</span>
          <div className="flex items-center"><WithdrawalStatusBadge value={withdrawal.status} /></div>
        </div>
        {withdrawal.rejectionReason && (
          <LabelValue label="Rejection Reason" value={<span className="text-red-600">{withdrawal.rejectionReason}</span>} />
        )}
        <LabelValue label="Created On" value={new Date(withdrawal.createdAt).toLocaleDateString()} />
      </Section>
      {withdrawal.status === 'pending' && (onApprove || onReject) && (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {onApprove && (
            <button
              onClick={onApprove}
              className="px-4 py-2 rounded-md text-white bg-[#032B44] hover:bg-[#054869] transition-colors disabled:opacity-50"
              disabled={isProcessing}
            >
              Approve
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="px-4 py-2 rounded-md border border-[#EF4444] text-[#EF4444] bg-transparent hover:bg-red-50 transition-colors disabled:opacity-50"
              disabled={isProcessing}
            >
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WithdrawalRequestDetails;
