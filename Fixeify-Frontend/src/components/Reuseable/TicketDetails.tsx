import React, { useEffect, useMemo, useState } from "react";
import { TicketResponse } from "@/interfaces/ticketInterface";
import { fetchBookingById as fetchUserBookingById, getUserProfile, fetchQuotaByBookingId as fetchUserQuotaByBookingId } from "@/api/userApi";
import { fetchQuotaByBookingId as fetchProQuotaByBookingId, getProProfile } from "@/api/proApi";
import { BookingCompleteResponse } from "@/interfaces/bookingInterface";
import { QuotaResponse } from "@/interfaces/quotaInterface";
import { UserProfile } from "@/interfaces/userInterface";
import { ProProfile } from "@/interfaces/proInterface";

interface TicketDetailsProps {
  ticket: TicketResponse;
  onBack?: () => void;
}

const LabelValue: React.FC<{ label: string; value?: React.ReactNode }>=({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1">
    <span className="w-44 text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
    <span className="text-sm text-gray-900 dark:text-gray-100 break-all">{value ?? "-"}</span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }>=({ title, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-md border dark:border-gray-700 p-4">
    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
    <div className="divide-y divide-gray-100 dark:divide-gray-700">{children}</div>
  </div>
);

const TicketDetails: React.FC<TicketDetailsProps> = ({ ticket, onBack }) => {
  const [booking, setBooking] = useState<BookingCompleteResponse | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [against, setAgainst] = useState<UserProfile | ProProfile | null>(null);

  const againstDisplayName = useMemo(() => {
    const byTicket = (ticket.againstName || "").trim();
    if (byTicket) return byTicket;
    if (ticket.againstType === "user") {
      const n = (against as UserProfile | null)?.name || (booking as any)?.user?.name;
      return (n && String(n).trim()) || "-";
    }
    if (ticket.againstType === "pro") {
      const p = (against as ProProfile | null);
      const fn = p?.firstName || (booking as any)?.pro?.firstName || "";
      const ln = p?.lastName || (booking as any)?.pro?.lastName || "";
      const full = `${fn} ${ln}`.trim();
      return full || "-";
    }
    return "-";
  }, [ticket, against, booking]);

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

  const formatDateDDMMYYYY = (d: Date | string | number) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "-";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const OutlineBadge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${className}`}>{children}</span>
  );

  const priorityBadge = (p: TicketResponse["priority"]) => {
    switch (p) {
      case "low": return <OutlineBadge className="border-green-500 text-green-700">Low Priority</OutlineBadge>;
      case "medium": return <OutlineBadge className="border-yellow-500 text-yellow-700">Medium Priority</OutlineBadge>;
      case "high": return <OutlineBadge className="border-red-500 text-red-700">High Priority</OutlineBadge>;
      default: return null;
    }
  };

  const statusBadge = (s: TicketResponse["status"]) => {
    switch (s) {
      case "pending": return <OutlineBadge className="border-yellow-500 text-yellow-700">Pending</OutlineBadge>;
      case "under_review": return <OutlineBadge className="border-blue-500 text-blue-700">Under Review</OutlineBadge>;
      case "resolved": return <OutlineBadge className="border-green-600 text-green-700">Resolved</OutlineBadge>;
      default: return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const b = await fetchUserBookingById(ticket.bookingId);
        if (mounted) setBooking(b);
      } catch {}

      try {
        const q = await fetchUserQuotaByBookingId(ticket.bookingId);
        if (mounted) setQuota(q);
      } catch {
        try {
          const q2 = await fetchProQuotaByBookingId(ticket.bookingId);
          if (mounted) setQuota(q2 as any);
        } catch {}
      }

      try {
        if (ticket.againstType === "user") {
          const u = await getUserProfile(ticket.againstId);
          if (mounted) setAgainst(u);
        } else {
          const p = await getProProfile(ticket.againstId);
          if (mounted) setAgainst(p);
        }
      } catch {}
    };
    load();
    return () => { mounted = false; };
  }, [ticket.bookingId, ticket.againstId, ticket.againstType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button onClick={onBack} className="px-3 py-2 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10.53 3.47a.75.75 0 010 1.06L4.81 10.25H21a.75.75 0 010 1.5H4.81l5.72 5.72a.75.75 0 11-1.06 1.06l-7-7a.75.75 0 010-1.06l7-7a.75.75 0 011.06 0z" clipRule="evenodd" />
            </svg>
            Back
          </button>
        ) : <div />}
        <div className="text-sm text-gray-600 dark:text-gray-400">Ticket ID: {ticket.ticketId}</div>
      </div>

      <Section title="Ticket Details">
        <div className="space-y-2 text-sm">
          <div className="text-base font-semibold text-gray-800 dark:text-gray-100">{ticket.subject}</div>
          <div className="text-gray-800 dark:text-gray-200">{ticket.description}</div>
          <div className="flex items-center gap-2 pt-1">
            {priorityBadge(ticket.priority)}
            {statusBadge(ticket.status)}
          </div>
        </div>
      </Section>

      <Section title="Ticket Timeline">
        <div className="space-y-6 text-sm">
          <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-3">
            <div className="font-semibold text-gray-900 dark:text-gray-100">Ticket Created</div>
            <div className="mt-1 text-gray-800 dark:text-gray-200">ID: {ticket.ticketId}</div>
            <div className="mt-1">{statusBadge("pending")}</div>
            <div className="mt-1 text-gray-600 dark:text-gray-400">Created on {new Date(ticket.createdAt).toLocaleString()}</div>
          </div>

          {(ticket.status === "under_review" || ticket.status === "resolved") && (
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-3">
              <div className="font-semibold text-gray-900 dark:text-gray-100">Ticket Under Review</div>
              <div className="mt-1">{statusBadge("under_review")}</div>
              <div className="mt-1 text-gray-600 dark:text-gray-400">Taken under review on {new Date(ticket.updatedAt).toLocaleString()}</div>
            </div>
          )}

          {ticket.status === "resolved" && (
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-3">
              <div className="font-semibold text-gray-900 dark:text-gray-100">Ticket Resolved</div>
              <div className="mt-1">{statusBadge("resolved")}</div>
              <div className="mt-1 text-gray-600 dark:text-gray-400">Resolved on {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : "-"}</div>
              {ticket.adminComment && (
                <div className="mt-1 text-gray-800 dark:text-gray-200">Admin Comment: {ticket.adminComment}</div>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title="Raised Against">
        <LabelValue label="Name" value={againstDisplayName} />
        {ticket.againstType === "pro" ? (
          <>
            <LabelValue label="Email" value={(against as ProProfile | null)?.email} />
            <LabelValue label="Phone" value={(against as ProProfile | null)?.phoneNumber} />
            <LabelValue label="Service Type" value={booking?.category?.name || "-"} />
            {ticket.isProBanned && (
              <LabelValue label="Action Taken" value="Pro Banned" />
            )}
          </>
        ) : (
          <>
            <LabelValue label="Email" value={(against as UserProfile | null)?.email} />
            <LabelValue label="Phone" value={booking?.phoneNumber || "-"} />
            {ticket.isUserBanned && (
              <LabelValue label="Action Taken" value="User Banned" />
            )}
          </>
        )}
      </Section>

      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Booking Details">
          <LabelValue label="Booking ID" value={booking?.bookingId || ticket.bookingId} />
          <LabelValue label="Issue Description" value={booking?.issueDescription} />
          <LabelValue label="Preferred Date" value={booking ? formatDateDDMMYYYY(booking.preferredDate) : "-"} />
          <LabelValue
            label="Preferred Time"
            value={booking?.preferredTime && booking.preferredTime.length > 0
              ? booking.preferredTime.map(t => `${formatTo12h(t.startTime)} - ${formatTo12h(t.endTime)}`).join(", ")
              : "-"}
          />
          <LabelValue label="Booking Status" value={booking?.status} />
          <LabelValue label="Location" value={booking ? `${booking.location.address}, ${booking.location.city}, ${booking.location.state}` : "-"} />
        </Section>
        <Section title="Quota / Payment Details">
          {quota ? (
            <div className="space-y-1">
              <LabelValue label="Labor Cost" value={`₹${quota.laborCost}`} />
              {!!quota.materialCost && quota.materialCost > 0 && (
                <LabelValue label="Material Cost" value={`₹${quota.materialCost}`} />
              )}
              {!!quota.additionalCharges && quota.additionalCharges > 0 && (
                <LabelValue label="Additional Charges" value={`₹${quota.additionalCharges}`} />
              )}
              <LabelValue label="Total" value={`₹${quota.totalCost}`} />
              <LabelValue label="Payment Status" value={quota.paymentStatus} />
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No quota details available.</div>
          )}
        </Section>
      </div>
    </div>
  );
};

export default TicketDetails;
