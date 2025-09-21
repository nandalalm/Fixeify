import { FC, useEffect, useMemo, useState } from "react";
import { Star, Eye, X, Phone, User as UserIcon } from "lucide-react";
import { RatingReviewResponse } from "@/api/ratingReviewApi";
import { BookingResponse } from "@/interfaces/bookingInterface";
import { QuotaResponse } from "@/interfaces/quotaInterface";
import { fetchBookingById, fetchQuotaByBookingId } from "@/api/proApi";

export interface ReviewDetailsProps {
  review: RatingReviewResponse;
  onBack: () => void;
}

const LabelValue: React.FC<{ label: React.ReactNode; value?: React.ReactNode }>=({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1">
    <span className="w-44 text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
    <span className="text-sm text-gray-900 dark:text-gray-100 break-all">{value ?? "-"}</span>
  </div>
);

const Section: React.FC<{ title: string; rightSlot?: React.ReactNode; children: React.ReactNode }>=({ title, rightSlot, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-md border dark:border-gray-700 p-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      {rightSlot}
    </div>
    <div className="divide-y divide-gray-100 dark:divide-gray-700">{children}</div>
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
        className={(className || "") + " bg-gray-200 dark:bg-gray-700 border flex items-center justify-center text-gray-500 dark:text-gray-300"}
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

const StatusBadge: React.FC<{ kind: "booking" | "payment"; value: string }>=({ kind, value }) => {
  const v = (value || "").toLowerCase();
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

const ReviewDetails: FC<ReviewDetailsProps> = ({ review, onBack }) => {
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userDisplaySrc, setUserDisplaySrc] = useState<string>("/placeholder-user.jpg");
  const [proDisplaySrc, setProDisplaySrc] = useState<string>("/images/avatar-pro.png");

  const userImageSrc = useMemo(() => {
    const src = review.user?.photo?.trim();
    return src ? src : "/placeholder-user.jpg";
  }, [review.user?.photo]);

  const proImageSrc = useMemo(() => {
    const src = review.pro?.profilePhoto?.trim();
    return src ? src : "/images/avatar-pro.png";
  }, [review.pro?.profilePhoto]);

  const bookingId: string | null = useMemo(() => {
    if (!review?.bookingId) return null;
    if (typeof review.bookingId === "string") return review.bookingId;
    if (
      typeof review.bookingId === "object" &&
      "_id" in review.bookingId &&
      typeof (review.bookingId as any)._id === "string"
    ) {
      return (review.bookingId as any)._id as string;
    }
    return null;
  }, [review]);

  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId) return;
      try {
        setLoading(true);
        const [quotaRes, bookingRes] = await Promise.all([
          fetchQuotaByBookingId(bookingId),
          fetchBookingById(bookingId),
        ]);
        setQuota(quotaRes);
        setBooking(bookingRes);
        setError(null);
      } catch (err) {
        setError("Failed to load booking/quota details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [bookingId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="px-3 py-2 rounded-md border bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10.53 3.47a.75.75 0 010 1.06L4.81 10.25H21a.75.75 0 010 1.5H4.81l5.72 5.72a.75.75 0 11-1.06 1.06l-7-7a.75.75 0 010-1.06l7-7a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
          Back
        </button>
      </div>

      {error && (
        <div className="mb-2 p-3 bg-red-100 text-red-800 rounded-md">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#032b44]"></div>
        </div>
      ) : (
        <div className="space-y-4">
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
                  <div className="font-medium text-gray-900 dark:text-gray-100">{review.user?.name || "-"}</div>
                  <div className="text-gray-600 dark:text-gray-300">{review.user?.email || "-"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 py-1 text-sm text-gray-900 dark:text-gray-100">
                <Phone className="w-4 h-4" />
                <span>{booking?.phoneNumber || "-"}</span>
              </div>
            </Section>
            <Section title="Professional Details" rightSlot={(
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border border-blue-500 text-blue-700 whitespace-nowrap">
                {review.category?.name || "Service"}
              </span>
            )}>
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
                    placeholder="/images/avatar-pro.png"
                    alt="Pro"
                    className="w-10 h-10 rounded-full object-cover border transition filter group-hover:blur-[1px]"
                    onSrcChange={setProDisplaySrc}
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Eye className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                  </span>
                </button>
                <div className="text-sm">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{review.pro ? `${review.pro.firstName} ${review.pro.lastName}` : "-"}</div>
                  <div className="text-gray-600 dark:text-gray-300">{review.pro?.email || "-"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 py-1 text-sm text-gray-900 dark:text-gray-100">
                <Phone className="w-4 h-4" />
                <span>{review.pro?.phoneNumber || "-"}</span>
              </div>
            </Section>
          </div>

          <Section title="Review">
            <div className="py-1">
              <span className="w-44 inline-block text-sm font-medium text-gray-600 dark:text-gray-300 align-middle">Rating</span>
              <span className="align-middle">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className={`inline w-4 h-4 ${idx < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                ))}
              </span>
            </div>
            {review.review && <LabelValue label="Review Text" value={review.review} />}
            <LabelValue label="Created" value={formatDateDDMMYYYY(review.createdAt)} />
          </Section>

          <Section title="Booking Details">
            {booking ? (
              <>
                <LabelValue label="Booking ID" value={booking?.bookingId || bookingId || "-"} />
                <LabelValue label="Issue Description" value={booking.issueDescription} />
                <LabelValue label="Preferred Date" value={formatDateDDMMYYYY(booking.preferredDate)} />
                <LabelValue
                  label="Preferred Time"
                  value={booking.preferredTime && booking.preferredTime.length > 0
                    ? booking.preferredTime.map(t => `${formatTo12h(t.startTime)} - ${formatTo12h(t.endTime)}`).join(", ")
                    : "-"}
                />
                <LabelValue label="Location" value={booking.location ? `${booking.location.address}, ${booking.location.city}, ${booking.location.state}` : "-"} />
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
              </>
            ) : (
              <div className="text-sm text-gray-600">No booking details available.</div>
            )}
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
                {quota.paymentStatus && (
                  <div className="py-1 flex flex-col sm:flex-row sm:items-center gap-1">
                    <span className="w-44 text-sm font-medium text-gray-600">Payment Status</span>
                    <div className="flex items-center"><StatusBadge kind="payment" value={quota.paymentStatus} /></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No quota details available.</div>
            )}
          </Section>

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
      )}
    </div>
  );
};

export default ReviewDetails;
