import React, { useEffect, useState } from "react";
import { TicketResponse } from "@/interfaces/ticketInterface";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface TicketTableProps {
  tickets: TicketResponse[];
  loading: boolean;
  onView: (ticket: TicketResponse) => void;
  pagination: Pagination;
  showRaisedBy?: boolean; // default true (admin). For user/pro set false
  showTypeBadges?: boolean; // default true (admin). For user/pro set false
}

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-300">
    {message}
  </div>
);

// simplified loading rows rendered inline below

const Badge: React.FC<{ color: string; text: string }> = ({ color, text }) => (
  <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${color}`}>{text}</span>
);

export const TicketTable: React.FC<TicketTableProps> = ({ tickets, loading, onView, pagination, showRaisedBy = true, showTypeBadges = false }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const statusBadge = (status: TicketResponse["status"]) => {
    switch (status) {
      case "pending": return <Badge color="bg-yellow-100 text-yellow-800" text="Pending"/>;
      case "under_review": return <Badge color="bg-blue-100 text-blue-800" text="Under Review"/>;
      case "resolved": return <Badge color="bg-green-100 text-green-800" text="Resolved"/>;
      default: return null;
    }
  };

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  if (isMobile) {
    return (
      <div className="md:hidden flex flex-col gap-4">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow border border-gray-200 dark:border-gray-700 animate-pulse h-20" />
        ))}
        {!loading && tickets.length === 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow border border-gray-200 dark:border-gray-700">
            <EmptyState message="No tickets found" />
          </div>
        )}
        {!loading && tickets.map((t, index) => (
          <div key={t._id} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>S.No:</strong> {index + 1 + (pagination.page - 1) * pagination.limit}</p>
            {showRaisedBy && (
              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Raised By:</strong> {(t.complainantName && t.complainantName.trim()) || t.complainantId}{showTypeBadges ? ` (${t.complainantType})` : ""}</p>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Against:</strong> {(t.againstName && t.againstName.trim()) || t.againstId}{showTypeBadges ? ` (${t.againstType})` : ""}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Complaint:</strong> <span className="font-medium">{t.subject}</span>: {t.description}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Status:</strong> {statusBadge(t.status)}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onView(t)}
                className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
              >
                View
              </button>
            </div>
          </div>
        ))}
        {totalPages >= 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <nav className="flex items-center space-x-2" aria-label="Pagination">
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-black dark:text-white">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hidden md:block overflow-x-auto">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-1/12">S.No</th>
              {showRaisedBy && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Raised By</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Raised Against</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-4/12">Complaint</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-1/12">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={`sk-${i}`} className="animate-pulse">
                <td className="px-4 py-3" colSpan={showRaisedBy ? 6 : 5}>
                  <div className="h-6 bg-gray-200 rounded w-full"/>
                </td>
              </tr>
            ))}
            {!loading && tickets.length === 0 && (
              <tr>
                <td colSpan={showRaisedBy ? 6 : 5} className="px-4 py-6">
                  <EmptyState message="No tickets found" />
                </td>
              </tr>
            )}
            {!loading && tickets.map((t, index) => (
              <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 border-b">{index + 1 + (pagination.page - 1) * pagination.limit}</td>
                {showRaisedBy && (
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">
                    <div className="flex flex-col">
                      <span className="font-medium">{(t.complainantName && t.complainantName.trim()) || t.complainantId}</span>
                      {showTypeBadges && (
                        <span className="text-xs text-gray-500">{t.complainantType.toUpperCase()}</span>
                      )}
                    </div>
                  </td>
                )}
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">
                  <div className="flex flex-col">
                    <span className="font-medium">{(t.againstName && t.againstName.trim()) || t.againstId}</span>
                    {showTypeBadges && (
                      <span className="text-xs text-gray-500">{t.againstType.toUpperCase()}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">
                  <div className="max-w-[420px] truncate"><span className="font-medium">{t.subject}</span>: {t.description}</div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">{statusBadge(t.status)}</td>
                <td className="py-3 px-4 text-sm border-b">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onView(t)}
                      className="bg-[#032B44] rounded-md text-sm text-white font-medium hover:bg-[#054869] px-4 py-1.5 transition-colors dark:bg-gray-300 dark:text-gray-800 dark:hover:bg-gray-500 dark:hover:!text-white"
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages >= 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-center border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <nav className="flex items-center space-x-2" aria-label="Pagination">
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-black dark:text-white">
                Page {pagination.page} of {totalPages}
              </span>
              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
;

export default TicketTable;
