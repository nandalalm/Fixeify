import React, { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ITransaction } from "@/interfaces/walletInterface";
import { BookingCompleteResponse } from "@/interfaces/bookingInterface";
import { QuotaResponse } from "@/interfaces/quotaInterface";
import { fetchBookingById as fetchUserBookingById, fetchQuotaByBookingId as fetchUserQuotaByBookingId } from "@/api/userApi";
import { fetchQuotaByBookingId as fetchProQuotaByBookingId } from "@/api/proApi";

const LabelValue: React.FC<{ label: React.ReactNode; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1">
    <span className="w-44 text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
    <span className="text-sm text-gray-900 dark:text-gray-100 break-all">{value ?? "-"}</span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-md border dark:border-gray-700 p-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
    </div>
    <div className="divide-y divide-gray-100 dark:divide-gray-700">{children}</div>
  </div>
);

const StatusBadge: React.FC<{ value: string }> = ({ value }) => {
  const v = value.toLowerCase();
  let classes = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap shrink-0 ";
  if (v === "credit") classes += "border-green-600 text-green-700";
  else if (v === "debit") classes += "border-red-600 text-red-700";
  else classes += "border-gray-300 text-gray-600";
  return <span className={classes}>{value}</span>;
};

const BookingStatusBadge: React.FC<{ value: string }> = ({ value }) => {
  const v = (value || "").toLowerCase();
  let classes = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap shrink-0 ";
  if (v === "pending") classes += "border-yellow-500 text-yellow-700";
  else if (v === "accepted") classes += "border-blue-500 text-blue-700";
  else if (v === "rejected") classes += "border-red-600 text-red-700";
  else if (v === "completed") classes += "border-green-600 text-green-700";
  else if (v === "cancelled") classes += "border-gray-400 text-gray-600";
  else classes += "border-gray-300 text-gray-600";
  return <span className={classes}>{value}</span>;
};

const formatTo12h = (time?: string) => {
  if (!time) return "-";
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mm = m.toString().padStart(2, "0");
  return `${hour12}:${mm} ${period}`;
};

interface TransactionDetailsProps {
  transaction: ITransaction;
  onClose: () => void;
  showRevenueSplit?: boolean;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({ transaction, onClose, showRevenueSplit = false }) => {
  const [booking, setBooking] = useState<BookingCompleteResponse | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      if (!transaction.bookingId) return;
      setLoading(true);
      try {
        const b = await fetchUserBookingById(transaction.bookingId);
        setBooking(b);
      } catch {}
      try {
        const q = await fetchUserQuotaByBookingId(transaction.bookingId);
        setQuota(q);
      } catch {
        try {
          const q2 = await fetchProQuotaByBookingId(transaction.bookingId);
          setQuota(q2 as any);
        } catch {}
      }
      setLoading(false);
    };
    load();
  }, [transaction.bookingId]);

  return (
    <div className="w-full max-w-none">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Txn: {transaction.transactionId || transaction._id}</div>
      </div>

      <Section title="Transaction Details">
        <LabelValue label="Transaction ID" value={transaction.transactionId || transaction._id} />
        <div className="py-1 flex flex-col sm:flex-row sm:items-center gap-1">
          <span className="w-44 text-sm font-medium text-gray-600 dark:text-gray-300">Type</span>
          <div className="flex items-center"><StatusBadge value={transaction.type} /></div>
        </div>
        <LabelValue label="Amount" value={`₹${transaction.amount.toFixed(2)}`} />
        <LabelValue label="Date" value={new Date(transaction.date).toLocaleString()} />
        <LabelValue label="Description" value={transaction.description || "-"} />
      </Section>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#032b44]"></div>
        </div>
      )}

      {!loading && (booking || quota) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {booking && (
            <Section title="Booking Details">
              <LabelValue label="Booking ID" value={booking?.bookingId || transaction.bookingId} />
              <LabelValue label="Issue Description" value={booking.issueDescription} />
              <LabelValue label="Service Category" value={booking.category?.name} />
              <LabelValue label="Preferred Date" value={new Date(booking.preferredDate).toLocaleDateString()} />
              <LabelValue label="Preferred Time" value={booking.preferredTime && booking.preferredTime.length > 0 ? booking.preferredTime.map(t => `${formatTo12h(t.startTime)} - ${formatTo12h(t.endTime)}`).join(", ") : "-"} />
              <div className="py-1 flex flex-col sm:flex-row sm:items-center gap-1">
                <span className="w-44 text-sm font-medium text-gray-600 dark:text-gray-300">Status</span>
                <div className="flex items-center"><BookingStatusBadge value={booking.status} /></div>
              </div>
              <LabelValue label="Location" value={booking.location ? `${booking.location.address}, ${booking.location.city}, ${booking.location.state}` : "-"} />
            </Section>
          )}
          {quota && (
            <Section title="Quota Details">
              <LabelValue label="Labor Cost" value={`₹${quota.laborCost}`} />
              {!!quota.materialCost && quota.materialCost > 0 && (
                <LabelValue label="Material Cost" value={`₹${quota.materialCost}`} />
              )}
              {!!quota.additionalCharges && quota.additionalCharges > 0 && (
                <LabelValue label="Additional Charges" value={`₹${quota.additionalCharges}`} />
              )}
              <LabelValue label="Total" value={`₹${quota.totalCost}`} />
              <LabelValue label="Payment Status" value={quota.paymentStatus} />
            </Section>
          )}
        </div>
      )}

      {/* Revenue split for admin context */}
      {!loading && showRevenueSplit && quota && (
        <div className="mt-4">
          <Section title="Revenue Details">
            <LabelValue label="Admin Revenue (30%)" value={`₹${((quota.totalCost || 0) * 0.30).toFixed(2)}`} />
            <LabelValue label="Professional Revenue (70%)" value={`₹${((quota.totalCost || 0) * 0.70).toFixed(2)}`} />
          </Section>
        </div>
      )}
    </div>
  );
};

export default TransactionDetails;
