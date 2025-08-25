import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { submitReview, resetError } from "../../store/ratingReviewSlice";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  proId: string;
  categoryId: string;
  bookingId?: string;
  quotaId?: string;
  onSuccess?: () => void;
}

const starClasses = (active: boolean) =>
  `h-8 w-8 cursor-pointer ${active ? "text-yellow-400" : "text-gray-300"}`;

const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onClose, userId, proId, categoryId, bookingId, quotaId, onSuccess }) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.ratingReview);

  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [review, setReview] = useState<string>("");
  const [localMsg, setLocalMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHover(0);
      setReview("");
      setLocalMsg(null);
      dispatch(resetError());
    }
  }, [isOpen]);

  // Handle global error display
  useEffect(() => {
    if (error) {
      setLocalMsg({ type: "error", text: error });
      setTimeout(() => {
        setLocalMsg(null);
        dispatch(resetError());
      }, 2000);
    }
  }, [error]);

  if (!isOpen) return null;

  const validate = (): string | null => {
    if (rating === 0) return "Please select a rating.";
    if (review) {
      const words = review.trim().split(/\s+/);
      if (words.length > 1000) return "Review must be less than 1000 words.";
      if (review.trim().length < 5) return "Review must be at least 5 characters.";
    }
    return null;
  };

  const executeSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setLocalMsg({ type: "error", text: validationError });
      setTimeout(() => setLocalMsg(null), 2000);
      return;
    }

    const result = await dispatch(
      submitReview({ userId, proId, categoryId, bookingId, quotaId, rating, review: review.trim() || undefined })
    );

    if (submitReview.fulfilled.match(result)) {
      setLocalMsg({ type: "success", text: "Review submitted successfully." });
      setTimeout(() => {
        setLocalMsg(null);
        onClose();
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      }, 1000);
    }
  };

  const handleOpenConfirm = () => {
    const validationError = validate();
    if (validationError) {
      setLocalMsg({ type: "error", text: validationError });
      setTimeout(() => setLocalMsg(null), 2000);
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button className="absolute top-2 right-2" onClick={onClose}>
          <X className="h-6 w-6 text-gray-500" />
        </button>

        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Rate & Review</h3>

        {/* Inline message */}
        {localMsg && (
          <div
            className={`mb-4 px-4 py-2 rounded text-sm ${
              localMsg.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {localMsg.text}
          </div>
        )}

        {/* Stars */}
        <div className="flex mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={starClasses(star <= (hover || rating))}
            >
              <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.788 1.402 8.182L12 18.896l-7.336 3.857 1.402-8.182L.132 9.21l8.2-1.192z" />
            </svg>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Write your review (optional)"
          className="w-full h-32 p-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
        />

        <button
          onClick={handleOpenConfirm}
          disabled={loading}
          className="w-full bg-[#032B44] dark:bg-[#032B44] text-white dark:!text-white py-2 rounded hover:bg-[#054869] dark:hover:bg-[#054869] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#032B44] dark:focus-visible:ring-offset-gray-800 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>

      {/* Confirmation modal on submit */}
      <ConfirmationModal
        isOpen={confirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          executeSubmit();
        }}
        onCancel={() => setConfirmOpen(false)}
        action="rating"
      />
    </div>
  );
};

export default RatingModal;
