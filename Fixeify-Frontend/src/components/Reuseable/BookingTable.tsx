import { BookingResponse } from "../../interfaces/bookingInterface";
import { formatDate } from "../User/BookingHistory"; 
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

interface BookingTableProps {
  bookings: BookingResponse[];
  onViewDetails: (booking: BookingResponse) => void;
  onRate?: (booking: BookingResponse) => void;
  isRated?: (bookingId: string) => boolean;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const BookingTable: React.FC<BookingTableProps> = ({ bookings, onViewDetails, onRate, isRated, totalPages, currentPage, onPageChange }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="md:hidden flex flex-col gap-4">
        {bookings.map((booking, index) => (
          <div key={booking.id} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>S.No:</strong> {index + 1 + (currentPage - 1) * 5}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Issue:</strong> {booking.issueDescription}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Date:</strong> {formatDate(new Date(booking.preferredDate))}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Status:</strong>{" "}
              <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                booking.status === "completed" ? "bg-green-700 text-white dark:bg-green-600 dark:text-green-100" :
                booking.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-100" :
                booking.status === "pending" ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100" :
                booking.status === "accepted" ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100" :
                booking.status === "cancelled" ? "bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-100" :
                "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100"
              }`}>
                {booking.status}
              </span>
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onViewDetails(booking)}
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
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-black dark:text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-3/6">Issue</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Booking Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase dark:text-gray-100 w-2/12">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {bookings.map((booking, index) => (
              <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 border-b">{index + 1 + (currentPage - 1) * 5}</td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">{booking.issueDescription}</td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">{formatDate(new Date(booking.preferredDate))}</td>
                <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 border-b">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                    booking.status === "completed" ? "bg-green-700 text-white dark:bg-green-600 dark:text-green-100" :
                    booking.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-100" :
                    booking.status === "pending" ? "bg-yellow-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100" :
                    booking.status === "accepted" ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100" :
                    booking.status === "cancelled" ? "bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-100" :
                    "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100"
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm border-b">
                  <div className="flex gap-2">
                      {booking.status === "completed" && booking.isRated === false && onRate && isRated && !isRated(booking.id) && (
                        <button
                          onClick={() => onRate && onRate(booking)}
                          className="border border-gray-500 text-gray-600 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 px-4 py-1.5 transition-colors"
                        >
                          Rate
                        </button>
                      )}
                    <button
                      onClick={() => onViewDetails(booking)}
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
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 dark:disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-black dark:text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
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
};

export default BookingTable;