import React, { useEffect, useMemo, useState } from "react";
import { TicketResponse } from "@/interfaces/ticketInterface";
import { fetchBookingById as fetchUserBookingById } from "@/api/userApi";
import { fetchQuotaByBookingId as fetchUserQuotaByBookingId, getUserProfile } from "@/api/userApi";
import { fetchQuotaByBookingId as fetchProQuotaByBookingId, getProProfile } from "@/api/proApi";
import { BookingCompleteResponse } from "@/interfaces/bookingInterface";
import { QuotaResponse } from "@/interfaces/quotaInterface";
import { UserProfile } from "@/interfaces/userInterface";
import { ProProfile } from "@/interfaces/proInterface";

interface AdminTicketDetailsProps {
  ticket: TicketResponse;
  onBack: () => void;
  onClose: (comment: string) => void;
}

const LabelValue: React.FC<{ label: string; value?: React.ReactNode }>=({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1">
    <span className="w-44 text-sm font-medium text-gray-600">{label}</span>
    <span className="text-sm text-gray-900 break-all">{value || "-"}</span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }>=({ title, children }) => (
  <div className="bg-white rounded-md border p-4">
    <h3 className="text-base font-semibold text-gray-800 mb-2">{title}</h3>
    <div className="divide-y divide-gray-100">{children}</div>
  </div>
);

const AdminTicketDetails: React.FC<AdminTicketDetailsProps> = ({ ticket, onBack, onClose }) => {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingCompleteResponse | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [complainant, setComplainant] = useState<UserProfile | ProProfile | null>(null);
  const [against, setAgainst] = useState<UserProfile | ProProfile | null>(null);

  const complainantDisplay = useMemo(() => ticket.complainantName?.trim() || ticket.complainantId, [ticket]);
  const againstDisplay = useMemo(() => ticket.againstName?.trim() || ticket.againstId, [ticket]);

  // Helper: format HH:mm to 12-hour time with AM/PM
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

  // UI helpers
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

  const canClose = ticket.status === "under_review" || ticket.status === "pending"; // pending will be moved to under_review first by parent

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // Booking details
        const b = await fetchUserBookingById(ticket.bookingId);
        if (mounted) setBooking(b);

        // Quota details (try user route first, fallback to pro route)
        try {
          const q = await fetchUserQuotaByBookingId(ticket.bookingId);
          if (mounted) setQuota(q);
        } catch {
          try {
            const q2 = await fetchProQuotaByBookingId(ticket.bookingId);
            if (mounted) setQuota(q2 as any);
          } catch {
            // ignore
          }
        }

        // Party profiles
        if (ticket.complainantType === "user") {
          getUserProfile(ticket.complainantId).then((p) => mounted && setComplainant(p)).catch(() => {});
        } else {
          getProProfile(ticket.complainantId).then((p) => mounted && setComplainant(p)).catch(() => {});
        }
        if (ticket.againstType === "user") {
          getUserProfile(ticket.againstId).then((p) => mounted && setAgainst(p)).catch(() => {});
        } else {
          getProProfile(ticket.againstId).then((p) => mounted && setAgainst(p)).catch(() => {});
        }
      } catch {
        // ignore fetch errors; fallback fields will still render
      }
    };
    load();
    return () => { mounted = false; };
  }, [ticket.bookingId, ticket.complainantId, ticket.complainantType, ticket.againstId, ticket.againstType]);

  const handleCloseClick = () => {
    const c = comment.trim();
    if (c.length < 5) {
      setError("Comment must be at least 5 characters.");
      return;
    }
    setError(null);
    onClose(c);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="px-3 py-2 rounded-md border bg-white hover:bg-gray-50 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10.53 3.47a.75.75 0 010 1.06L4.81 10.25H21a.75.75 0 010 1.5H4.81l5.72 5.72a.75.75 0 11-1.06 1.06l-7-7a.75.75 0 010-1.06l7-7a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
          Back
        </button>
        <div className="text-sm text-gray-600">Ticket ID: {ticket.ticketId}</div>
      </div>

      {/* Ticket Details (paragraph style) */}
      <Section title="Ticket Details">
        <div className="space-y-2 text-sm">
          <div className="text-base font-semibold text-gray-800">{ticket.subject}</div>
          <div className="text-gray-800">{ticket.description}</div>
          <div className="flex items-center gap-2 pt-1">
            {priorityBadge(ticket.priority)}
            {statusBadge(ticket.status)}
          </div>
        </div>
      </Section>

      {/* Ticket Timeline */}
      <Section title="Ticket Timeline">
        <div className="space-y-6 text-sm">
          {/* Created */}
          <div className="rounded-md border border-gray-200 bg-gray-100 p-3">
            <div className="font-semibold text-gray-900">Ticket Created</div>
            <div className="mt-1 text-gray-800">ID: {ticket.ticketId}</div>
            <div className="mt-1">{statusBadge("pending")}</div>
            <div className="mt-1 text-gray-600">Created on {new Date(ticket.createdAt).toLocaleString()}</div>
          </div>

          {/* Under Review */}
          {(ticket.status === "under_review" || ticket.status === "resolved") && (
            <div className="rounded-md border border-gray-200 bg-gray-100 p-3">
              <div className="font-semibold text-gray-900">Ticket Under Review</div>
              <div className="mt-1">{statusBadge("under_review")}</div>
              <div className="mt-1 text-gray-600">Taken under review on {new Date(ticket.updatedAt).toLocaleString()}</div>
            </div>
          )}

          {/* Resolved */}
          {ticket.status === "resolved" && (
            <div className="rounded-md border border-gray-200 bg-gray-100 p-3">
              <div className="font-semibold text-gray-900">Ticket Resolved</div>
              <div className="mt-1">{statusBadge(ticket.status)}</div>
              <div className="mt-1 text-gray-600">Resolved on {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : "-"}</div>
              {ticket.adminComment && (
                <div className="mt-1 text-gray-800">Admin Comment: {ticket.adminComment}</div>
              )}
            </div>
          )}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Raised By">
          <LabelValue label="Type" value={ticket.complainantType.toUpperCase()} />
          <LabelValue label="Name" value={complainantDisplay} />
          {ticket.complainantType === "user" && (
            <>
              <LabelValue label="Email" value={(complainant as UserProfile | null)?.email} />
              <LabelValue label="Phone" value={(complainant as UserProfile | null)?.phoneNo || "-"} />
            </>
          )}
          {ticket.complainantType === "pro" && (
            <>
              <LabelValue label="Email" value={(complainant as ProProfile | null)?.email} />
              <LabelValue label="Phone" value={(complainant as ProProfile | null)?.phoneNumber} />
              <LabelValue label="Service Type" value={booking?.category?.name || "-"} />
            </>
          )}
        </Section>
        <Section title="Raised Against">
          <LabelValue label="Type" value={ticket.againstType.toUpperCase()} />
          <LabelValue label="Name" value={againstDisplay} />
          {ticket.againstType === "user" && (
            <>
              <LabelValue label="Email" value={(against as UserProfile | null)?.email} />
              <LabelValue label="Phone" value={(against as UserProfile | null)?.phoneNo || "-"} />
            </>
          )}
          {ticket.againstType === "pro" && (
            <>
              <LabelValue label="Email" value={(against as ProProfile | null)?.email} />
              <LabelValue label="Phone" value={(against as ProProfile | null)?.phoneNumber} />
              <LabelValue label="Service Type" value={booking?.category?.name || "-"} />
            </>
          )}
        </Section>
      </div>

      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Booking Details">
          <LabelValue label="Issue" value={booking?.issueDescription} />
          <LabelValue label="Booking Status" value={booking?.status} />
          <LabelValue label="Preferred Date" value={booking ? new Date(booking.preferredDate).toLocaleDateString() : "-"} />
          <LabelValue
            label="Preferred Time"
            value={booking?.preferredTime && booking.preferredTime.length > 0
              ? booking.preferredTime.map(t => `${formatTo12h(t.startTime)} - ${formatTo12h(t.endTime)}`).join(", ")
              : "-"}
          />
          <LabelValue
            label="Location"
            value={booking ? `${booking.location.address}, ${booking.location.city}, ${booking.location.state}` : "-"}
          />
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
            <div className="text-sm text-gray-500">No quota details available.</div>
          )}
        </Section>
      </div>

      {ticket.status !== "resolved" && (
        <Section title="Admin Resolution">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Comment<span className="text-red-600">*</span></label>
            <textarea
              className="w-full min-h-24 border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Enter resolution comment (min 5 characters)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex justify-end">
              <button
                onClick={handleCloseClick}
                disabled={!canClose}
                className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-60 hover:bg-green-700"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
};

export default AdminTicketDetails;
