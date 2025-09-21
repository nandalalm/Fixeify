import React, { useEffect, useMemo, useState } from "react";
import { Eye, Phone, X, User as UserIcon } from "lucide-react";
import { BookingCompleteResponse } from "@/interfaces/bookingInterface";
import { QuotaResponse } from "@/interfaces/quotaInterface";
import { fetchBookingById as fetchUserBookingById, fetchQuotaByBookingId as fetchUserQuotaByBookingId } from "@/api/userApi";
import { fetchQuotaByBookingId as fetchProQuotaByBookingId } from "@/api/proApi";
import LocationMap from "@/components/User/LocationMap";
import { Download } from "lucide-react";
import { generateInvoice } from "@/utils/invoiceGenerator";

export type ViewerRole = "user" | "pro" | "admin";

interface BookingDetailsProps {
  bookingId: string;
  viewerRole: ViewerRole;
  onBack?: () => void;
  onRate?: (booking: BookingCompleteResponse) => void;
  onRaiseComplaint?: (booking: BookingCompleteResponse) => void;
  onAccept?: (booking: BookingCompleteResponse) => void;
  onReject?: (booking: BookingCompleteResponse) => void;
  onGenerateQuota?: (booking: BookingCompleteResponse) => void;
  refreshKey?: number;
  showQuotaSection?: boolean;
  onReady?: () => void;
  onBookingUpdate?: (booking: BookingCompleteResponse) => void;
}

const LabelValue: React.FC<{ label: React.ReactNode; value?: React.ReactNode }>=({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1">
    <span className="w-44 text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
    <span className="text-sm text-gray-900 dark:text-gray-100 break-all">{value ?? "-"}</span>
  </div>
);

const Avatar: React.FC<{
  src: string;
  placeholder: string;
  alt: string;
  className?: string;
  onSrcChange?: (displayedSrc: string) => void;
}> = ({ src, placeholder, alt, className, onSrcChange }) => {
  const [displayedSrc, setDisplayedSrc] = useState<string>(placeholder);

  useEffect(() => {
    if (!src || src === placeholder) {
      setDisplayedSrc(placeholder);
      onSrcChange && onSrcChange(placeholder);
      return;
    }
    let cancelled = false;
    let retried = false;
    const tryLoad = (targetSrc: string) => {
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          setDisplayedSrc(targetSrc);
          onSrcChange && onSrcChange(targetSrc);
        }
      };
      img.onerror = () => {
        if (cancelled) return;
        if (!retried) {
          retried = true;
          tryLoad(targetSrc);
        } else {
          setDisplayedSrc(placeholder);
          onSrcChange && onSrcChange(placeholder);
        }
      };
      img.src = targetSrc;
      if (img.complete && img.naturalWidth > 0) {
        img.onload?.(new Event('load'));
      }
    };
    tryLoad(src);
    return () => { cancelled = true; };
  }, [src, placeholder, onSrcChange]);

  const isTrulyPlaceholder = !src || src === placeholder;

  if (displayedSrc === placeholder && isTrulyPlaceholder) {
    return (
      <div
        aria-label={alt}
        className={
          (className || "") +
          " bg-gray-200 dark:bg-gray-700 border flex items-center justify-center text-gray-500 dark:text-gray-300"
        }
      >
        <UserIcon className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      src={displayedSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        setDisplayedSrc(placeholder);
        onSrcChange && onSrcChange(placeholder);
      }}
    />
  );
};

const Section: React.FC<{ title: string; rightSlot?: React.ReactNode; children: React.ReactNode }>=({ title, rightSlot, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-md border dark:border-gray-700 p-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      {rightSlot}
    </div>
    <div className="divide-y divide-gray-100 dark:divide-gray-700">{children}</div>
  </div>
);

const StatusBadge: React.FC<{ kind: "booking" | "payment"; value: string }>=({ kind, value }) => {
  const v = value.toLowerCase();
  let classes = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap shrink-0 ";
  if (kind === "booking") {
    if (v === "pending") classes += "border-yellow-500 text-yellow-700";
    else if (v === "accepted") classes += "border-blue-500 text-blue-700";
    else if (v === "rejected") classes += "border-red-600 text-red-700";
    else if (v === "completed") classes += "border-green-600 text-green-700";
    else if (v === "cancelled") classes += "border-gray-400 text-gray-600";
    else classes += "border-gray-300 text-gray-600";
  } else {
    if (v === "pending") classes += "border-amber-500 text-amber-700";
    else if (v === "completed") classes += "border-emerald-600 text-emerald-700";
    else if (v === "failed") classes += "border-rose-600 text-rose-700";
    else classes += "border-gray-300 text-gray-600";
  }
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

const formatDateDDMMYYYY = (d: Date | string | number) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const BookingDetails: React.FC<BookingDetailsProps> = ({ bookingId, viewerRole, onBack, onRate, onRaiseComplaint, onAccept, onReject, onGenerateQuota, refreshKey = 0, showQuotaSection = true, onReady, onBookingUpdate }) => {
  const [booking, setBooking] = useState<BookingCompleteResponse | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userDisplaySrc, setUserDisplaySrc] = useState<string>("/placeholder-user.jpg");
  const [proDisplaySrc, setProDisplaySrc] = useState<string>("/placeholder.jpg");
  const [bannerError, setBannerError] = useState<string | null>(null);

  const userImageSrc = useMemo(() => {
    const src = booking?.user?.photo?.trim();
    return src ? src : "/placeholder-user.jpg";
  }, [booking?.user?.photo]);

  const proImageSrc = useMemo(() => {
    const src = booking?.pro?.profilePhoto?.trim();
    return src ? src : "/placeholder.jpg";
  }, [booking?.pro?.profilePhoto]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const b = await fetchUserBookingById(bookingId);
        if (mounted) {
          setBooking(b);
          if (onBookingUpdate && b) {
            onBookingUpdate(b);
          }
        }
        if (mounted && b && !["pending", "rejected", "cancelled"].includes(b.status) && showQuotaSection) {
          try {
            const q = await fetchUserQuotaByBookingId(bookingId);
            if (mounted) setQuota(q);
          } catch (e: any) {
            try {
              const q2 = await fetchProQuotaByBookingId(bookingId);
              if (mounted) setQuota(q2 as any);
            } catch (e2: any) {
              const msg = e2?.response?.data?.message || e?.response?.data?.message;
              if (mounted && msg) setBannerError(msg);
            }
          }
        } else {
          if (mounted) setQuota(null);
        }
      } catch (e: any) {
        if (mounted) {
          const msg = e?.response?.data?.message || "Failed to load booking details";
          setError(msg);
          setBannerError(msg);
        }
      }
      if (mounted) {
        setLoading(false);
        try { onReady && onReady(); } catch {}
      }
    };
    load();
    return () => { mounted = false; };
  }, [bookingId, refreshKey, showQuotaSection]);

  useEffect(() => {
    if (!bannerError) return;
    const t = setTimeout(() => setBannerError(null), 3000);
    return () => clearTimeout(t);
  }, [bannerError]);

  const canDownloadInvoice = useMemo(() => viewerRole === "user" && booking?.status === "completed" && !!quota, [viewerRole, booking?.status, quota]);
  const canRate = useMemo(() => viewerRole === "user" && booking?.status === "completed" && booking?.isRated === false, [viewerRole, booking?.status, booking?.isRated]);
  const canRaiseComplaint = useMemo(() => {
    if (!booking || booking.status !== "completed") return false;
    if (viewerRole === "user") return !(booking as any).hasComplaintRaisedByUser;
    if (viewerRole === "pro") return !(booking as any).hasComplaintRaisedByPro;
    return false; 
  }, [viewerRole, booking]);

  const handleDownloadInvoice = () => {
    if (!booking || !quota) return;
    try {
      generateInvoice({ booking, quota });
    } catch (e) {
      alert("Failed to generate invoice");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#032b44]"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{error || "Booking not found"}</h2>
        {onBack && (
          <button onClick={onBack} className="bg-[#032b44] text-white px-6 py-2 rounded-lg hover:bg-[#054869] transition-colors">Back</button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onBack && (
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="px-3 py-2 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10.53 3.47a.75.75 0 010 1.06L4.81 10.25H21a.75.75 0 010 1.5H4.81l5.72 5.72a.75.75 0 11-1.06 1.06l-7-7a.75.75 0 010-1.06l7-7a.75.75 0 011.06 0z" clipRule="evenodd" />
            </svg>
            Back
          </button>
        </div>
      )}

      {bannerError && (
        <div className="p-3 bg-red-100 text-red-800 rounded-md border border-red-200">
          {bannerError}
        </div>
      )}

      {/* People */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="User Details">
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              className="relative group shrink-0"
              aria-label="View user image"
              onClick={() => {
                if (userDisplaySrc !== "/placeholder-user.jpg") {
                  setImagePreview(userDisplaySrc);
                }
              }}
            >
              <Avatar
                key={userImageSrc}
                src={userImageSrc}
                placeholder="/placeholder-user.jpg"
                alt="User"
                className="w-10 h-10 rounded-full object-cover border transition filter group-hover:blur-[1px]"
                onSrcChange={setUserDisplaySrc}
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Eye className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
              </span>
            </button>
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-gray-100">{booking.user?.name || "-"}</div>
              <div className="text-gray-600 dark:text-gray-300">{booking.user?.email || "-"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 py-1 text-sm text-gray-900 dark:text-gray-100">
            <Phone className="w-4 h-4" />
            <span>{ booking.phoneNumber || "-"}</span>
          </div>
        </Section>
        <Section
          title="Professional Details"
          rightSlot={(
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border border-blue-500 text-blue-700 whitespace-nowrap">
              {booking.category?.name || "Service"}
            </span>
          )}
        >
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              className="relative group shrink-0"
              aria-label="View pro image"
              onClick={() => setImagePreview(proDisplaySrc)}
            >
              <Avatar
                key={proImageSrc}
                src={proImageSrc}
                placeholder="/placeholder.jpg"
                alt="Pro"
                className="w-10 h-10 rounded-full object-cover border transition filter group-hover:blur-[1px]"
                onSrcChange={setProDisplaySrc}
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Eye className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
              </span>
            </button>
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-gray-100">{booking.pro ? `${booking.pro.firstName} ${booking.pro.lastName}` : "-"}</div>
              <div className="text-gray-600 dark:text-gray-300">{(booking as any).pro?.email || "-"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 py-1 text-sm text-gray-900 dark:text-gray-100">
            <Phone className="w-4 h-4" />
            <span>{(booking as any).pro?.phoneNumber || "-"}</span>
          </div>
        </Section>
      </div>

      <Section title="Booking Details">
        <LabelValue label="Booking ID" value={booking.bookingId} />
        <LabelValue label="Issue Description" value={booking.issueDescription} />
        <LabelValue label="Service Category" value={booking.category?.name} />
        <LabelValue label="Preferred Date" value={formatDateDDMMYYYY(booking.preferredDate)} />
        <LabelValue
          label="Preferred Time"
          value={booking.preferredTime && booking.preferredTime.length > 0
            ? booking.preferredTime.map(t => `${formatTo12h(t.startTime)} - ${formatTo12h(t.endTime)}`).join(", ")
            : "-"}
        />
        <div className="py-1 flex flex-col sm:flex-row sm:items-center gap-1">
          <span className="w-44 text-sm font-medium text-gray-600 dark:text-gray-300">Booking Status</span>
          <div className="flex items-center"><StatusBadge kind="booking" value={booking.status} /></div>
        </div>
        {booking.status === "rejected" && booking.rejectedReason && (
          <LabelValue label="Rejection Reason" value={booking.rejectedReason} />
        )}
        {booking.status === "cancelled" && booking.cancelReason && (
          <LabelValue label="Cancellation Reason" value={booking.cancelReason} />
        )}
      </Section>

      {showQuotaSection && quota && (
        <Section title="Quota / Payment Details">
          <div className="space-y-1">
            <LabelValue label="Labor Cost" value={`₹${quota.laborCost}`} />
            {!!quota.materialCost && quota.materialCost > 0 && (
              <LabelValue label="Material Cost" value={`₹${quota.materialCost}`} />
            )}
            {!!quota.additionalCharges && quota.additionalCharges > 0 && (
              <LabelValue label="Additional Charges" value={`₹${quota.additionalCharges}`} />
            )}
            <LabelValue label="Total" value={`₹${quota.totalCost}`} />
            <div className="py-1 flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="w-44 text-sm font-medium text-gray-600">Payment Status</span>
              <div className="flex items-center"><StatusBadge kind="payment" value={quota.paymentStatus} /></div>
            </div>
          </div>
        </Section>
      )}

      {viewerRole === "admin" && booking.status === "completed" && (
        <Section title="Revenue">
          <LabelValue label="Admin Revenue" value={typeof (booking as any).adminRevenue === 'number' ? `₹${(booking as any).adminRevenue}` : "-"} />
          <LabelValue label="Pro Revenue" value={typeof (booking as any).proRevenue === 'number' ? `₹${(booking as any).proRevenue}` : "-"} />
        </Section>
      )}

      <Section title="Service Location">
        <LabelValue label="Address" value={booking.location ? `${booking.location.address}, ${booking.location.city}, ${booking.location.state}` : "-"} />
        {booking.location && (
          <div className="mt-3 rounded-md overflow-hidden border dark:border-gray-700">
            <LocationMap location={booking.location} height="200px" />
          </div>
        )}
      </Section>

      <div className="flex flex-col sm:flex-row gap-3">
        {canDownloadInvoice && (
          <button
            onClick={handleDownloadInvoice}
            className="flex-1 bg-[#032b44] dark:bg-[#032b44] text-white dark:!text-white py-2 px-4 rounded-md hover:bg-[#054869] dark:hover:bg-[#054869] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#032b44] dark:focus-visible:ring-offset-gray-900 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Invoice
          </button>
        )}
        {canRate && onRate && booking && (
          <button onClick={() => onRate(booking)} className="flex-1 border border-gray-500 dark:border-gray-400 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Rate Service
          </button>
        )}
        {canRaiseComplaint && onRaiseComplaint && booking && (
          <button onClick={() => onRaiseComplaint(booking)} className="flex-1 border border-rose-600 dark:border-rose-500 text-rose-700 dark:text-rose-300 py-2 px-4 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors">
            Raise Complaint
          </button>
        )}
        {viewerRole === "pro" && booking && booking.status === "pending" && onAccept && onReject && (
          <div className="flex flex-1 gap-3">
            <button
              onClick={() => onAccept(booking)}
              className="flex-1 bg-[#032b44] text-white py-2 px-4 rounded-md hover:bg-[#054869] transition-colors"
            >
              Accept Job
            </button>
            <button
              onClick={() => onReject(booking)}
              className="flex-1 border border-[#032b44] text-[#032b44] py-2 px-4 rounded-md hover:bg-[#054869]/10 transition-colors"
            >
              Reject Job
            </button>
          </div>
        )}
        {viewerRole === "pro" && booking && booking.status === "accepted" && onGenerateQuota && !quota && (
          <button onClick={() => onGenerateQuota(booking)} className="flex-1 bg-[#032b44] text-white py-2 px-4 rounded-md hover:bg-[#054869] transition-colors">Generate Quota</button>
        )}
      </div>

      {imagePreview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-50" onClick={() => setImagePreview(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow" aria-label="Close" onClick={() => setImagePreview(null)}>
              <X className="w-4 h-4 text-gray-800" />
            </button>
            <img src={imagePreview} alt="Preview" className="w-[80vw] max-w-[480px] max-h-[70vh] object-contain rounded-md shadow-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetails;
