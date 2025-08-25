import React, { useState, useEffect } from "react";
import { ConfirmationModal } from "../Reuseable/ConfirmationModal";
import { TicketPriority } from "../../interfaces/ticketInterface";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { subject: string; description: string; priority?: TicketPriority }) => Promise<void> | void;
  bookingSummary?: string;
}

const RaiseComplaintModal: React.FC<Props> = ({ open, onClose, onSubmit, bookingSummary }) => {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSubject("");
      setDescription("");
      setPriority("medium");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const executeSubmit = async () => {
    setError(null);
    try {
      setSubmitting(true);
      await onSubmit({ subject: subject.trim(), description: description.trim(), priority });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (subject.trim().length < 5) {
      setError("Subject must be at least 5 characters.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Raise a Complaint</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">✕</button>
        </div>

        {bookingSummary && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            <strong>Booking:</strong> {bookingSummary}
          </div>
        )}

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Briefly describe the issue"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Provide details of the conflict or complaint"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-md bg-[#032B44] dark:bg-[#032B44] text-white dark:!text-white hover:bg-[#054869] dark:hover:bg-[#054869] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#032B44] dark:focus-visible:ring-offset-gray-800 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
          </form>
        </div>
      </div>
      {/* Confirmation before submit */}
      <ConfirmationModal
        isOpen={confirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          executeSubmit();
        }}
        onCancel={() => setConfirmOpen(false)}
        action={null}
        customTitle="Submit Complaint"
        customReason="Do you want to submit this complaint?"
        isProcessing={submitting}
      />
    </>
  );
};

export default RaiseComplaintModal;
